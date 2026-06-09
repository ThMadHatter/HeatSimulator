import { Component } from '../store/useStore';
import { Point, HeatmapResult, JunctionData, Zone, Stackup } from './types';
import { isPointInPolygon, estimateBaseConductivity } from './utils';

export function solveSteadyState(
    components: Component[],
    zones: Zone[],
    widthMm: number,
    heightMm: number,
    boundary: Point[],
    ambientTemp: number,
    resolution: number = 150,
    stackup?: Stackup
): HeatmapResult {
    // 0. Input Validation
    if (widthMm <= 0 || heightMm <= 0) throw new Error("Invalid board dimensions");
    if (resolution <= 0) throw new Error("Invalid resolution");
    if (ambientTemp < -273.15) throw new Error("Ambient temperature below absolute zero");

    for (const comp of components) {
        if (comp.width <= 0 || comp.height <= 0) {
            throw new Error(`Component ${comp.name} has invalid dimensions`);
        }
        if (comp.power < 0) {
            throw new Error(`Component ${comp.name} has negative power`);
        }
    }

    // 0. Ensure Isotropic Grid (dx == dy)
    const dx = Math.max(widthMm, heightMm) / resolution;
    const nx = Math.ceil(widthMm / dx);
    const ny = Math.ceil(heightMm / dx);
    const size = nx * ny;

    let T = new Float32Array(size).fill(ambientTemp);
    const Q = new Float32Array(size).fill(0);
    const isInside = new Uint8Array(size).fill(1);
    const kGrid = new Float32Array(size);

    // Physical Constants
    const baseK = stackup ? estimateBaseConductivity(stackup) : 25.0;
    kGrid.fill(baseK);

    const h = 15.0; // W/m²K
    const dxM = dx / 1000; // dx in meters
    const thicknessM = (stackup?.boardThicknessMm || 1.6) / 1000;

    // 1. Build kGrid from zones
    for (const zone of zones) {
        if (!zone.enabled || zone.points.length < 3) continue;

        // Find bounding box of zone to optimize
        const minX = Math.min(...zone.points.map(p => p.x));
        const maxX = Math.max(...zone.points.map(p => p.x));
        const minY = Math.min(...zone.points.map(p => p.y));
        const maxY = Math.max(...zone.points.map(p => p.y));

        const startX = Math.max(0, Math.floor(minX / dx));
        const endX = Math.min(nx - 1, Math.floor(maxX / dx));
        const startY = Math.max(0, Math.floor(minY / dx));
        const endY = Math.min(ny - 1, Math.floor(maxY / dx));

        for (let j = startY; j <= endY; j++) {
            for (let i = startX; i <= endX; i++) {
                const x = i * dx;
                const y = j * dx;
                if (isPointInPolygon({ x, y }, zone.points)) {
                    kGrid[j * nx + i] = zone.conductivity;
                }
            }
        }
    }

    // 2. Initialize Heat Sources
    for (const comp of components) {
        const area = comp.width * comp.height || 1;
        const powerPerM2 = comp.power / (area / 1000000);

        const startX = Math.max(0, Math.floor((comp.x - comp.width / 2) / dx));
        const endX = Math.min(nx - 1, Math.floor((comp.x + comp.width / 2) / dx));
        const startY = Math.max(0, Math.floor((comp.y - comp.height / 2) / dx));
        const endY = Math.min(ny - 1, Math.floor((comp.y + comp.height / 2) / dx));

        for (let j = startY; j <= endY; j++) {
            for (let i = startX; i <= endX; i++) {
                Q[j * nx + i] += powerPerM2;
            }
        }
    }

    // 3. Pre-calculate PCB mask
    if (boundary && boundary.length >= 3) {
        for (let j = 0; j < ny; j++) {
            for (let i = 0; i < nx; i++) {
                const x = i * dx;
                const y = j * dx;
                if (!isPointInPolygon({ x, y }, boundary)) {
                    isInside[j * nx + i] = 0;
                }
            }
        }
    }

    // 4. Variable-k Gauss-Seidel Solver
    const maxIterations = 1000;
    const tolerance = 0.001;
    let iterations = 0;

    const invDx2 = 1 / (dxM * dxM);
    const beta = 2 * h; // Convection on both sides

    const harmonicMean = (a: number, b: number) => {
        if (a <= 0 || b <= 0) return 0;
        return (2 * a * b) / (a + b);
    };

    for (let iter = 0; iter < maxIterations; iter++) {
        iterations = iter + 1;
        let maxDiff = 0;

        for (let j = 0; j < ny; j++) {
            for (let i = 0; i < nx; i++) {
                const idx = j * nx + i;

                if (isInside[idx] === 0) {
                    T[idx] = ambientTemp;
                    continue;
                }

                const k = kGrid[idx];

                // Harmonic means for interface conductivity
                const kW = i > 0      ? harmonicMean(k, kGrid[idx - 1])  : k;
                const kE = i < nx - 1 ? harmonicMean(k, kGrid[idx + 1])  : k;
                const kN = j > 0      ? harmonicMean(k, kGrid[idx - nx]) : k;
                const kS = j < ny - 1 ? harmonicMean(k, kGrid[idx + nx]) : k;

                const tW = i > 0      ? T[idx - 1]  : ambientTemp;
                const tE = i < nx - 1 ? T[idx + 1]  : ambientTemp;
                const tN = j > 0      ? T[idx - nx] : ambientTemp;
                const tS = j < ny - 1 ? T[idx + nx] : ambientTemp;

                // Energy balance:
                // Sum( k_face * (T_neighbor - T) / dx * thickness * dx ) + Q * dx^2 * thickness - 2 * h * (T - T_amb) * dx^2 = 0
                // Sum( k_face * (T_neighbor - T) * thickness ) + Q * dx^2 * thickness - 2 * h * (T - T_amb) * dx^2 = 0
                // (kE*tE + kW*tW + kN*tN + kS*tS) * thickness + Q*dx^2*thickness + 2*h*T_amb*dx^2 = T * [(kE+kW+kN+kS)*thickness + 2*h*dx^2]

                const termConduction = (kE * tE + kW * tW + kN * tN + kS * tS) * thicknessM;
                const termGeneration = Q[idx] * dxM * dxM * thicknessM;
                const termConvection = beta * ambientTemp * dxM * dxM;
                const denom = (kE + kW + kN + kS) * thicknessM + beta * dxM * dxM;

                const newT = (termConduction + termGeneration + termConvection) / denom;

                const diff = Math.abs(newT - T[idx]);
                if (diff > maxDiff) maxDiff = diff;

                T[idx] = newT;
            }
        }

        if (maxDiff < tolerance) break;
    }

    // 5. Compute Engineering Metrics
    const junctions: JunctionData[] = components.map(comp => {
        const startX = Math.max(0, Math.floor((comp.x - comp.width / 2) / dx));
        const endX = Math.min(nx - 1, Math.floor((comp.x + comp.width / 2) / dx));
        const startY = Math.max(0, Math.floor((comp.y - comp.height / 2) / dx));
        const endY = Math.min(ny - 1, Math.floor((comp.y + comp.height / 2) / dx));

        let sumT = 0;
        let count = 0;
        for (let j = startY; j <= endY; j++) {
            for (let i = startX; i <= endX; i++) {
                sumT += T[j * nx + i];
                count++;
            }
        }
        const tPcb = count > 0 ? sumT / count : ambientTemp;
        const rThetaPcb = comp.power > 0 ? (tPcb - ambientTemp) / comp.power : 0;

        let tj: number | null = null;
        let warning: string | undefined;

        if (comp.thetaJC !== undefined && comp.thetaJC !== null) {
            tj = tPcb + comp.power * comp.thetaJC;
        } else if (comp.thetaJA !== undefined && comp.thetaJA !== null) {
            tj = ambientTemp + comp.power * comp.thetaJA;
        } else {
            warning = "Missing ThetaJC/ThetaJA";
        }

        let margin: number | null = null;
        let ratingPercent: number | null = null;
        let isOverLimit = false;

        if (tj !== null && comp.maxTemperature) {
            margin = comp.maxTemperature - tj;
            ratingPercent = (tj / comp.maxTemperature) * 100;
            isOverLimit = tj > comp.maxTemperature;
        }

        return {
            compId: comp.id,
            tj,
            tPcb,
            rThetaPcb,
            margin,
            ratingPercent,
            isOverLimit,
            warning
        };
    });

    let maxBoardT = ambientTemp;
    for (let i = 0; i < size; i++) {
        if (T[i] > maxBoardT) maxBoardT = T[i];
    }

    const junctionMax = junctions.reduce((max, j) => Math.max(max, j.tj || 0), ambientTemp);

    return {
        data: T,
        kGrid,
        width: nx,
        height: ny,
        minTemp: ambientTemp,
        maxTemp: Math.max(maxBoardT, junctionMax),
        junctions,
        iterations
    };
}

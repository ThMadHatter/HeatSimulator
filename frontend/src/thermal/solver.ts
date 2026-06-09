import { Component } from '../store/useStore';
import { Point, HeatmapResult, JunctionData, Zone } from './types';
import { isPointInPolygon } from './utils';

export function solveSteadyState(
    components: Component[],
    zones: Zone[],
    widthMm: number,
    heightMm: number,
    boundary: Point[],
    ambientTemp: number,
    resolution: number = 150
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

    // Physical Constants (Realistic PCB values)
    const k = 25.0; // W/mK
    const h = 15.0; // W/m²K
    const dxM = dx / 1000; // dx in meters

    // 2. Initialize Heat Sources & Component Copper Spreading
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

    // 2. Pre-calculate PCB mask
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

    // 4. Gauss-Seidel Solver
    const maxIterations = 1000;
    const tolerance = 0.001;
    let iterations = 0;

    const thicknessM = 0.0016; // Standard PCB thickness 1.6mm
    const invDx2 = 1 / (dxM * dxM);
    const alpha = k * thicknessM * invDx2;
    const beta = 2 * h; // Convection on both sides (top and bottom)
    const denom = 4 * alpha + beta;

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

                const t_left  = i > 0      ? T[idx - 1]  : ambientTemp;
                const t_right = i < nx - 1 ? T[idx + 1]  : ambientTemp;
                const t_up    = j > 0      ? T[idx - nx] : ambientTemp;
                const t_down  = j < ny - 1 ? T[idx + nx] : ambientTemp;

                // Energy balance for cell:
                // conduction_in + heat_generation - convection_out = 0
                // (k*t/dx^2) * (sum(T_neighbors) - 4*T) + Q_density - 2*h*(T - T_amb) = 0
                // T * (4*alpha + beta) = alpha * sum(T_neighbors) + Q_density + beta * T_amb
                const newT = (alpha * (t_left + t_right + t_up + t_down) + Q[idx] + beta * ambientTemp) / denom;

                const diff = Math.abs(newT - T[idx]);
                if (diff > maxDiff) maxDiff = diff;

                T[idx] = newT;
            }
        }

        if (maxDiff < tolerance) break;
    }

    // 4. Compute Engineering Metrics
    const junctions: JunctionData[] = components.map(comp => {
        // Find grid cells inside component footprint
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
        width: nx,
        height: ny,
        minTemp: ambientTemp,
        maxTemp: Math.max(maxBoardT, junctionMax),
        junctions,
        iterations
    };
}

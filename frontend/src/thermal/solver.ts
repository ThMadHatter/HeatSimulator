import { Component } from '../store/useStore';
import { Point, HeatmapResult, JunctionData } from './types';
import { isPointInPolygon } from './utils';

export function solveSteadyState(
    components: Component[],
    widthMm: number,
    heightMm: number,
    boundary: Point[],
    ambientTemp: number,
    resolution: number = 150
): HeatmapResult {
    const size = resolution * resolution;
    let T = new Float32Array(size).fill(ambientTemp);
    let T_old = new Float32Array(size);
    const Q = new Float32Array(size).fill(0);
    const isInside = new Uint8Array(size).fill(1);

    const dx = widthMm / resolution;
    const dy = heightMm / resolution;

    // Physical Constants (Realistic PCB values)
    // k = thermal conductivity (W/mK). FR4 ~ 0.3, Copper ~ 400.
    // High-copper PCB effective k can be 20-50 W/mK.
    const k = 25.0;
    // h = convection coeff (W/m²K). Natural convection is 5-25.
    const h = 15.0;
    const dxM = dx / 1000;

    // 1. Initialize heat sources (Q)
    for (const comp of components) {
        const area = comp.width * comp.height || 1;
        // powerDensity (W/m²)
        const powerPerM2 = comp.power / (area / 1000000);

        const startX = Math.max(0, Math.floor(((comp.x - comp.width / 2) / widthMm) * resolution));
        const endX = Math.min(resolution - 1, Math.floor(((comp.x + comp.width / 2) / widthMm) * resolution));
        const startY = Math.max(0, Math.floor(((comp.y - comp.height / 2) / heightMm) * resolution));
        const endY = Math.min(resolution - 1, Math.floor(((comp.y + comp.height / 2) / heightMm) * resolution));

        for (let j = startY; j <= endY; j++) {
            for (let i = startX; i <= endX; i++) {
                Q[j * resolution + i] += powerPerM2;
            }
        }
    }

    // 2. Pre-calculate PCB mask
    if (boundary.length >= 3) {
        for (let j = 0; j < resolution; j++) {
            for (let i = 0; i < resolution; i++) {
                const x = i * dx;
                const y = j * dy;
                if (!isPointInPolygon({ x, y }, boundary)) {
                    isInside[j * resolution + i] = 0;
                }
            }
        }
    }

    // 3. Gauss-Seidel Solver
    const maxIterations = 1000;
    const tolerance = 0.001;

    // Equation: k*thickness*(d2T/dx2 + d2T/dy2) + Q_surf - h*(T - Tamb) = 0
    const thicknessM = 0.0016;
    const alpha = (k * thicknessM) / (dxM * dxM);
    const beta = h;
    const denom = 4 * alpha + beta;

    for (let iter = 0; iter < maxIterations; iter++) {
        let maxDiff = 0;
        T_old.set(T);

        for (let j = 1; j < resolution - 1; j++) {
            for (let i = 1; i < resolution - 1; i++) {
                const idx = j * resolution + i;

                if (isInside[idx] === 0) {
                    T[idx] = ambientTemp;
                    continue;
                }

                const t_left = T[idx - 1];
                const t_right = T[idx + 1];
                const t_up = T[idx - resolution];
                const t_down = T[idx + resolution];

                const newT = (alpha * (t_left + t_right + t_up + t_down) + Q[idx] + beta * ambientTemp) / denom;

                T[idx] = newT;

                const diff = Math.abs(T[idx] - T_old[idx]);
                if (diff > maxDiff) maxDiff = diff;
            }
        }

        if (maxDiff < tolerance) break;
    }

    // 4. Compute Junctions
    const junctions: JunctionData[] = components.map(comp => {
        const tj = ambientTemp + (comp.power * (comp.thetaJA || 0));
        const maxT = comp.maxTemperature || 125;
        return {
            compId: comp.id,
            tj,
            margin: maxT - tj,
            ratingPercent: (tj / maxT) * 100,
            isOverLimit: tj > maxT
        };
    });

    let maxBoardT = ambientTemp;
    for (let i = 0; i < size; i++) {
        if (T[i] > maxBoardT) maxBoardT = T[i];
    }

    const junctionMax = junctions.reduce((max, j) => Math.max(max, j.tj), ambientTemp);

    return {
        data: T,
        width: resolution,
        height: resolution,
        minTemp: ambientTemp,
        maxTemp: Math.max(maxBoardT, junctionMax),
        junctions
    };
}

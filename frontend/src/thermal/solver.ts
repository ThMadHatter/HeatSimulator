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
    // 0. Ensure Isotropic Grid (dx == dy)
    const dx = Math.max(widthMm, heightMm) / resolution;
    const nx = Math.ceil(widthMm / dx);
    const ny = Math.ceil(heightMm / dx);
    const size = nx * ny;

    let T = new Float32Array(size).fill(ambientTemp);
    let T_old = new Float32Array(size);
    const Q = new Float32Array(size).fill(0);
    const kGrid = new Float32Array(size).fill(4.0); // Default PCB conductivity: 4 W/mK
    const isInside = new Uint8Array(size).fill(1);

    const h = 15.0; // Convection: W/m²K
    const dxM = dx / 1000; // dx in meters
    const thicknessM = 0.0016; // PCB thickness: 1.6mm

    // 1. Initialize Conductivity Map (zones)
    for (const zone of zones) {
        for (let j = 0; j < ny; j++) {
            for (let i = 0; i < nx; i++) {
                const x = i * dx;
                const y = j * dx;
                if (isPointInPolygon({ x, y }, zone.points)) {
                    kGrid[j * nx + i] = zone.conductivity;
                }
            }
        }
    }

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
                const idx = j * nx + i;
                Q[idx] += powerPerM2;
                // Simulate copper spreading under component: increase k
                kGrid[idx] = Math.max(kGrid[idx], 25.0);
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

    // 4. Gauss-Seidel Solver with Variable Conductivity
    const maxIterations = 1000;
    const tolerance = 0.001;
    const invDx2 = 1.0 / (dxM * dxM);

    for (let iter = 0; iter < maxIterations; iter++) {
        let maxDiff = 0;
        T_old.set(T);

        for (let j = 1; j < ny - 1; j++) {
            for (let i = 1; i < nx - 1; i++) {
                const idx = j * nx + i;

                if (isInside[idx] === 0) {
                    T[idx] = ambientTemp;
                    continue;
                }

                const k_c = kGrid[idx];
                const k_w = (k_c + kGrid[idx - 1]) / 2;
                const k_e = (k_c + kGrid[idx + 1]) / 2;
                const k_n = (k_c + kGrid[idx - nx]) / 2;
                const k_s = (k_c + kGrid[idx + nx]) / 2;

                const t_w = T[idx - 1];
                const t_e = T[idx + 1];
                const t_n = T[idx - nx];
                const t_s = T[idx + nx];

                // Steady state: Sum(k_face * (T_neighbor - T_center) / dx) * thickness * dx + Q*thickness*dx^2 - 2*h*dx^2*(T_center - Tamb) = 0
                // (k_w*(t_w - T) + k_e*(t_e - T) + k_n*(t_n - T) + k_s*(t_s - T)) * thickness / dx^2 + Q - 2*h*(T - Tamb)/thickness = 0
                // Let alpha = thickness / dx^2, beta = 2*h / thickness
                // (k_w*t_w + k_e*t_e + k_n*t_n + k_s*t_s) * alpha + Q + beta * Tamb = T * (alpha * (k_w + k_e + k_n + k_s) + beta)

                const alpha = thicknessM * invDx2;
                const beta = 2 * h; // simplified convection for both sides

                const denom = alpha * (k_w + k_e + k_n + k_s) + beta;
                const newT = (alpha * (k_w * t_w + k_e * t_e + k_n * t_n + k_s * t_s) + Q[idx] + beta * ambientTemp) / denom;

                T[idx] = newT;

                const diff = Math.abs(T[idx] - T_old[idx]);
                if (diff > maxDiff) maxDiff = diff;
            }
        }

        if (maxDiff < tolerance) break;
    }

    // 5. Compute Junctions & RthetaPCB
    const junctions: JunctionData[] = components.map(comp => {
        // Find all cells inside footprint
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

        const tpcb = count > 0 ? sumT / count : ambientTemp;
        const rthPcb = comp.power > 0 ? (tpcb - ambientTemp) / comp.power : 0;

        let tj = tpcb;
        if (comp.thetaJC !== undefined && comp.thetaJC > 0) {
            tj = tpcb + comp.power * comp.thetaJC;
        } else if (comp.thetaJA !== undefined && comp.thetaJA > 0) {
            tj = ambientTemp + comp.power * comp.thetaJA;
        }

        const maxT = comp.maxTemperature || 125;
        return {
            compId: comp.id,
            tj,
            tpcb,
            rthPcb,
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
        width: nx,
        height: ny,
        minTemp: ambientTemp,
        maxTemp: Math.max(maxBoardT, junctionMax),
        junctions
    };
}

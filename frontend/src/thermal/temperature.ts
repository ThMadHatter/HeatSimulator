import { Component } from '../store/useStore';
import { Point, HeatmapResult, JunctionData } from './types';

export function isPointInPolygon(point: Point, polygon: Point[]): boolean {
    if (polygon.length < 3) return true; // Assume no boundary if not enough points

    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].x, yi = polygon[i].y;
        const xj = polygon[j].x, yj = polygon[j].y;

        const intersect = ((yi > point.y) !== (yj > point.y))
            && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }

    return inside;
}

export function computeThermalField(
    components: Component[],
    widthMm: number,
    heightMm: number,
    boundary: Point[],
    ambientTemp: number,
    resolution: number = 150
): HeatmapResult {
    const data = new Float32Array(resolution * resolution);
    const stepX = widthMm / resolution;
    const stepY = heightMm / resolution;

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

    let maxT = ambientTemp;

    for (let j = 0; j < resolution; j++) {
        for (let i = 0; i < resolution; i++) {
            const x = i * stepX;
            const y = j * stepY;

            if (boundary.length >= 3 && !isPointInPolygon({x, y}, boundary)) {
                data[j * resolution + i] = ambientTemp;
                continue;
            }

            let deltaT_board = 0;
            for (const comp of components) {
                // Footprint consideration: if point is inside component, distance is 0
                // Simple version: distance to center but clamped by footprint
                const dx = Math.abs(x - comp.x);
                const dy = Math.abs(y - comp.y);

                const effectiveDx = Math.max(0, dx - comp.width / 2);
                const effectiveDy = Math.max(0, dy - comp.height / 2);
                const r2 = effectiveDx * effectiveDx + effectiveDy * effectiveDy;

                const sigma2 = comp.spread * comp.spread;

                // P_density = P / area
                const area = comp.width * comp.height || 1;
                deltaT_board += (comp.power / (area * 0.1)) * Math.exp(-r2 / (2 * sigma2));
            }

            const totalT = ambientTemp + deltaT_board;
            data[j * resolution + i] = totalT;
            if (totalT > maxT) maxT = totalT;
        }
    }

    // Engineering scale maxT: max of board and junctions
    const junctionMax = junctions.reduce((max, j) => Math.max(max, j.tj), ambientTemp);
    const finalMaxT = Math.max(maxT, junctionMax);

    return {
        data,
        width: resolution,
        height: resolution,
        minTemp: ambientTemp,
        maxTemp: finalMaxT,
        junctions
    };
}

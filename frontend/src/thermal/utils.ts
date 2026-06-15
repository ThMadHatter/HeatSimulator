import { Point, Stackup } from './types';

export function isPointInPolygon(point: Point, polygon: Point[]): boolean {
    if (polygon.length < 3) return false;

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

export function estimateBaseConductivity(stackup: Stackup): number {
    const fr4K = 0.35; // W/mK
    const copperK = 385; // W/mK
    const ozToMm = 0.035;

    const copperThicknessTotal = stackup.layerCount * stackup.copperOzPerLayer * ozToMm;
    const copperFraction = Math.max(0, Math.min(1, (copperThicknessTotal / stackup.boardThicknessMm) * (stackup.estimatedCopperCoveragePercent / 100)));

    const kEff = copperFraction * copperK + (1 - copperFraction) * fr4K;

    // Clamp kEff to a reasonable range: 0.3 to 50 W/mK
    return Math.max(0.3, Math.min(50, kEff));
}

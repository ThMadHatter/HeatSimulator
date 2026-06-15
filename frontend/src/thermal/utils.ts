import { Point, Stackup, BoardStackup, StackupLayer } from './types';

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

export function calculateStackupKXY(stackup: BoardStackup): number {
    let totalThicknessUm = 0;
    for (const layer of stackup.layers) {
        totalThicknessUm += layer.thicknessUm;
    }

    if (totalThicknessUm <= 0) return 0.35;

    let weightedKSum = 0;
    for (const layer of stackup.layers) {
        const thicknessFraction = layer.thicknessUm / totalThicknessUm;
        let layerEffectiveK = layer.conductivityWmK;
        if (layer.type === 'copper' && layer.copperCoveragePercent !== undefined) {
            layerEffectiveK = (layer.conductivityWmK * layer.copperCoveragePercent) / 100;
        }
        weightedKSum += layerEffectiveK * thicknessFraction;
    }

    return Math.max(0.1, Math.min(500, weightedKSum));
}

export function calculateStackupKZ(stackup: BoardStackup): number {
    let totalThicknessUm = 0;
    let totalRz = 0;

    for (const layer of stackup.layers) {
        totalThicknessUm += layer.thicknessUm;
        const thicknessM = layer.thicknessUm * 1e-6;
        let layerEffectiveK = layer.conductivityWmK;

        // Conservatively account for copper coverage in KZ
        if (layer.type === 'copper' && layer.copperCoveragePercent !== undefined) {
            const coverage = Math.max(0.01, layer.copperCoveragePercent / 100);
            layerEffectiveK = layer.conductivityWmK * coverage;
        }

        if (layerEffectiveK > 0) {
            totalRz += thicknessM / layerEffectiveK;
        }
    }

    if (totalThicknessUm <= 0 || totalRz <= 0) return 0.1;

    const totalThicknessM = totalThicknessUm * 1e-6;
    return Math.max(0.1, Math.min(500, totalThicknessM / totalRz));
}

export function estimateBaseConductivity(stackup: Stackup, detailedStackup?: BoardStackup): number {
    if (stackup.baseConductivityMode === 'stackup' && detailedStackup) {
        return calculateStackupKXY(detailedStackup);
    }

    const fr4K = 0.35; // W/mK
    const copperK = 385; // W/mK
    const ozToMm = 0.035;

    const copperThicknessTotal = stackup.layerCount * stackup.copperOzPerLayer * ozToMm;
    const copperFraction = Math.max(0, Math.min(1, (copperThicknessTotal / stackup.boardThicknessMm) * (stackup.estimatedCopperCoveragePercent / 100)));

    const kEff = copperFraction * copperK + (1 - copperFraction) * fr4K;

    // Clamp kEff to a reasonable range: 0.3 to 50 W/mK
    return Math.max(0.3, Math.min(50, kEff));
}

export const STACKUP_PRESETS: Record<string, BoardStackup> = {
    "2-layer": {
        layers: [
            { id: 'top-cu', name: 'Top Copper', type: 'copper', thicknessUm: 35, conductivityWmK: 385, copperCoveragePercent: 50 },
            { id: 'core', name: 'FR4 Core', type: 'core', thicknessUm: 1530, conductivityWmK: 0.35 },
            { id: 'bot-cu', name: 'Bottom Copper', type: 'copper', thicknessUm: 35, conductivityWmK: 385, copperCoveragePercent: 50 },
        ]
    },
    "4-layer": {
        layers: [
            { id: 'top-cu', name: 'Top Copper', type: 'copper', thicknessUm: 35, conductivityWmK: 385, copperCoveragePercent: 40 },
            { id: 'pp-1', name: 'Prepreg', type: 'prepreg', thicknessUm: 200, conductivityWmK: 0.35 },
            { id: 'in-1', name: 'Inner 1 (GND)', type: 'copper', thicknessUm: 18, conductivityWmK: 385, copperCoveragePercent: 90 },
            { id: 'core', name: 'FR4 Core', type: 'core', thicknessUm: 1000, conductivityWmK: 0.35 },
            { id: 'in-2', name: 'Inner 2 (PWR)', type: 'copper', thicknessUm: 18, conductivityWmK: 385, copperCoveragePercent: 70 },
            { id: 'pp-2', name: 'Prepreg', type: 'prepreg', thicknessUm: 200, conductivityWmK: 0.35 },
            { id: 'bot-cu', name: 'Bottom Copper', type: 'copper', thicknessUm: 35, conductivityWmK: 385, copperCoveragePercent: 40 },
        ]
    },
    "6-layer": {
        layers: [
            { id: 'top-cu', name: 'Top Copper', type: 'copper', thicknessUm: 35, conductivityWmK: 385, copperCoveragePercent: 30 },
            { id: 'pp-1', name: 'Prepreg', type: 'prepreg', thicknessUm: 150, conductivityWmK: 0.35 },
            { id: 'in-1', name: 'Inner 1 (GND)', type: 'copper', thicknessUm: 18, conductivityWmK: 385, copperCoveragePercent: 95 },
            { id: 'pp-2', name: 'Prepreg', type: 'prepreg', thicknessUm: 200, conductivityWmK: 0.35 },
            { id: 'in-2', name: 'Inner 2 (SIG)', type: 'copper', thicknessUm: 18, conductivityWmK: 385, copperCoveragePercent: 40 },
            { id: 'core', name: 'FR4 Core', type: 'core', thicknessUm: 600, conductivityWmK: 0.35 },
            { id: 'in-3', name: 'Inner 3 (SIG)', type: 'copper', thicknessUm: 18, conductivityWmK: 385, copperCoveragePercent: 40 },
            { id: 'pp-3', name: 'Prepreg', type: 'prepreg', thicknessUm: 200, conductivityWmK: 0.35 },
            { id: 'in-4', name: 'Inner 4 (PWR)', type: 'copper', thicknessUm: 18, conductivityWmK: 385, copperCoveragePercent: 80 },
            { id: 'pp-4', name: 'Prepreg', type: 'prepreg', thicknessUm: 150, conductivityWmK: 0.35 },
            { id: 'bot-cu', name: 'Bottom Copper', type: 'copper', thicknessUm: 35, conductivityWmK: 385, copperCoveragePercent: 30 },
        ]
    }
};

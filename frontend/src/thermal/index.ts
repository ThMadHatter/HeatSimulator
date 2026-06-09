import { Component } from '../store/useStore';
import { Point, HeatmapResult, Stackup } from './types';
import { solveSteadyState } from './solver';
import { applyColorMap } from './colorMap';

export * from './types';
export { applyColorMap };

import { Zone } from './types';

export const computeHeatmap = (
    components: Component[],
    zones: Zone[],
    widthMm: number,
    heightMm: number,
    boundary: Point[],
    ambientTemp: number,
    resolution: number = 150,
    stackup?: Stackup
): HeatmapResult => {
    return solveSteadyState(components, zones, widthMm, heightMm, boundary, ambientTemp, resolution, stackup);
};

import { Component } from '../store/useStore';
import { Point, HeatmapResult, Stackup, BoardStackup } from './types';
import { solveSteadyState } from './solver';
import { applyColorMap } from './colorMap';
import { estimateBaseConductivity } from './utils';

export * from './types';
export { applyColorMap, estimateBaseConductivity };

import { Zone } from './types';

export const computeHeatmap = (
    components: Component[],
    zones: Zone[],
    widthMm: number,
    heightMm: number,
    boundary: Point[],
    ambientTemp: number,
    resolution: number = 150,
    stackup?: Stackup,
    detailedStackup?: BoardStackup,
    debug: boolean = false
): HeatmapResult => {
    return solveSteadyState(components, zones, widthMm, heightMm, boundary, ambientTemp, resolution, stackup, detailedStackup, debug);
};

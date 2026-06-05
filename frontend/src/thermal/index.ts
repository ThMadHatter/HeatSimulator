import { Component } from '../store/useStore';
import { Point, HeatmapResult } from './types';
import { computeThermalField } from './temperature';
import { applyColorMap } from './colorMap';

export * from './types';
export { applyColorMap };

export const computeHeatmap = (
    components: Component[],
    widthMm: number,
    heightMm: number,
    boundary: Point[],
    ambientTemp: number,
    resolution: number = 150
): HeatmapResult => {
    return computeThermalField(components, widthMm, heightMm, boundary, ambientTemp, resolution);
};

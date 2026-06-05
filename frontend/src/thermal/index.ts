import { Component } from '../store/useStore';
import { computeGaussianHeatmap, applyColorMap, HeatmapResult } from './gaussian';

export type { HeatmapResult };

export const computeHeatmap = (
    components: Component[],
    widthMm: number,
    heightMm: number,
    resolution: number = 150
): HeatmapResult => {
    return computeGaussianHeatmap(components, widthMm, heightMm, resolution);
};

export { applyColorMap };

import { Component } from '../store/useStore';

export interface Point {
    x: number;
    y: number;
}

export interface JunctionData {
    compId: string;
    tj: number | null;
    tPcb: number;
    rThetaPcb: number;
    margin: number | null;
    ratingPercent: number | null;
    isOverLimit: boolean;
    warning?: string;
}

export interface Zone {
    id: string;
    label: string;
    points: Point[];
    conductivity: number; // W/mK
    enabled: boolean;
}

export interface Stackup {
    boardThicknessMm: number;
    layerCount: number;
    copperOzPerLayer: number;
    estimatedCopperCoveragePercent: number;
}

export interface HeatmapResult {
    data: Float32Array;
    kGrid: Float32Array;
    width: number;
    height: number;
    minTemp: number;
    maxTemp: number;
    junctions: JunctionData[];
    iterations: number;
}

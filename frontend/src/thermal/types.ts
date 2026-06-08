import { Component } from '../store/useStore';

export interface Point {
    x: number;
    y: number;
}

export interface JunctionData {
    compId: string;
    tj: number;
    margin: number;
    ratingPercent: number;
    isOverLimit: boolean;
}

export interface HeatmapResult {
    data: Float32Array;
    width: number;
    height: number;
    minTemp: number;
    maxTemp: number;
    junctions: JunctionData[];
}

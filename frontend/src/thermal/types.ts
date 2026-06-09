import { Component } from '../store/useStore';

export interface Point {
    x: number;
    y: number;
}

export interface JunctionData {
    compId: string;
    tj: number;
    tpcb: number;
    rthPcb: number;
    margin: number;
    ratingPercent: number;
    isOverLimit: boolean;
}

export interface Zone {
    id: string;
    name: string;
    points: Point[];
    conductivity: number; // W/mK
}

export interface HeatmapResult {
    data: Float32Array;
    width: number;
    height: number;
    minTemp: number;
    maxTemp: number;
    junctions: JunctionData[];
}

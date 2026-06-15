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

export type PolygonType = "pcbBoundary" | "conductivityZone" | "materialZone" | "keepoutZone";

export interface Zone {
    id: string;
    type: PolygonType;
    label: string;
    points: Point[];
    conductivity?: number; // W/mK - specific to conductivityZone
    enabled: boolean;
    editable: boolean;
    selectable: boolean;
    deletable: boolean;
}

export interface StackupLayer {
    id: string;
    name: string;
    type: "copper" | "dielectric" | "core" | "prepreg" | "soldermask";
    thicknessUm: number;
    conductivityWmK: number;
    copperCoveragePercent?: number;
}

export interface BoardStackup {
    layers: StackupLayer[];
}

export interface Stackup {
    boardThicknessMm: number;
    layerCount: number;
    copperOzPerLayer: number;
    estimatedCopperCoveragePercent: number;
    // New fields
    baseConductivityMode: "manual" | "stackup";
}

export interface HeatmapResult {
    data: Float32Array;
    kGrid: Float32Array;
    width: number;
    height: number;
    minTemp: number;
    maxTemp: number;
    maxTempIdx: number;
    junctions: JunctionData[];
    iterations: number;
}

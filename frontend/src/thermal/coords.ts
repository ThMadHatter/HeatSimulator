import Konva from 'konva';
import { Point } from './types';

/**
 * Coordinate utility for consistent conversion between:
 * - Screen (Client/Browser)
 * - Stage (Konva Workspace)
 * - Millimeters (Physical PCB Space)
 * - Grid (Thermal Solver Indices)
 */

export interface StageTransform {
    scale: number;
    x: number;
    y: number;
}

export interface CalibrationData {
    mmPerPixel: number | null;
}

/**
 * Converts screen coordinates (from PointerEvent) to Stage coordinates.
 */
export const screenToStage = (screenPos: Point, stage: Konva.Stage): Point => {
    const transform = stage.getAbsoluteTransform().copy().invert();
    return transform.point(screenPos);
};

/**
 * Converts Stage coordinates to screen coordinates.
 */
export const stageToScreen = (stagePos: Point, stage: Konva.Stage): Point => {
    const transform = stage.getAbsoluteTransform();
    return transform.point(stagePos);
};

/**
 * Returns the position of the pointer relative to the stage's coordinate system,
 * accounting for scale and position. This is more robust than getRelativePointerPosition().
 */
export const getRelativePointerPosition = (stage: Konva.Stage): Point | null => {
    const pointer = stage.getPointerPosition();
    if (!pointer) return null;
    return screenToStage(pointer, stage);
};

/**
 * Converts Stage coordinates to Millimeters.
 * Uses the provided calibration.
 */
export const stageToMm = (stagePos: Point, calibration: CalibrationData): Point => {
    const factor = calibration.mmPerPixel || 1;
    return {
        x: stagePos.x * factor,
        y: stagePos.y * factor
    };
};

/**
 * Converts Millimeters to Stage coordinates.
 */
export const mmToStage = (mmPos: Point, calibration: CalibrationData): Point => {
    const factor = calibration.mmPerPixel || 1;
    if (factor === 0) return { x: 0, y: 0 };
    return {
        x: mmPos.x / factor,
        y: mmPos.y / factor
    };
};

/**
 * Converts a single Millimeter value to Stage Pixels.
 */
export const mmToPx = (mm: number, calibration: CalibrationData): number => {
    const factor = calibration.mmPerPixel || 1;
    if (factor === 0) return 0;
    return mm / factor;
};

/**
 * Converts a single Stage Pixel value to Millimeters.
 */
export const pxToMm = (px: number, calibration: CalibrationData): number => {
    const factor = calibration.mmPerPixel || 1;
    return px * factor;
};

/**
 * Converts Millimeters to Grid indices.
 */
export const mmToGrid = (mmPos: Point, gridWidthMm: number, gridHeightMm: number, nx: number, ny: number): { ix: number, iy: number } => {
    const dx = gridWidthMm / nx;
    const dy = gridHeightMm / ny;
    return {
        ix: Math.floor(mmPos.x / dx),
        iy: Math.floor(mmPos.y / dy)
    };
};

/**
 * Converts Grid indices to Millimeters (center of cell).
 */
export const gridToMm = (ix: number, iy: number, gridWidthMm: number, gridHeightMm: number, nx: number, ny: number): Point => {
    const dx = gridWidthMm / nx;
    const dy = gridHeightMm / ny;
    return {
        x: (ix + 0.5) * dx,
        y: (iy + 0.5) * dy
    };
};

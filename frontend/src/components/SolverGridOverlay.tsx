import React from 'react';
import { Group, Line } from 'react-konva';
import { useStore } from '../store/useStore';

const SolverGridOverlay: React.FC = () => {
    const heatmapResult = useStore(state => state.heatmapResult);
    const showGrid = useStore(state => state.showGrid);
    const calibration = useStore(state => state.calibration);

    if (!showGrid || !heatmapResult || !calibration.mmPerPixel) return null;

    const { width: nx, height: ny } = heatmapResult;
    const mmPerPixel = calibration.mmPerPixel;

    // We need to know the dxMm used by the solver.
    // It's calculated as Math.max(widthMm, heightMm) / 150;
    // but the actual nx, ny might be slightly different due to rounding.
    // However, we have heatmapResult.width and height which are nx and ny.
    // The grid should align with the heatmap.

    // The grid should align with the heatmap, which is in the master MM space.
    const { calibrationTop, calibrationBottom, calibration: legacyCal } = useStore.getState();
    const baseCal = calibrationTop.mmPerPixel ? calibrationTop : (calibrationBottom.mmPerPixel ? calibrationBottom : legacyCal);

    if (!baseCal.mmPerPixel) return null;
    const mmToPx = (mm: number) => mm / (baseCal.mmPerPixel as number);

    const widthPx = mmToPx(heatmapResult.widthMm);
    const heightPx = mmToPx(heatmapResult.heightMm);
    const dxPx = widthPx / nx;
    const dyPx = heightPx / ny;

    const lines = [];

    // Vertical lines
    for (let i = 0; i <= nx; i++) {
        lines.push(
            <Line
                key={`v-${i}`}
                points={[i * dxPx, 0, i * dxPx, heightPx]}
                stroke="white"
                strokeWidth={0.5}
                opacity={0.3}
                listening={false}
            />
        );
    }

    // Horizontal lines
    for (let j = 0; j <= ny; j++) {
        lines.push(
            <Line
                key={`h-${j}`}
                points={[0, j * dyPx, widthPx, j * dyPx]}
                stroke="white"
                strokeWidth={0.5}
                opacity={0.3}
                listening={false}
            />
        );
    }

    return (
        <Group listening={false}>
            {lines}
        </Group>
    );
};

export default SolverGridOverlay;

import React, { useMemo, useState, useEffect } from 'react';
import { Image as KonvaImage } from 'react-konva';
import { useStore } from '../store/useStore';
import { applyColorMap } from '../thermal';

interface HeatmapOverlayProps {
  width: number;
  height: number;
}

const HeatmapOverlay: React.FC<HeatmapOverlayProps> = ({ width, height }) => {
  const heatmapOpacity = useStore(state => state.heatmapOpacity);
  const ambientTemperature = useStore(state => state.ambientTemperature);
  const globalMaxTemperature = useStore(state => state.globalMaxTemperature);
  const manualHeatmapMaxTemperatureC = useStore(state => state.manualHeatmapMaxTemperatureC);
  const heatmapResult = useStore(state => state.heatmapResult);
  const heatmapViewMode = useStore(state => state.heatmapViewMode);
  const showConductivityMap = useStore(state => state.showConductivityMap);

  const [heatmapImg, setHeatmapImg] = useState<HTMLImageElement | null>(null);

  const bottomImageOffset = useStore(state => state.bottomImageOffset);
  const bottomImageRotation = useStore(state => state.bottomImageRotation);
  const calibrationBottom = useStore(state => state.calibrationBottom);
  const studyArea = useStore(state => state.studyArea);
  const calibrationTop = useStore(state => state.calibrationTop);
  const calibration = useStore(state => state.calibration);

  const baseCal = calibrationTop.mmPerPixel ? calibrationTop : (calibrationBottom.mmPerPixel ? calibrationBottom : calibration);

  const { data, displayMin, displayMax, nx, ny, colorMode } = useMemo(() => {
    if (!heatmapResult || width <= 0 || height <= 0) {
        return { data: null, displayMin: ambientTemperature, displayMax: ambientTemperature + 10, nx: 0, ny: 0 };
    }

    if (showConductivityMap) {
        let minK = Infinity;
        let maxK = -Infinity;
        for (let i = 0; i < heatmapResult.kGrid.length; i++) {
            if (heatmapResult.kGrid[i] < minK) minK = heatmapResult.kGrid[i];
            if (heatmapResult.kGrid[i] > maxK) maxK = heatmapResult.kGrid[i];
        }
        if (minK === maxK) {
            minK = 0.3;
            maxK = 50;
        }
        return { data: heatmapResult.kGrid, displayMin: minK, displayMax: maxK, nx: heatmapResult.width, ny: heatmapResult.height, colorMode: 'standard' as const };
    }

    let sourceData = heatmapResult.data;
    if (heatmapViewMode === 'top') sourceData = heatmapResult.TTop;
    else if (heatmapViewMode === 'bottom') sourceData = heatmapResult.TBottom;
    else if (heatmapViewMode === 'difference') {
        sourceData = new Float32Array(heatmapResult.TTop.length);
        for (let i = 0; i < sourceData.length; i++) sourceData[i] = heatmapResult.TTop[i] - heatmapResult.TBottom[i];
    }

    if (heatmapViewMode === 'difference') {
        let maxDelta = 0;
        for (let i = 0; i < sourceData.length; i++) {
            const abs = Math.abs(sourceData[i]);
            if (abs > maxDelta) maxDelta = abs;
        }
        return { data: sourceData, displayMin: -maxDelta, displayMax: maxDelta, nx: heatmapResult.width, ny: heatmapResult.height, colorMode: 'diverging' as const };
    }

    const displayMaxT = manualHeatmapMaxTemperatureC !== null ? manualHeatmapMaxTemperatureC :
                      (globalMaxTemperature !== null ? globalMaxTemperature : heatmapResult.maxTemp);
    const displayMinT = heatmapResult.minTemp;

    return { data: sourceData, displayMin: displayMinT, displayMax: displayMaxT, nx: heatmapResult.width, ny: heatmapResult.height, colorMode: 'standard' as const };
  }, [heatmapResult, heatmapViewMode, ambientTemperature, globalMaxTemperature, manualHeatmapMaxTemperatureC, width, height, showConductivityMap]);

  useEffect(() => {
    if (!data || nx === 0 || ny === 0) {
        setHeatmapImg(null);
        return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = nx;
    canvas.height = ny;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.createImageData(nx, ny);
    for (let i = 0; i < data.length; i++) {
        const val = data[i];
        let r, g, b;
        [r, g, b] = applyColorMap(val, displayMin, displayMax, colorMode === 'diverging' ? 'diverging' : undefined);
        imageData.data[i * 4] = r;
        imageData.data[i * 4 + 1] = g;
        imageData.data[i * 4 + 2] = b;
        imageData.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(imageData, 0, 0);

    // Post-processing to apply study area clipping if needed
    if (studyArea.enabled) {
        const dx = (nx > 0) ? (heatmapResult?.widthMm || 1) / nx : 1;
        for (let j = 0; j < ny; j++) {
            for (let i = 0; i < nx; i++) {
                const cx = (i + 0.5) * dx;
                const cy = (j + 0.5) * dx;
                let inside = true;

                if (studyArea.shape === 'circle') {
                    const radius = Math.max(studyArea.rectMm.width, studyArea.rectMm.height) / 2;
                    const centerX = studyArea.rectMm.x + studyArea.rectMm.width/2;
                    const centerY = studyArea.rectMm.y + studyArea.rectMm.height/2;
                    const distSq = (cx - centerX) ** 2 + (cy - centerY) ** 2;
                    if (distSq > radius ** 2) inside = false;
                } else {
                    if (cx < studyArea.rectMm.x || cx > studyArea.rectMm.x + studyArea.rectMm.width ||
                        cy < studyArea.rectMm.y || cy > studyArea.rectMm.y + studyArea.rectMm.height) {
                        inside = false;
                    }
                }

                if (!inside) {
                    imageData.data[(j * nx + i) * 4 + 3] = 0; // Transparent
                }
            }
        }
    }

    ctx.putImageData(imageData, 0, 0);

    const image = new Image();
    image.onload = () => {
        setHeatmapImg(image);
    };
    image.src = canvas.toDataURL();
  }, [data, displayMin, displayMax, nx, ny, studyArea, heatmapResult]);

  if (!heatmapImg) return null;

  const mmToPxBottom = (mm: number) => calibrationBottom.mmPerPixel ? mm / calibrationBottom.mmPerPixel : mm;

  return (
    <KonvaImage
        image={heatmapImg}
        width={width}
        height={height}
        opacity={heatmapOpacity}
        listening={false}
    />
  );
};

export default HeatmapOverlay;

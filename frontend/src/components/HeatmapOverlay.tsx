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

    const image = new Image();
    image.onload = () => {
        setHeatmapImg(image);
    };
    image.src = canvas.toDataURL();
  }, [data, displayMin, displayMax, nx, ny]);

  if (!heatmapImg) return null;

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

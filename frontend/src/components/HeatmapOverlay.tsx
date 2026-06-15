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
  const showConductivityMap = useStore(state => state.showConductivityMap);

  const [heatmapImg, setHeatmapImg] = useState<HTMLImageElement | null>(null);

  const { data, displayMin, displayMax, nx, ny } = useMemo(() => {
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
        return { data: heatmapResult.kGrid, displayMin: minK, displayMax: maxK, nx: heatmapResult.width, ny: heatmapResult.height };
    }

    const displayMaxT = manualHeatmapMaxTemperatureC !== null ? manualHeatmapMaxTemperatureC :
                      (globalMaxTemperature !== null ? globalMaxTemperature : heatmapResult.maxTemp);
    const displayMinT = heatmapResult.minTemp;

    return { data: heatmapResult.data, displayMin: displayMinT, displayMax: displayMaxT, nx: heatmapResult.width, ny: heatmapResult.height };
  }, [heatmapResult, ambientTemperature, globalMaxTemperature, manualHeatmapMaxTemperatureC, width, height, showConductivityMap]);

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
        [r, g, b] = applyColorMap(val, displayMin, displayMax);
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

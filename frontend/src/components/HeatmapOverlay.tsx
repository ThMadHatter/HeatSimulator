import React, { useMemo, useState, useEffect } from 'react';
import { Image as KonvaImage } from 'react-konva';
import { useStore } from '../store/useStore';
import { applyColorMap } from '../thermal';

interface HeatmapOverlayProps {
  width: number;
  height: number;
  onResult: (minT: number, maxT: number) => void;
}

const HeatmapOverlay: React.FC<HeatmapOverlayProps> = ({ width, height, onResult }) => {
  const {
    heatmapOpacity, ambientTemperature, globalMaxTemperature, heatmapResult, showConductivityMap
  } = useStore();

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

    const displayMaxT = globalMaxTemperature !== null ? globalMaxTemperature : heatmapResult.maxTemp;
    const displayMinT = heatmapResult.minTemp;

    return { data: heatmapResult.data, displayMin: displayMinT, displayMax: displayMaxT, nx: heatmapResult.width, ny: heatmapResult.height };
  }, [heatmapResult, ambientTemperature, globalMaxTemperature, width, height, showConductivityMap]);

  useEffect(() => {
    if (!data || nx === 0 || ny === 0) {
        setHeatmapImg(null);
        onResult(ambientTemperature, ambientTemperature + 10);
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
        if (showConductivityMap) {
            // Scale: 0.3 -> 50
            // Scale: low k: dark blue, medium k: green, high k: yellow/red
            // Use existing applyColorMap which does blue -> green -> yellow -> red
            [r, g, b] = applyColorMap(val, displayMin, displayMax);
        } else {
            [r, g, b] = applyColorMap(val, displayMin, displayMax);
        }
        imageData.data[i * 4] = r;
        imageData.data[i * 4 + 1] = g;
        imageData.data[i * 4 + 2] = b;
        imageData.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(imageData, 0, 0);

    const image = new Image();
    image.onload = () => {
        setHeatmapImg(image);
        onResult(displayMin, displayMax);
    };
    image.src = canvas.toDataURL();
  }, [data, displayMin, displayMax, ambientTemperature, onResult, nx, ny, showConductivityMap]);

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

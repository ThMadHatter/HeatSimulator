import React, { useMemo, useState, useEffect } from 'react';
import { Image as KonvaImage } from 'react-konva';
import { useStore } from '../store/useStore';
import { computeHeatmap, applyColorMap } from '../thermal';

interface HeatmapOverlayProps {
  width: number;
  height: number;
  onResult: (minT: number, maxT: number) => void;
}

const HeatmapOverlay: React.FC<HeatmapOverlayProps> = ({ width, height, onResult }) => {
  const {
    heatmapOpacity, ambientTemperature, globalMaxTemperature, heatmapResult
  } = useStore();

  const [heatmapImg, setHeatmapImg] = useState<HTMLImageElement | null>(null);

  const { data, displayMinT, displayMaxT, nx, ny } = useMemo(() => {
    if (!heatmapResult || width <= 0 || height <= 0) {
        return { data: null, displayMinT: ambientTemperature, displayMaxT: ambientTemperature + 10, nx: 0, ny: 0 };
    }

    const displayMaxT = globalMaxTemperature !== null ? globalMaxTemperature : heatmapResult.maxTemp;
    const displayMinT = heatmapResult.minTemp;

    return { data: heatmapResult.data, displayMinT, displayMaxT, nx: heatmapResult.width, ny: heatmapResult.height };
  }, [heatmapResult, ambientTemperature, globalMaxTemperature, width, height]);

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
        const temp = data[i];
        const [r, g, b] = applyColorMap(temp, displayMinT, displayMaxT);
        imageData.data[i * 4] = r;
        imageData.data[i * 4 + 1] = g;
        imageData.data[i * 4 + 2] = b;
        imageData.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(imageData, 0, 0);

    const image = new Image();
    image.onload = () => {
        setHeatmapImg(image);
        onResult(displayMinT, displayMaxT);
    };
    image.src = canvas.toDataURL();
  }, [data, displayMinT, displayMaxT, ambientTemperature, onResult, nx, ny]);

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

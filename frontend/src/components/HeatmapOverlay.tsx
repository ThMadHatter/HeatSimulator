import React, { useMemo, useState, useEffect } from 'react';
import { Image as KonvaImage } from 'react-konva';
import { useStore } from '../store/useStore';
import { computeHeatmap, applyColorMap } from '../thermal';

interface HeatmapOverlayProps {
  width: number;
  height: number;
  widthMm: number;
  heightMm: number;
  onResult: (minT: number, maxT: number) => void;
}

const HeatmapOverlay: React.FC<HeatmapOverlayProps> = ({ width, height, widthMm, heightMm, onResult }) => {
  const {
    components, heatmapOpacity, boundary,
    ambientTemperature, globalMaxTemperature
  } = useStore();

  const [heatmapImg, setHeatmapImg] = useState<HTMLImageElement | null>(null);

  const { data, displayMinT, displayMaxT } = useMemo(() => {
    if (width <= 0 || height <= 0 || components.length === 0) {
        return { data: null, displayMinT: ambientTemperature, displayMaxT: ambientTemperature + 10 };
    }

    const resolution = 150;
    const result = computeHeatmap(
        components,
        widthMm,
        heightMm,
        boundary,
        ambientTemperature,
        resolution
    );

    const displayMaxT = globalMaxTemperature !== null ? globalMaxTemperature : result.maxTemp;
    const displayMinT = result.minTemp;

    return { data: result.data, displayMinT, displayMaxT };
  }, [components, widthMm, heightMm, boundary, ambientTemperature, globalMaxTemperature, width, height]);

  useEffect(() => {
    if (!data) {
        setHeatmapImg(null);
        onResult(ambientTemperature, ambientTemperature + 10);
        return;
    }

    const resolution = 150;
    const canvas = document.createElement('canvas');
    canvas.width = resolution;
    canvas.height = resolution;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.createImageData(resolution, resolution);
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
  }, [data, displayMinT, displayMaxT, ambientTemperature, onResult]);

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

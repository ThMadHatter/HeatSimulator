import React, { useMemo } from 'react';
import { Image as KonvaImage } from 'react-konva';
import { useStore } from '../store/useStore';
import { computeHeatmap, tempToColor } from '../utils/thermal';

interface HeatmapOverlayProps {
  width: number;
  height: number;
  widthMm: number;
  heightMm: number;
}

const HeatmapOverlay: React.FC<HeatmapOverlayProps> = ({ width, height, widthMm, heightMm }) => {
  const { components, maxTempScale, heatmapOpacity } = useStore();

  const heatmapImage = useMemo(() => {
    if (width <= 0 || height <= 0 || components.length === 0) return null;

    const resolution = 150; // Use a bit lower for performance if needed
    const grid = computeHeatmap(widthMm, heightMm, components, resolution);

    const canvas = document.createElement('canvas');
    canvas.width = resolution;
    canvas.height = resolution;
    const ctx = canvas.getContext('2d');

    if (!ctx) return null;

    const imageData = ctx.createImageData(resolution, resolution);

    for (let i = 0; i < grid.length; i++) {
      const point = grid[i];
      const color = tempToColor(point.temp, maxTempScale);
      // Extract RGB from color string "rgb(r, g, b)"
      const matches = color.match(/\d+/g);
      if (matches) {
          imageData.data[i * 4] = parseInt(matches[0]);
          imageData.data[i * 4 + 1] = parseInt(matches[1]);
          imageData.data[i * 4 + 2] = parseInt(matches[2]);
          imageData.data[i * 4 + 3] = 255; // Alpha handled by Konva Layer
      }
    }

    ctx.putImageData(imageData, 0, 0);

    const img = new Image();
    img.src = canvas.toDataURL();
    return img;
  }, [components, maxTempScale, widthMm, heightMm, width, height]);

  if (!heatmapImage) return null;

  return (
    <KonvaImage
      image={heatmapImage}
      width={width}
      height={height}
      opacity={heatmapOpacity}
      listening={false}
    />
  );
};

export default HeatmapOverlay;

import React, { useMemo } from 'react';
import { Image as KonvaImage } from 'react-konva';
import { useStore } from '../store/useStore';
import { computeHeatmap, applyColorMap } from '../thermal';

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

    const resolution = 150;
    const result = computeHeatmap(components, widthMm, heightMm, resolution);

    const canvas = document.createElement('canvas');
    canvas.width = resolution;
    canvas.height = resolution;
    const ctx = canvas.getContext('2d');

    if (!ctx) return null;

    const imageData = ctx.createImageData(resolution, resolution);

    for (let i = 0; i < result.data.length; i++) {
      const temp = result.data[i];
      const [r, g, b] = applyColorMap(temp, maxTempScale);

      imageData.data[i * 4] = r;
      imageData.data[i * 4 + 1] = g;
      imageData.data[i * 4 + 2] = b;
      imageData.data[i * 4 + 3] = 255;
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

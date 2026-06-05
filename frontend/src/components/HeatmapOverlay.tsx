import React, { useMemo } from 'react';
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

  const { img, minTemp, maxTemp } = useMemo(() => {
    if (width <= 0 || height <= 0 || components.length === 0) {
        return { img: null, minTemp: ambientTemperature, maxTemp: ambientTemperature + 10 };
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

    const canvas = document.createElement('canvas');
    canvas.width = resolution;
    canvas.height = resolution;
    const ctx = canvas.getContext('2d');

    if (!ctx) return { img: null, minTemp: displayMinT, maxTemp: displayMaxT };

    const imageData = ctx.createImageData(resolution, resolution);

    for (let i = 0; i < result.data.length; i++) {
      const temp = result.data[i];
      const [r, g, b] = applyColorMap(temp, displayMinT, displayMaxT);

      imageData.data[i * 4] = r;
      imageData.data[i * 4 + 1] = g;
      imageData.data[i * 4 + 2] = b;
      imageData.data[i * 4 + 3] = 255;
    }

    ctx.putImageData(imageData, 0, 0);

    const image = new Image();
    image.src = canvas.toDataURL();
    return { img: image, minTemp: displayMinT, maxTemp: displayMaxT };
  }, [components, widthMm, heightMm, boundary, ambientTemperature, globalMaxTemperature, width, height]);

  React.useEffect(() => {
    onResult(minTemp, maxTemp);
  }, [minTemp, maxTemp, onResult]);

  if (!img) return null;

  return (
    <KonvaImage
        image={img}
        width={width}
        height={height}
        opacity={heatmapOpacity}
        listening={false}
    />
  );
};

export default HeatmapOverlay;

import { Component } from '../store/useStore';

export interface HeatmapResult {
  data: Float32Array;
  width: number;
  height: number;
  maxTemp: number;
  hottestComponentId: string | null;
}

export function computeGaussianHeatmap(
  components: Component[],
  widthMm: number,
  heightMm: number,
  resolution: number = 150
): HeatmapResult {
  const data = new Float32Array(resolution * resolution);
  const stepX = widthMm / resolution;
  const stepY = heightMm / resolution;
  let maxTemp = 0;

  // To find hottest component
  const componentTemps = new Map<string, number>();

  for (let j = 0; j < resolution; j++) {
    for (let i = 0; i < resolution; i++) {
        const x = i * stepX;
        const y = j * stepY;
        let totalTemp = 0;

        for (const comp of components) {
            const dx = x - comp.x;
            const dy = y - comp.y;
            const r2 = dx * dx + dy * dy;
            const sigma2 = comp.spread * comp.spread;

            const contribution = comp.power * Math.exp(-r2 / (2 * sigma2));
            totalTemp += contribution;

            // For simple hottest component tracking, we just track peak contribution
            // though in reality temperature is a field.
        }

        data[j * resolution + i] = totalTemp;
        if (totalTemp > maxTemp) maxTemp = totalTemp;
    }
  }

  let hottestComponentId: string | null = null;
  let maxCompPower = -1;
  for (const comp of components) {
      if (comp.power > maxCompPower) {
          maxCompPower = comp.power;
          hottestComponentId = comp.id;
      }
  }

  return {
    data,
    width: resolution,
    height: resolution,
    maxTemp,
    hottestComponentId,
  };
}

export function applyColorMap(temp: number, maxTemp: number): [number, number, number] {
    if (maxTemp === 0) return [0, 0, 255];
    const val = Math.min(Math.max(temp / maxTemp, 0), 1);

    // Gradient: Blue (0) -> Cyan (0.25) -> Green (0.5) -> Yellow (0.75) -> Red (1)
    let r = 0, g = 0, b = 0;

    if (val < 0.25) {
        // Blue to Cyan
        const f = val / 0.25;
        b = 255;
        g = Math.floor(255 * f);
    } else if (val < 0.5) {
        // Cyan to Green
        const f = (val - 0.25) / 0.25;
        g = 255;
        b = Math.floor(255 * (1 - f));
    } else if (val < 0.75) {
        // Green to Yellow
        const f = (val - 0.5) / 0.25;
        g = 255;
        r = Math.floor(255 * f);
    } else {
        // Yellow to Red
        const f = (val - 0.75) / 0.25;
        r = 255;
        g = Math.floor(255 * (1 - f));
    }

    return [r, g, b];
}

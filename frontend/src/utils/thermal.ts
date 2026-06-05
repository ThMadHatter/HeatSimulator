import { Component } from '../store/useStore';

export interface HeatmapPoint {
  x: number;
  y: number;
  temp: number;
}

export function computeHeatmap(
  widthMm: number,
  heightMm: number,
  components: Component[],
  resolution: number = 200
): HeatmapPoint[] {
  const points: HeatmapPoint[] = [];
  const stepX = widthMm / resolution;
  const stepY = heightMm / resolution;

  for (let j = 0; j < resolution; j++) {
    for (let i = 0; i < resolution; i++) {
      const x = i * stepX;
      const y = j * stepY;
      let temp = 0;

      for (const comp of components) {
        const dx = x - comp.x;
        const dy = y - comp.y;
        const r2 = dx * dx + dy * dy;
        const sigma2 = comp.spread * comp.spread;

        // T = power * exp(-r^2 / (2 * sigma^2))
        temp += comp.power * Math.exp(-r2 / (2 * sigma2));
      }

      points.push({ x, y, temp });
    }
  }

  return points;
}

export function tempToColor(temp: number, maxTemp: number): string {
  const normalized = Math.min(Math.max(temp / maxTemp, 0), 1);

  // Simple blue to red gradient
  // blue: rgb(0, 0, 255) -> red: rgb(255, 0, 0)
  const r = Math.floor(255 * normalized);
  const g = 0;
  const b = Math.floor(255 * (1 - normalized));

  return `rgb(${r}, ${g}, ${b})`;
}

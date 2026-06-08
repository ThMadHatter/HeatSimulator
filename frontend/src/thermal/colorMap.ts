export function applyColorMap(temp: number, minTemp: number, maxTemp: number): [number, number, number] {
    const range = maxTemp - minTemp;
    if (range <= 0) return [0, 0, 255];
    const val = Math.min(Math.max((temp - minTemp) / range, 0), 1);

    // Gradient: Blue (ambient) -> Green (mid) -> Yellow (hot) -> Red (critical)
    let r = 0, g = 0, b = 0;

    if (val < 0.33) {
        // Blue to Green
        const f = val / 0.33;
        b = Math.floor(255 * (1 - f));
        g = Math.floor(255 * f);
    } else if (val < 0.66) {
        // Green to Yellow
        const f = (val - 0.33) / 0.33;
        g = 255;
        r = Math.floor(255 * f);
    } else {
        // Yellow to Red
        const f = (val - 0.66) / 0.34;
        r = 255;
        g = Math.floor(255 * (1 - f));
    }

    return [r, g, b];
}

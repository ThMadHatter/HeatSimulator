export function applyColorMap(temp: number, minTemp: number, maxTemp: number, mode?: 'diverging'): [number, number, number] {
    if (mode === 'diverging') {
        const absMax = Math.max(Math.abs(minTemp), Math.abs(maxTemp));
        const val = Math.min(Math.max(temp / (absMax || 1), -1), 1); // -1 to 1

        let r = 0, g = 0, b = 0;
        if (val < 0) {
            // Blue to White
            const f = -val;
            r = Math.floor(255 * (1 - f));
            g = Math.floor(255 * (1 - f));
            b = 255;
        } else {
            // White to Red
            const f = val;
            r = 255;
            g = Math.floor(255 * (1 - f));
            b = Math.floor(255 * (1 - f));
        }
        return [r, g, b];
    }

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

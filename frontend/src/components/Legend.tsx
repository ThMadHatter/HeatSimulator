import React from 'react';
import { useStore } from '../store/useStore';
import { applyColorMap } from '../thermal';

interface LegendProps {
    minTemp: number;
    maxTemp: number;
}

const Legend: React.FC<LegendProps> = ({ minTemp, maxTemp }) => {
    const steps = 5;
    const items = [];

    for (let i = steps; i >= 0; i--) {
        const t = minTemp + (maxTemp - minTemp) * (i / steps);
        const [r, g, b] = applyColorMap(t, minTemp, maxTemp);
        items.push({
            temp: t.toFixed(1),
            color: `rgb(${r}, ${g}, ${b})`
        });
    }

    return (
        <div className="absolute right-4 top-40 bg-white/80 backdrop-blur-sm p-3 rounded shadow-lg border border-gray-300 flex flex-col gap-2 z-10">
            <div className="text-[10px] font-bold text-gray-700 uppercase text-center mb-1">Temp (°C)</div>
            <div className="flex gap-3">
                <div
                    className="w-4 h-32 rounded"
                    style={{
                        background: `linear-gradient(to top,
                            rgb(${applyColorMap(minTemp, minTemp, maxTemp).join(',')}),
                            rgb(${applyColorMap(minTemp + (maxTemp-minTemp)*0.5, minTemp, maxTemp).join(',')}),
                            rgb(${applyColorMap(maxTemp, minTemp, maxTemp).join(',')}))`
                    }}
                />
                <div className="flex flex-col justify-between text-[10px] font-mono text-gray-800">
                    {items.map((item, idx) => (
                        <div key={idx}>{item.temp}</div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Legend;

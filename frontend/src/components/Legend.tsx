import React, { useMemo } from 'react';
import { useStore } from '../store/useStore';
import { applyColorMap } from '../thermal';

const Legend: React.FC = () => {
    const heatmapResult = useStore(state => state.heatmapResult);
    const globalMaxTemperature = useStore(state => state.globalMaxTemperature);
    const manualHeatmapMaxTemperatureC = useStore(state => state.manualHeatmapMaxTemperatureC);
    const showConductivityMap = useStore(state => state.showConductivityMap);

    const { min, max, label } = useMemo(() => {
        if (showConductivityMap && heatmapResult) {
            let minK = Infinity;
            let maxK = -Infinity;
            for (let i = 0; i < heatmapResult.kGrid.length; i++) {
                if (heatmapResult.kGrid[i] < minK) minK = heatmapResult.kGrid[i];
                if (heatmapResult.kGrid[i] > maxK) maxK = heatmapResult.kGrid[i];
            }
            if (minK === maxK) { minK = 0.3; maxK = 50; }
            return { min: minK, max: maxK, label: "Cond (W/mK)" };
        }
        if (heatmapResult) {
            const displayMaxT = manualHeatmapMaxTemperatureC !== null ? manualHeatmapMaxTemperatureC :
                              (globalMaxTemperature !== null ? globalMaxTemperature : heatmapResult.maxTemp);
            return { min: heatmapResult.minTemp, max: displayMaxT, label: "Temp (°C)" };
        }
        return { min: 25, max: 35, label: "Temp (°C)" };
    }, [heatmapResult, showConductivityMap]);

    const steps = 5;
    const items = [];

    for (let i = steps; i >= 0; i--) {
        const t = min + (max - min) * (i / steps);
        const [r, g, b] = applyColorMap(t, min, max);
        items.push({
            val: t.toFixed(1),
            color: `rgb(${r}, ${g}, ${b})`
        });
    }

    const exceedsScale = heatmapResult && !showConductivityMap && heatmapResult.maxTemp > max;

    return (
        <div className="absolute right-4 top-40 bg-white/80 backdrop-blur-sm p-3 rounded shadow-lg border border-gray-300 flex flex-col gap-2 z-10">
            <div className="text-[10px] font-bold text-gray-700 uppercase text-center mb-1">{label}</div>
            {exceedsScale && (
                <div className="text-[8px] text-red-600 bg-red-50 p-1 rounded border border-red-200 text-center animate-pulse">
                    ⚠️ Exceeds Scale
                </div>
            )}
            <div className="flex gap-3">
                <div
                    className="w-4 h-32 rounded"
                    style={{
                        background: `linear-gradient(to top,
                            rgb(${applyColorMap(min, min, max).join(',')}),
                            rgb(${applyColorMap(min + (max-min)*0.5, min, max).join(',')}),
                            rgb(${applyColorMap(max, min, max).join(',')}))`
                    }}
                />
                <div className="flex flex-col justify-between text-[10px] font-mono text-gray-800">
                    {items.map((item, idx) => (
                        <div key={idx}>{item.val}</div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Legend;

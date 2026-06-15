import React, { useMemo } from 'react';
import { Group, Rect, Text } from 'react-konva';
import { useStore } from '../store/useStore';
import { applyColorMap } from '../thermal';

const ExportLegend: React.FC = () => {
    const heatmapResult = useStore(state => state.heatmapResult);
    const globalMaxTemperature = useStore(state => state.globalMaxTemperature);
    const manualHeatmapMaxTemperatureC = useStore(state => state.manualHeatmapMaxTemperatureC);
    const showConductivityMap = useStore(state => state.showConductivityMap);
    const imageDimensions = useStore(state => state.imageDimensions);

    const { min, max, label, displayMin, displayMax } = useMemo(() => {
        if (showConductivityMap && heatmapResult) {
            let minK = Infinity;
            let maxK = -Infinity;
            for (let i = 0; i < heatmapResult.kGrid.length; i++) {
                if (heatmapResult.kGrid[i] < minK) minK = heatmapResult.kGrid[i];
                if (heatmapResult.kGrid[i] > maxK) maxK = heatmapResult.kGrid[i];
            }
            if (minK === maxK) { minK = 0.3; maxK = 50; }
            return { min: minK, max: maxK, displayMin: minK, displayMax: maxK, label: "Cond (W/mK)" };
        }
        if (heatmapResult) {
            const displayMaxT = manualHeatmapMaxTemperatureC !== null ? manualHeatmapMaxTemperatureC :
                              (globalMaxTemperature !== null ? globalMaxTemperature : heatmapResult.maxTemp);
            return { min: heatmapResult.minTemp, max: displayMaxT, displayMin: heatmapResult.minTemp, displayMax: displayMaxT, label: "Temp (°C)" };
        }
        return { min: 25, max: 35, displayMin: 25, displayMax: 35, label: "Temp (°C)" };
    }, [heatmapResult, showConductivityMap, globalMaxTemperature, manualHeatmapMaxTemperatureC]);

    if (!imageDimensions || !heatmapResult) return null;

    const exceedsScale = !showConductivityMap && heatmapResult.maxTemp > max;

    const steps = 5;
    const height = 150;
    const width = 60;
    const x = imageDimensions.width - width - 20;
    const y = 20;

    return (
        <Group x={x} y={y} name="EXPORT_LEGEND">
            <Rect width={width} height={height + (exceedsScale ? 55 : 40)} fill="white" opacity={0.8} stroke="#ccc" strokeWidth={1} cornerRadius={4} />
            <Text text={label} fontSize={8} fontStyle="bold" width={width} align="center" y={5} />
            {exceedsScale && (
                <Text text="⚠️ Exceeds Scale" fontSize={7} fill="#ef4444" fontStyle="bold" width={width} align="center" y={15} />
            )}

            {/* Gradient replacement using individual rects for simplicity in Konva export if needed,
                but Konva Rect can have fillLinearGradientStartPoint */}
            <Rect
                x={10} y={exceedsScale ? 35 : 20} width={15} height={height}
                fillLinearGradientStartPoint={{ x: 0, y: height }}
                fillLinearGradientEndPoint={{ x: 0, y: 0 }}
                fillLinearGradientColorStops={[
                    0, `rgb(${applyColorMap(displayMin, displayMin, displayMax).join(',')})`,
                    0.5, `rgb(${applyColorMap(displayMin + (displayMax-displayMin)*0.5, displayMin, displayMax).join(',')})`,
                    1, `rgb(${applyColorMap(displayMax, displayMin, displayMax).join(',')})`
                ]}
                cornerRadius={2}
            />

            {Array.from({ length: steps + 1 }).map((_, i) => {
                const t = min + (max - min) * (i / steps);
                return (
                    <Text
                        key={i}
                        text={t.toFixed(1)}
                        fontSize={8}
                        x={30}
                        y={(exceedsScale ? 35 : 20) + height - (i / steps * height) - 4}
                    />
                );
            })}
        </Group>
    );
};

export default ExportLegend;

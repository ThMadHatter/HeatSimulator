import React, { useMemo } from 'react';
import { Group, Rect, Text } from 'react-konva';
import { useStore } from '../store/useStore';
import { applyColorMap, estimateBaseConductivity } from '../thermal';

const ExportLegend: React.FC = () => {
    const heatmapResult = useStore(state => state.heatmapResult);
    const globalMaxTemperature = useStore(state => state.globalMaxTemperature);
    const manualHeatmapMaxTemperatureC = useStore(state => state.manualHeatmapMaxTemperatureC);
    const showConductivityMap = useStore(state => state.showConductivityMap);
    const imageDimensionsTop = useStore(state => state.imageDimensionsTop);
    const imageDimensionsBottom = useStore(state => state.imageDimensionsBottom);
    const ambientTemperature = useStore(state => state.ambientTemperature);
    const stackup = useStore(state => state.stackup);
    const detailedStackup = useStore(state => state.detailedStackup);
    const heatmapViewMode = useStore(state => state.heatmapViewMode);

    const { min, max, label, displayMin, displayMax, colorMode } = useMemo(() => {
        if (showConductivityMap && heatmapResult) {
            let minK = Infinity;
            let maxK = -Infinity;
            for (let i = 0; i < heatmapResult.kGrid.length; i++) {
                if (heatmapResult.kGrid[i] < minK) minK = heatmapResult.kGrid[i];
                if (heatmapResult.kGrid[i] > maxK) maxK = heatmapResult.kGrid[i];
            }
            if (minK === maxK) { minK = 0.3; maxK = 50; }
            return { min: minK, max: maxK, displayMin: minK, displayMax: maxK, label: "Cond (W/mK)", colorMode: 'standard' as const };
        }
        if (heatmapResult) {
            if (heatmapViewMode === 'difference') {
                let maxDelta = 0;
                for (let i = 0; i < heatmapResult.TTop.length; i++) {
                    const d = Math.abs(heatmapResult.TTop[i] - heatmapResult.TBottom[i]);
                    if (d > maxDelta) maxDelta = d;
                }
                return { min: -maxDelta, max: maxDelta, displayMin: -maxDelta, displayMax: maxDelta, label: "Delta T (°C)", colorMode: 'diverging' as const };
            }

            const displayMaxT = manualHeatmapMaxTemperatureC !== null ? manualHeatmapMaxTemperatureC :
                              (globalMaxTemperature !== null ? globalMaxTemperature : heatmapResult.maxTemp);
            const viewLabel = heatmapViewMode === 'top' ? 'Top T (°C)' :
                             heatmapViewMode === 'bottom' ? 'Bot T (°C)' :
                             heatmapViewMode === 'max' ? 'Max T/B (°C)' : 'Temp (°C)';
            return { min: heatmapResult.minTemp, max: displayMaxT, displayMin: heatmapResult.minTemp, displayMax: displayMaxT, label: viewLabel, colorMode: 'standard' as const };
        }
        return { min: 25, max: 35, displayMin: 25, displayMax: 35, label: "Temp (°C)", colorMode: 'standard' as const };
    }, [heatmapResult, showConductivityMap, globalMaxTemperature, manualHeatmapMaxTemperatureC, heatmapViewMode]);

    const currentDimensions = heatmapViewMode === 'bottom' ? (imageDimensionsBottom || imageDimensionsTop) : (imageDimensionsTop || imageDimensionsBottom);
    if (!currentDimensions || !heatmapResult) return null;

    const exceedsScale = !showConductivityMap && heatmapResult.maxTemp > max;
    const baseK = estimateBaseConductivity(stackup, detailedStackup);
    const timestamp = new Date().toLocaleString();

    const steps = 5;
    const height = 180;
    const width = 100; // Increased width for metadata
    // Position at bottom-right of the stage (viewport)
    const stageWidth = window.innerWidth - 64 - 256;
    const stageHeight = window.innerHeight - 64;
    const x = stageWidth - width - 20;
    const y = stageHeight - height - 40;

    return (
        <Group x={x} y={y} name="EXPORT_LEGEND">
            <Rect width={width} height={height + (exceedsScale ? 110 : 90)} fill="white" opacity={0.9} stroke="#ccc" strokeWidth={1} cornerRadius={6} shadowBlur={5} shadowOpacity={0.2} />
            <Text text={label} fontSize={10} fontStyle="bold" width={width} align="center" y={8} />
            {exceedsScale && (
                <Text text="⚠️ Exceeds Scale" fontSize={8} fill="#ef4444" fontStyle="bold" width={width} align="center" y={22} />
            )}

            <Rect
                x={15} y={exceedsScale ? 40 : 25} width={25} height={height}
                fillLinearGradientStartPoint={{ x: 0, y: height }}
                fillLinearGradientEndPoint={{ x: 0, y: 0 }}
                fillLinearGradientColorStops={[
                    0, `rgb(${applyColorMap(displayMin, displayMin, displayMax, colorMode === 'diverging' ? 'diverging' : undefined).join(',')})`,
                    0.5, `rgb(${applyColorMap(displayMin + (displayMax-displayMin)*0.5, displayMin, displayMax, colorMode === 'diverging' ? 'diverging' : undefined).join(',')})`,
                    1, `rgb(${applyColorMap(displayMax, displayMin, displayMax, colorMode === 'diverging' ? 'diverging' : undefined).join(',')})`
                ]}
                cornerRadius={2}
            />

            {Array.from({ length: steps + 1 }).map((_, i) => {
                const t = min + (max - min) * (i / steps);
                return (
                    <Text
                        key={i}
                        text={t.toFixed(1)}
                        fontSize={9}
                        fontStyle="bold"
                        x={45}
                        y={(exceedsScale ? 40 : 25) + height - (i / steps * height) - 5}
                    />
                );
            })}

            <Group y={height + (exceedsScale ? 50 : 35)}>
                <Rect x={5} width={width - 10} height={1} fill="#eee" />
                <Text
                    text={`Tamb: ${ambientTemperature}°C\nBase k: ${baseK.toFixed(2)} W/mK\nMode: ${stackup.baseConductivityMode}\nView: ${heatmapViewMode.toUpperCase()}\n\n${timestamp}`}
                    fontSize={7}
                    lineHeight={1.2}
                    x={8}
                    y={10}
                    width={width - 16}
                    fill="#666"
                />
            </Group>
        </Group>
    );
};

export default ExportLegend;

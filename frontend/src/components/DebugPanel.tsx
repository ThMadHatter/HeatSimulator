import React, { useMemo } from 'react';
import { useStore } from '../store/useStore';
import { computeHeatmap } from '../thermal';

const DebugPanel: React.FC = () => {
  const { components, imageDimensions, calibration } = useStore();

  const debugInfo = useMemo(() => {
    if (!imageDimensions || !calibration.mmPerPixel || components.length === 0) {
        return null;
    }

    const widthMm = imageDimensions.width * calibration.mmPerPixel;
    const heightMm = imageDimensions.height * calibration.mmPerPixel;
    const resolution = 150;
    const result = computeHeatmap(components, widthMm, heightMm, resolution);

    const hottestComp = components.find(c => c.id === result.hottestComponentId);

    return {
      maxTemp: result.maxTemp.toFixed(2),
      hottestCompName: hottestComp ? hottestComp.name : 'N/A',
      numComponents: components.length,
      gridSize: `${resolution}x${resolution}`,
    };
  }, [components, imageDimensions, calibration]);

  if (!debugInfo) return null;

  return (
    <div className="absolute top-4 right-4 bg-black/70 text-white p-3 rounded-lg text-xs font-mono backdrop-blur-sm pointer-events-none border border-white/20">
      <div className="font-bold border-b border-white/20 mb-2 pb-1 text-blue-400">DEBUG INFO</div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        <span>Max Temp:</span> <span className="text-right">{debugInfo.maxTemp} W/m²*</span>
        <span>Hottest:</span> <span className="text-right text-red-400">{debugInfo.hottestCompName}</span>
        <span>Components:</span> <span className="text-right">{debugInfo.numComponents}</span>
        <span>Grid Size:</span> <span className="text-right">{debugInfo.gridSize}</span>
      </div>
      <div className="mt-2 text-[10px] text-gray-400 italic">*Relative qualitative value</div>
    </div>
  );
};

export default DebugPanel;

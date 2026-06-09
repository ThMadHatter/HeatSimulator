import React, { useMemo } from 'react';
import { useStore } from '../store/useStore';
import { computeHeatmap } from '../thermal';

const DebugPanel: React.FC = () => {
  const { components, imageDimensions, calibration, boundary, ambientTemperature, showGrid, setShowGrid } = useStore();

  const debugInfo = useMemo(() => {
    if (!imageDimensions || !calibration.mmPerPixel || components.length === 0) {
        return null;
    }

    const widthMm = imageDimensions.width * calibration.mmPerPixel;
    const heightMm = imageDimensions.height * calibration.mmPerPixel;
    const resolution = 150;
    const result = computeHeatmap(components, widthMm, heightMm, boundary, ambientTemperature, resolution);

    // Find hottest junction
    let hottestComp = null;
    let maxTj = -1;
    for (const j of result.junctions) {
        if (j.tj > maxTj) {
            maxTj = j.tj;
            hottestComp = components.find(c => c.id === j.compId);
        }
    }

    return {
      maxTemp: result.maxTemp.toFixed(1),
      hottestCompName: hottestComp ? hottestComp.name : 'N/A',
      numComponents: components.length,
      gridSize: `${result.width}x${result.height}`,
      boundaryPoints: boundary.length,
    };
  }, [components, imageDimensions, calibration, boundary, ambientTemperature]);

  if (!debugInfo) return null;

  return (
    <div className="absolute top-4 right-4 bg-black/70 text-white p-3 rounded-lg text-xs font-mono backdrop-blur-sm border border-white/20 pointer-events-auto">
      <div className="font-bold border-b border-white/20 mb-2 pb-1 text-blue-400 uppercase">Thermal Engine v2</div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        <span>Max Board T:</span> <span className="text-right">{debugInfo.maxTemp} °C</span>
        <span>Hottest Tj:</span> <span className="text-right text-red-400">{debugInfo.hottestCompName}</span>
        <span>Components:</span> <span className="text-right">{debugInfo.numComponents}</span>
        <span>Boundary:</span> <span className="text-right">{debugInfo.boundaryPoints} pts</span>
        <span>Grid:</span> <span className="text-right">{debugInfo.gridSize}</span>
      </div>
      <div className="mt-2 pt-2 border-t border-white/20">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showGrid}
            onChange={(e) => setShowGrid(e.target.checked)}
            className="cursor-pointer"
          />
          Show Solver Grid
        </label>
      </div>
    </div>
  );
};

export default DebugPanel;

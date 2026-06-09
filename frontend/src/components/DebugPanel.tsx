import React, { useMemo } from 'react';
import { useStore } from '../store/useStore';

const DebugPanel: React.FC = () => {
  const {
    components, boundary, showGrid, setShowGrid,
    showConductivityMap, setShowConductivityMap,
    heatmapResult, debugPointerEvents, setDebugPointerEvents
  } = useStore();

  const debugInfo = useMemo(() => {
    if (!heatmapResult) {
        return null;
    }

    // Find hottest junction
    let hottestComp = null;
    let maxTj = -1;
    for (const j of heatmapResult.junctions) {
        const currentTj = j.tj ?? j.tPcb; // Use Tpcb if Tj is not available
        if (currentTj > maxTj) {
            maxTj = currentTj;
            hottestComp = components.find(c => c.id === j.compId);
        }
    }

    return {
      maxTemp: heatmapResult.maxTemp.toFixed(1),
      hottestCompName: hottestComp ? hottestComp.name : 'N/A',
      hottestCompId: hottestComp ? hottestComp.id : 'N/A',
      numComponents: components.length,
      gridSize: `${heatmapResult.width}x${heatmapResult.height}`,
      boundaryPoints: boundary.length,
      iterations: heatmapResult.iterations
    };
  }, [components, boundary, heatmapResult]);

  if (!debugInfo) return null;

  return (
    <div className="absolute top-4 right-4 bg-black/70 text-white p-3 rounded-lg text-xs font-mono backdrop-blur-sm border border-white/20 pointer-events-auto">
      <div className="font-bold border-b border-white/20 mb-2 pb-1 text-blue-400 uppercase">Thermal Engine v2</div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        <span>Global Max T:</span> <span className="text-right">{debugInfo.maxTemp} °C</span>
        <span>Hottest Comp:</span> <span className="text-right text-red-400">{debugInfo.hottestCompName}</span>
        <span className="text-[10px] text-gray-400">ID:</span> <span className="text-right text-[10px] text-gray-400">{debugInfo.hottestCompId}</span>
        <span>Components:</span> <span className="text-right">{debugInfo.numComponents}</span>
        <span>Boundary:</span> <span className="text-right">{debugInfo.boundaryPoints} pts</span>
        <span>Grid:</span> <span className="text-right">{debugInfo.gridSize}</span>
        <span>Iterations:</span> <span className="text-right">{debugInfo.iterations}</span>
      </div>
      <div className="mt-2 pt-2 border-t border-white/20 space-y-1">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showGrid}
            onChange={(e) => setShowGrid(e.target.checked)}
            className="cursor-pointer"
          />
          Show Solver Grid
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showConductivityMap}
            onChange={(e) => setShowConductivityMap(e.target.checked)}
            className="cursor-pointer"
          />
          Show Conductivity Map
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={debugPointerEvents}
            onChange={(e) => setDebugPointerEvents(e.target.checked)}
            className="cursor-pointer"
          />
          Debug Pointer Events
        </label>
      </div>
    </div>
  );
};

export default DebugPanel;

import React, { useMemo } from 'react';
import { useStore } from '../store/useStore';
import { Trash2, Settings, Info, Layers, Zap } from 'lucide-react';
import { estimateBaseConductivity } from '../thermal/utils';

const PropertyPanel: React.FC = () => {
  const {
    selection, components, updateComponent, removeComponent,
    zones, updateZone, removeZone, setSelection,
    stackup, setStackup,
    ambientTemperature, setAmbientTemperature,
    globalMaxTemperature, setGlobalMaxTemperature,
    heatmapResult
  } = useStore();

  const selectedComp = useMemo(() => {
    if (selection?.type === 'component') return components.find(c => c.id === selection.id);
    return null;
  }, [selection, components]);

  const selectedZone = useMemo(() => {
    if (selection?.type === 'polygon' || selection?.type === 'polygonVertex') {
      return zones.find(z => z.id === selection.id);
    }
    return null;
  }, [selection, zones]);

  const junctionData = useMemo(() => {
    if (!selectedComp || !heatmapResult) return null;
    return heatmapResult.junctions.find(j => j.compId === selectedComp.id);
  }, [selectedComp, heatmapResult]);

  const estimatedK = useMemo(() => estimateBaseConductivity(stackup), [stackup]);

  return (
    <div className="flex-none w-64 bg-gray-100 p-4 border-l border-gray-300 h-full overflow-y-auto">
      <div className="mb-8">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Settings size={20} />
            Board Settings
        </h2>
        <div className="space-y-4">
            <div>
                <label className="block text-xs font-medium text-gray-700">Ambient Temp (°C)</label>
                <input
                    type="number"
                    value={ambientTemperature}
                    onChange={(e) => setAmbientTemperature(parseFloat(e.target.value) || 0)}
                    className="mt-1 block w-full rounded border-gray-300 shadow-sm sm:text-xs p-1 border"
                />
            </div>
            <div>
                <label className="block text-xs font-medium text-gray-700">Max Temp Override (°C)</label>
                <input
                    type="number"
                    placeholder="Auto"
                    value={globalMaxTemperature || ''}
                    onChange={(e) => setGlobalMaxTemperature(e.target.value ? parseFloat(e.target.value) : null)}
                    className="mt-1 block w-full rounded border-gray-300 shadow-sm sm:text-xs p-1 border"
                />
            </div>
        </div>
      </div>

      <div className="mb-8 border-t border-gray-200 pt-4">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Layers size={20} />
            Stackup Estimate
        </h2>
        <div className="space-y-3">
            <div>
                <label className="block text-[10px] font-medium text-gray-500 uppercase">Thickness (mm)</label>
                <input
                    type="number"
                    value={stackup.boardThicknessMm}
                    step="0.1"
                    onChange={(e) => setStackup({ boardThicknessMm: parseFloat(e.target.value) || 0.1 })}
                    className="mt-1 block w-full rounded border-gray-300 shadow-sm sm:text-xs p-1 border"
                />
            </div>
            <div>
                <label className="block text-[10px] font-medium text-gray-500 uppercase">Copper Layers</label>
                <input
                    type="number"
                    value={stackup.layerCount}
                    onChange={(e) => setStackup({ layerCount: parseInt(e.target.value) || 1 })}
                    className="mt-1 block w-full rounded border-gray-300 shadow-sm sm:text-xs p-1 border"
                />
            </div>
            <div>
                <label className="block text-[10px] font-medium text-gray-500 uppercase">Copper Weight (oz)</label>
                <input
                    type="number"
                    value={stackup.copperOzPerLayer}
                    step="0.5"
                    onChange={(e) => setStackup({ copperOzPerLayer: parseFloat(e.target.value) || 0.5 })}
                    className="mt-1 block w-full rounded border-gray-300 shadow-sm sm:text-xs p-1 border"
                />
            </div>
            <div>
                <label className="block text-[10px] font-medium text-gray-500 uppercase">Avg Coverage (%)</label>
                <input
                    type="number"
                    value={stackup.estimatedCopperCoveragePercent}
                    onChange={(e) => setStackup({ estimatedCopperCoveragePercent: parseFloat(e.target.value) || 0 })}
                    className="mt-1 block w-full rounded border-gray-300 shadow-sm sm:text-xs p-1 border"
                />
            </div>
            <div className="bg-blue-50 p-2 rounded border border-blue-100">
                <div className="text-[10px] text-blue-600 font-bold uppercase">Estimated k_eff</div>
                <div className="text-sm font-mono font-bold text-blue-800">{estimatedK.toFixed(2)} W/mK</div>
            </div>
        </div>
      </div>

      <div className="mb-8 border-t border-gray-200 pt-4">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Zap size={20} />
            Conductivity Zones
        </h2>
        <div className="space-y-2">
            {zones.filter(z => z.type === 'conductivityZone').length === 0 ? (
                <p className="text-gray-500 italic text-xs">No zones defined. Use the toolbar to draw zones.</p>
            ) : (
                zones.filter(z => z.type === 'conductivityZone').map(zone => {
                    const isSelected = (selection?.type === 'polygon' || selection?.type === 'polygonVertex') && selection.id === zone.id;
                    return (
                    <div
                        key={zone.id}
                        className={`p-2 rounded border cursor-pointer transition-colors ${isSelected ? 'bg-blue-50 border-blue-300' : 'bg-white border-gray-200 hover:border-gray-300'}`}
                        onClick={() => setSelection({ type: 'polygon', shapeType: zone.type, id: zone.id })}
                    >
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-bold truncate flex-1">{zone.label}</span>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={zone.enabled}
                                    onChange={(e) => updateZone(zone.id, { enabled: e.target.checked })}
                                    onClick={(e) => e.stopPropagation()}
                                />
                                <button
                                    onClick={(e) => { e.stopPropagation(); removeZone(zone.id); }}
                                    className="text-red-400 hover:text-red-600"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                        <div className="text-[10px] text-gray-500 font-mono">k: {zone.conductivity} W/mK</div>
                    </div>
                );})
            )}

            {selectedZone && selectedZone.type === 'conductivityZone' && (
                <div className="mt-4 p-3 bg-gray-50 rounded border border-gray-200 space-y-3">
                    <div className="text-[10px] font-bold text-gray-500 uppercase">Edit Zone</div>
                    <div>
                        <label className="block text-[10px] font-medium text-gray-700">Label</label>
                        <input
                            type="text"
                            value={selectedZone.label}
                            onChange={(e) => updateZone(selectedZone.id, { label: e.target.value })}
                            className="mt-1 block w-full rounded border-gray-300 shadow-sm sm:text-xs p-1 border"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-medium text-gray-700">Conductivity (W/mK)</label>
                        <input
                            type="number"
                            value={selectedZone.conductivity}
                            onChange={(e) => updateZone(selectedZone.id, { conductivity: parseFloat(e.target.value) || 0 })}
                            className="mt-1 block w-full rounded border-gray-300 shadow-sm sm:text-xs p-1 border"
                        />
                    </div>
                </div>
            )}
        </div>
      </div>

      <div className="border-t border-gray-200 pt-4">
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">Component</h2>
            {selectedComp && (
                <button
                onClick={() => removeComponent(selectedComp.id)}
                className="text-red-500 hover:text-red-700"
                >
                <Trash2 size={20} />
                </button>
            )}
        </div>

        {!selectedComp ? (
            <p className="text-gray-500 italic text-sm">Select a component to edit its properties.</p>
        ) : (
            <div className="space-y-4">
            <div>
                <label className="block text-xs font-medium text-gray-700">Name</label>
                <input
                type="text"
                value={selectedComp.name}
                onChange={(e) => updateComponent(selectedComp.id, { name: e.target.value })}
                className="mt-1 block w-full rounded border-gray-300 shadow-sm sm:text-xs p-1 border"
                />
            </div>

            <div className="grid grid-cols-2 gap-2">
                <div>
                    <label className="block text-xs font-medium text-gray-700">Width (mm)</label>
                    <input
                    type="number"
                    value={selectedComp.width || 0}
                    onChange={(e) => updateComponent(selectedComp.id, { width: parseFloat(e.target.value) || 0 })}
                    className="mt-1 block w-full rounded border-gray-300 shadow-sm sm:text-xs p-1 border"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-700">Height (mm)</label>
                    <input
                    type="number"
                    value={selectedComp.height || 0}
                    onChange={(e) => updateComponent(selectedComp.id, { height: parseFloat(e.target.value) || 0 })}
                    className="mt-1 block w-full rounded border-gray-300 shadow-sm sm:text-xs p-1 border"
                    />
                </div>
            </div>

            <div>
                <label className="block text-xs font-medium text-gray-700">Power (W)</label>
                <input
                type="number"
                value={selectedComp.power}
                step="0.1"
                onChange={(e) => updateComponent(selectedComp.id, { power: parseFloat(e.target.value) || 0 })}
                className="mt-1 block w-full rounded border-gray-300 shadow-sm sm:text-xs p-1 border"
                />
            </div>

            <div>
                <label className="block text-xs font-medium text-gray-700">thetaJC (°C/W)</label>
                <input
                type="number"
                value={selectedComp.thetaJC || ''}
                placeholder="N/A"
                onChange={(e) => updateComponent(selectedComp.id, { thetaJC: e.target.value ? parseFloat(e.target.value) : undefined })}
                className="mt-1 block w-full rounded border-gray-300 shadow-sm sm:text-xs p-1 border"
                />
            </div>

            <div>
                <label className="block text-xs font-medium text-gray-700">thetaJA (°C/W)</label>
                <input
                type="number"
                value={selectedComp.thetaJA || ''}
                placeholder="N/A"
                onChange={(e) => updateComponent(selectedComp.id, { thetaJA: e.target.value ? parseFloat(e.target.value) : undefined })}
                className="mt-1 block w-full rounded border-gray-300 shadow-sm sm:text-xs p-1 border"
                />
            </div>

            <div>
                <label className="block text-xs font-medium text-gray-700">Max Temp (°C)</label>
                <input
                type="number"
                value={selectedComp.maxTemperature || 125}
                onChange={(e) => updateComponent(selectedComp.id, { maxTemperature: parseFloat(e.target.value) || 0 })}
                className="mt-1 block w-full rounded border-gray-300 shadow-sm sm:text-xs p-1 border"
                />
            </div>

            {junctionData && (
                <div className="pt-4 border-t border-gray-200 space-y-2">
                    <h3 className="text-xs font-bold text-blue-600 flex items-center gap-1">
                        <Info size={14} />
                        Simulation Results
                    </h3>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
                        <span className="text-gray-500">Tpcb:</span>
                        <span className="text-right font-mono">{junctionData.tPcb.toFixed(1)}°C</span>

                        <span className="text-gray-500">RθPCB:</span>
                        <span className="text-right font-mono">{selectedComp.power > 0 ? junctionData.rThetaPcb.toFixed(2) + ' K/W' : 'N/A'}</span>

                        <span className="text-gray-500 font-bold">Tj:</span>
                        <span className={`text-right font-bold font-mono ${junctionData.isOverLimit ? 'text-red-600' : 'text-green-600'}`}>
                            {junctionData.tj?.toFixed(1) ?? 'N/A'}°C
                        </span>

                        <span className="text-gray-500">Thermal utilization:</span>
                        <span className={`text-right font-bold font-mono ${
                            !junctionData.ratingPercent ? 'text-gray-400' :
                            junctionData.ratingPercent > 100 ? 'text-red-600 animate-pulse' :
                            junctionData.ratingPercent > 90 ? 'text-red-600' :
                            junctionData.ratingPercent > 70 ? 'text-orange-500' :
                            'text-green-600'
                        }`}>
                            {junctionData.ratingPercent ? junctionData.ratingPercent.toFixed(1) + '%' : 'N/A'}
                        </span>

                        {selectedComp.maxTemperature && junctionData.tj && (
                            <>
                                <span className="text-gray-500 text-[10px]">Margin:</span>
                                <span className={`text-right text-[10px] font-mono ${junctionData.isOverLimit ? 'text-red-600' : 'text-gray-700'}`}>
                                    {(selectedComp.maxTemperature - junctionData.tj).toFixed(1)}°C ({((selectedComp.maxTemperature - junctionData.tj)/selectedComp.maxTemperature*100).toFixed(1)}%)
                                </span>
                            </>
                        )}
                    </div>
                    {junctionData.warning && (
                        <div className="text-[10px] text-orange-600 bg-orange-50 p-1 rounded border border-orange-100 mt-1">
                            ⚠️ {junctionData.warning}
                        </div>
                    )}
                </div>
            )}

            <div className="pt-4 border-t border-gray-200">
                <p className="text-[10px] text-gray-500 uppercase font-bold">Position</p>
                <p className="text-xs text-gray-700">{selectedComp.x.toFixed(1)}mm, {selectedComp.y.toFixed(1)}mm</p>
            </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default PropertyPanel;

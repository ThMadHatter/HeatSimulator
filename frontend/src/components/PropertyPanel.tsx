import React, { useMemo, useState } from 'react';
import { useStore } from '../store/useStore';
import { Trash2, Settings, Info, Layers, Zap, ChevronDown, ChevronRight, Thermometer, Palette, Bug, Download } from 'lucide-react';
import { estimateBaseConductivity, calculateStackupKXY, calculateStackupKZ, STACKUP_PRESETS } from '../thermal/utils';

const Accordion: React.FC<{ title: string, icon: React.ReactNode, children: React.ReactNode, defaultOpen?: boolean }> = ({ title, icon, children, defaultOpen = false }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    return (
        <div className="border-b border-gray-200">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full py-3 px-1 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
                <div className="flex items-center gap-2 font-bold text-sm text-gray-700 uppercase tracking-wider">
                    {icon}
                    {title}
                </div>
                {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            {isOpen && <div className="pb-4 px-1">{children}</div>}
        </div>
    );
};

const PropertyPanel: React.FC = () => {
  const selection = useStore(state => state.selection);
  const components = useStore(state => state.components);
  const updateComponent = useStore(state => state.updateComponent);
  const removeComponent = useStore(state => state.removeComponent);
  const zones = useStore(state => state.zones);
  const updateZone = useStore(state => state.updateZone);
  const removeZone = useStore(state => state.removeZone);
  const setSelection = useStore(state => state.setSelection);
  const stackup = useStore(state => state.stackup);
  const setStackup = useStore(state => state.setStackup);
  const detailedStackup = useStore(state => state.detailedStackup);
  const setDetailedStackup = useStore(state => state.setDetailedStackup);
  const updateStackupLayer = useStore(state => state.updateStackupLayer);
  const ambientTemperature = useStore(state => state.ambientTemperature);
  const setAmbientTemperature = useStore(state => state.setAmbientTemperature);
  const globalMaxTemperature = useStore(state => state.globalMaxTemperature);
  const setGlobalMaxTemperature = useStore(state => state.setGlobalMaxTemperature);
  const manualHeatmapMaxTemperatureC = useStore(state => state.manualHeatmapMaxTemperatureC);
  const setManualHeatmapMaxTemperatureC = useStore(state => state.setManualHeatmapMaxTemperatureC);
  const heatmapViewMode = useStore(state => state.heatmapViewMode);
  const setHeatmapViewMode = useStore(state => state.setHeatmapViewMode);
  const bottomImageOffset = useStore(state => state.bottomImageOffset);
  const setBottomImageOffset = useStore(state => state.setBottomImageOffset);
  const bottomImageRotation = useStore(state => state.bottomImageRotation);
  const setBottomImageRotation = useStore(state => state.setBottomImageRotation);
  const bottomImageMirrorX = useStore(state => state.bottomImageMirrorX);
  const setBottomImageMirrorX = useStore(state => state.setBottomImageMirrorX);
  const bottomImageMirrorY = useStore(state => state.bottomImageMirrorY);
  const setBottomImageMirrorY = useStore(state => state.setBottomImageMirrorY);
  const heatmapResult = useStore(state => state.heatmapResult);
  const heatmapOpacity = useStore(state => state.heatmapOpacity);
  const setHeatmapOpacity = useStore(state => state.setHeatmapOpacity);
  const showGrid = useStore(state => state.showGrid);
  const setShowGrid = useStore(state => state.setShowGrid);
  const showConductivityMap = useStore(state => state.showConductivityMap);
  const setShowConductivityMap = useStore(state => state.setShowConductivityMap);
  const debugPointerEvents = useStore(state => state.debugPointerEvents);
  const setDebugPointerEvents = useStore(state => state.setDebugPointerEvents);
  const stageRef = useStore(state => state.stageRef);

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

  const hottestCompInfo = useMemo(() => {
    if (!heatmapResult) return null;
    let hottest = null;
    let maxT = -1;
    for (const j of heatmapResult.junctions) {
        const currentT = j.tj ?? j.tPcb;
        if (currentT > maxT) {
            maxT = currentT;
            hottest = components.find(c => c.id === j.compId);
        }
    }
    return hottest ? { name: hottest.name, temp: maxT.toFixed(1) } : null;
  }, [heatmapResult, components]);

  const kXY = useMemo(() => calculateStackupKXY(detailedStackup), [detailedStackup]);
  const kZ = useMemo(() => calculateStackupKZ(detailedStackup), [detailedStackup]);
  const totalThicknessUm = useMemo(() => detailedStackup.layers.reduce((acc, l) => acc + l.thicknessUm, 0), [detailedStackup]);
  const estimatedK = useMemo(() => estimateBaseConductivity(stackup, detailedStackup), [stackup, detailedStackup]);

  return (
    <div className="flex-none w-72 bg-gray-100 border-l border-gray-300 h-full overflow-y-auto flex flex-col">
      <div className="p-4 flex-1">
        <Accordion title="Selected Object" icon={<Info size={16} />} defaultOpen={true}>
            {!selectedComp && !selectedZone ? (
                <p className="text-gray-500 italic text-xs p-2">No object selected. Click a component or zone to edit.</p>
            ) : selectedComp ? (
            <div className="space-y-4 p-2 bg-white rounded border border-gray-200">
            <div className="flex justify-between items-center">
                <h3 className="font-bold text-xs text-blue-600">Component: {selectedComp.name}</h3>
                <button
                    onClick={() => removeComponent(selectedComp.id)}
                    className="text-red-500 hover:text-red-700"
                >
                    <Trash2 size={16} />
                </button>
            </div>
            <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase">Name</label>
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

            <div className="grid grid-cols-2 gap-2">
                <div>
                    <label className="block text-xs font-medium text-gray-700">Max Temp (°C)</label>
                    <input
                    type="number"
                    value={selectedComp.maxTemperature || 125}
                    onChange={(e) => updateComponent(selectedComp.id, { maxTemperature: parseFloat(e.target.value) || 0 })}
                    className="mt-1 block w-full rounded border-gray-300 shadow-sm sm:text-xs p-1 border"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-700">Side</label>
                    <select
                        value={selectedComp.side || 'top'}
                        onChange={(e) => updateComponent(selectedComp.id, { side: e.target.value as 'top' | 'bottom' })}
                        className="mt-1 block w-full rounded border-gray-300 shadow-sm sm:text-xs p-1 border"
                    >
                        <option value="top">Top</option>
                        <option value="bottom">Bottom</option>
                    </select>
                </div>
            </div>


            <div className="pt-2 border-t border-gray-100">
                <p className="text-[10px] text-gray-400 uppercase font-bold">Position</p>
                <p className="text-[10px] text-gray-600 font-mono">{selectedComp.x.toFixed(1)}mm, {selectedComp.y.toFixed(1)}mm</p>
            </div>
            </div>
            ) : selectedZone ? (
                <div className="space-y-4 p-2 bg-white rounded border border-gray-200">
                    <div className="flex justify-between items-center">
                        <h3 className="font-bold text-xs text-orange-600">Zone: {selectedZone.label}</h3>
                        {selectedZone.deletable && (
                            <button
                                onClick={() => removeZone(selectedZone.id)}
                                className="text-red-500 hover:text-red-700"
                            >
                                <Trash2 size={16} />
                            </button>
                        )}
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase">Label</label>
                        <input
                            type="text"
                            value={selectedZone.label}
                            onChange={(e) => updateZone(selectedZone.id, { label: e.target.value })}
                            className="mt-1 block w-full rounded border-gray-300 shadow-sm sm:text-xs p-1 border"
                        />
                    </div>
                    {selectedZone.type === 'conductivityZone' && (
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase">Conductivity (W/mK)</label>
                            <input
                                type="number"
                                value={selectedZone.conductivity ?? 50}
                                onChange={(e) => updateZone(selectedZone.id, { conductivity: parseFloat(e.target.value) || 0 })}
                                className="mt-1 block w-full rounded border-gray-300 shadow-sm sm:text-xs p-1 border"
                            />
                        </div>
                    )}
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="zone-enabled"
                            checked={selectedZone.enabled}
                            onChange={(e) => updateZone(selectedZone.id, { enabled: e.target.checked })}
                        />
                        <label htmlFor="zone-enabled" className="text-xs font-medium text-gray-700">Enabled</label>
                    </div>
                </div>
            ) : null}
        </Accordion>

        <Accordion title="Simulation Results" icon={<Thermometer size={16} />} defaultOpen={!!junctionData}>
            {!heatmapResult ? (
                <p className="text-gray-500 italic text-xs p-2">Run simulation to see results.</p>
            ) : (
                <div className="space-y-4">
                    {junctionData && (
                        <div className="p-2 bg-blue-50 rounded border border-blue-100 space-y-2">
                            <div className="flex justify-between items-center">
                                <h4 className="text-[10px] font-bold text-blue-700 uppercase">Selected: {selectedComp?.name}</h4>
                                <span className="text-[9px] bg-blue-200 text-blue-800 px-1 rounded font-bold uppercase">{selectedComp?.side || 'top'}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
                                <span className="text-gray-500">Tpcb ({selectedComp?.side || 'top'}):</span>
                                <span className="text-right font-mono">{junctionData.tPcb.toFixed(1)}°C</span>

                                <span className="text-gray-500">RθPCB:</span>
                                <span className="text-right font-mono">{selectedComp!.power > 0 ? junctionData.rThetaPcb.toFixed(2) + ' K/W' : 'N/A'}</span>

                                <span className="text-gray-500 font-bold">Tj:</span>
                                <span className={`text-right font-bold font-mono ${junctionData.isOverLimit ? 'text-red-600' : 'text-green-600'}`}>
                                    {junctionData.tj?.toFixed(1) ?? 'N/A'}°C
                                </span>

                                <span className="text-gray-500">Utilization:</span>
                                <span className={`text-right font-bold font-mono ${
                                    !junctionData.ratingPercent ? 'text-gray-400' :
                                    junctionData.ratingPercent > 100 ? 'text-red-600 animate-pulse' :
                                    junctionData.ratingPercent > 90 ? 'text-red-600' :
                                    junctionData.ratingPercent > 70 ? 'text-orange-500' :
                                    'text-green-600'
                                }`}>
                                    {junctionData.ratingPercent ? junctionData.ratingPercent.toFixed(1) + '%' : 'N/A'}
                                </span>
                            </div>
                        </div>
                    )}
                    <div className="p-2 bg-white rounded border border-gray-200 space-y-1">
                         <h4 className="text-[10px] font-bold text-gray-500 uppercase">Global</h4>
                         <div className="grid grid-cols-2 gap-x-2 text-xs">
                            <span className="text-gray-500">Max Temp:</span>
                            <span className="text-right font-mono font-bold text-red-600">{heatmapResult.maxTemp.toFixed(1)}°C</span>
                            {hottestCompInfo && (
                                <>
                                    <span className="text-gray-500">Hottest Comp:</span>
                                    <span className="text-right font-bold text-red-500">{hottestCompInfo.name}</span>
                                </>
                            )}
                            <span className="text-gray-500">Iterations:</span>
                            <span className="text-right font-mono">{heatmapResult.iterations}</span>
                         </div>
                    </div>
                </div>
            )}
        </Accordion>

        <Accordion title="Heatmap View" icon={<Palette size={16} />} defaultOpen={true}>
            <div className="space-y-3">
                <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">View Mode</label>
                    <div className="grid grid-cols-2 gap-1">
                        {[
                            { id: 'top', label: 'Top' },
                            { id: 'bottom', label: 'Bottom' },
                            { id: 'max', label: 'Max T/B' },
                            { id: 'difference', label: 'Delta T' },
                            { id: 'align', label: 'Alignment' }
                        ].map(mode => (
                            <button
                                key={mode.id}
                                onClick={() => setHeatmapViewMode(mode.id as any)}
                                className={`px-2 py-1 text-[10px] font-bold rounded border transition-colors ${
                                    heatmapViewMode === mode.id
                                        ? 'bg-blue-600 text-white border-blue-600'
                                        : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                                }`}
                            >
                                {mode.label}
                            </button>
                        ))}
                    </div>
                </div>

                {heatmapViewMode === 'align' && (
                    <div className="p-2 bg-orange-50 rounded border border-orange-200">
                        <div className="text-[10px] font-bold text-orange-700 mb-2 uppercase">Image Alignment (Bottom)</div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-[9px] text-gray-500 block">Offset X (mm)</label>
                                <input type="number" step="0.1" value={bottomImageOffset.x} onChange={(e) => setBottomImageOffset({...bottomImageOffset, x: parseFloat(e.target.value) || 0})} className="w-full bg-white text-gray-800 text-[10px] px-2 py-1 rounded border border-gray-300" />
                            </div>
                            <div>
                                <label className="text-[9px] text-gray-500 block">Offset Y (mm)</label>
                                <input type="number" step="0.1" value={bottomImageOffset.y} onChange={(e) => setBottomImageOffset({...bottomImageOffset, y: parseFloat(e.target.value) || 0})} className="w-full bg-white text-gray-800 text-[10px] px-2 py-1 rounded border border-gray-300" />
                            </div>
                            <div className="col-span-2">
                                <label className="text-[9px] text-gray-500 block">Rotation (deg)</label>
                                <input type="number" step="0.5" value={bottomImageRotation} onChange={(e) => setBottomImageRotation(parseFloat(e.target.value) || 0)} className="w-full bg-white text-gray-800 text-[10px] px-2 py-1 rounded border border-gray-300" />
                            </div>
                            <div className="flex items-center gap-4 col-span-2 mt-1">
                                <label className="flex items-center gap-1 cursor-pointer">
                                    <input type="checkbox" checked={bottomImageMirrorX} onChange={(e) => setBottomImageMirrorX(e.target.checked)} className="rounded text-blue-600" />
                                    <span className="text-[9px] text-gray-600 font-bold uppercase">Mirror X</span>
                                </label>
                                <label className="flex items-center gap-1 cursor-pointer">
                                    <input type="checkbox" checked={bottomImageMirrorY} onChange={(e) => setBottomImageMirrorY(e.target.checked)} className="rounded text-blue-600" />
                                    <span className="text-[9px] text-gray-600 font-bold uppercase">Mirror Y</span>
                                </label>
                            </div>
                        </div>
                        <div className="text-[8px] text-gray-500 mt-2 italic text-center">Hint: Drag bottom image in canvas to align</div>
                    </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <label className="text-xs font-medium text-gray-700">Auto Scale</label>
                    <input
                        type="checkbox"
                        checked={manualHeatmapMaxTemperatureC === null}
                        onChange={(e) => setManualHeatmapMaxTemperatureC(e.target.checked ? null : (heatmapResult?.maxTemp || 100))}
                    />
                </div>
                {manualHeatmapMaxTemperatureC !== null && (
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase">Manual Max (°C)</label>
                        <input
                            type="number"
                            value={manualHeatmapMaxTemperatureC}
                            onChange={(e) => setManualHeatmapMaxTemperatureC(parseFloat(e.target.value) || 0)}
                            className="mt-1 block w-full rounded border-gray-300 shadow-sm sm:text-xs p-1 border"
                        />
                    </div>
                )}
                <div className="pt-2 border-t border-gray-200">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase">Opacity</label>
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={heatmapOpacity}
                        onChange={(e) => setHeatmapOpacity(parseFloat(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer mt-2"
                    />
                </div>
            </div>
        </Accordion>

        <Accordion title="Thermal Engine" icon={<Settings size={16} />}>
            <div className="space-y-4">
                <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase">Ambient Temp (°C)</label>
                    <input
                        type="number"
                        value={ambientTemperature}
                        onChange={(e) => setAmbientTemperature(parseFloat(e.target.value) || 0)}
                        className="mt-1 block w-full rounded border-gray-300 shadow-sm sm:text-xs p-1 border"
                    />
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase">Base Conductivity</label>
                    <select
                        value={stackup.baseConductivityMode}
                        onChange={(e) => setStackup({ baseConductivityMode: e.target.value as any })}
                        className="mt-1 block w-full rounded border-gray-300 shadow-sm sm:text-xs p-1 border"
                    >
                        <option value="manual">Manual Override</option>
                        <option value="stackup">From Stackup (kXY)</option>
                    </select>
                </div>
                {stackup.baseConductivityMode === 'manual' && (
                    <div className="space-y-3 p-2 bg-white rounded border border-gray-200">
                        <h4 className="text-[10px] font-bold text-gray-400 uppercase">Legacy Parameters</h4>
                        <div>
                            <label className="block text-[10px] font-medium text-gray-500 uppercase">Thickness (mm)</label>
                            <input
                                type="number"
                                value={stackup.boardThicknessMm}
                                step="0.1"
                                onChange={(e) => setStackup({ boardThicknessMm: parseFloat(e.target.value) || 0.1 })}
                                className="mt-1 block w-full rounded border-gray-300 shadow-sm sm:text-[10px] p-1 border"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-[10px] font-medium text-gray-500 uppercase">Layers</label>
                                <input
                                    type="number"
                                    value={stackup.layerCount}
                                    onChange={(e) => setStackup({ layerCount: parseInt(e.target.value) || 1 })}
                                    className="mt-1 block w-full rounded border-gray-300 shadow-sm sm:text-[10px] p-1 border"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-medium text-gray-500 uppercase">Weight (oz)</label>
                                <input
                                    type="number"
                                    value={stackup.copperOzPerLayer}
                                    step="0.5"
                                    onChange={(e) => setStackup({ copperOzPerLayer: parseFloat(e.target.value) || 0.5 })}
                                    className="mt-1 block w-full rounded border-gray-300 shadow-sm sm:text-[10px] p-1 border"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-medium text-gray-500 uppercase">Avg Coverage (%)</label>
                            <input
                                type="number"
                                value={stackup.estimatedCopperCoveragePercent}
                                onChange={(e) => setStackup({ estimatedCopperCoveragePercent: parseFloat(e.target.value) || 0 })}
                                className="mt-1 block w-full rounded border-gray-300 shadow-sm sm:text-[10px] p-1 border"
                            />
                        </div>
                        <div className="pt-1 border-t border-gray-100 flex justify-between items-center">
                            <span className="text-[10px] text-gray-400 font-bold uppercase">Manual k_eff</span>
                            <span className="text-[10px] font-mono font-bold text-gray-600">{estimatedK.toFixed(2)} W/mK</span>
                        </div>
                    </div>
                )}
            </div>
        </Accordion>

        <Accordion title="Stackup Settings" icon={<Layers size={16} />}>
            <div className="space-y-4">
                <div className="flex gap-1 flex-wrap">
                    {Object.keys(STACKUP_PRESETS).map(key => (
                        <button
                            key={key}
                            onClick={() => setDetailedStackup(STACKUP_PRESETS[key])}
                            className="text-[10px] bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded transition-colors"
                        >
                            {key}
                        </button>
                    ))}
                </div>

                <div className="max-h-60 overflow-y-auto border border-gray-200 rounded">
                    <table className="w-full text-[10px]">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="text-left p-1">Layer</th>
                                <th className="text-right p-1">T (µm)</th>
                                <th className="text-right p-1">Cov%</th>
                            </tr>
                        </thead>
                        <tbody>
                            {detailedStackup.layers.map(layer => (
                                <tr key={layer.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                                    <td className="p-1 truncate max-w-[80px]" title={layer.name}>{layer.name}</td>
                                    <td className="p-1 text-right">
                                        <input
                                            type="number"
                                            value={layer.thicknessUm}
                                            onChange={(e) => updateStackupLayer(layer.id, { thicknessUm: parseFloat(e.target.value) || 0 })}
                                            className="w-12 text-right border-none bg-transparent p-0"
                                        />
                                    </td>
                                    <td className="p-1 text-right">
                                        {layer.type === 'copper' ? (
                                            <input
                                                type="number"
                                                value={layer.copperCoveragePercent || 0}
                                                onChange={(e) => updateStackupLayer(layer.id, { copperCoveragePercent: parseFloat(e.target.value) || 0 })}
                                                className="w-10 text-right border-none bg-transparent p-0"
                                            />
                                        ) : '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="bg-blue-50 p-2 rounded border border-blue-100 space-y-1">
                    <div className="flex justify-between items-center text-[10px]">
                        <span className="text-blue-600 font-bold uppercase">kXY (In-plane)</span>
                        <span className="font-mono font-bold text-blue-800">{kXY.toFixed(2)} W/mK</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px]">
                        <span className="text-blue-600 font-bold uppercase">kZ (Through)</span>
                        <span className="font-mono font-bold text-blue-800">{kZ.toFixed(2)} W/mK</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px]">
                        <span className="text-blue-600 font-bold uppercase">Total Thickness</span>
                        <span className="font-mono font-bold text-blue-800">{(totalThicknessUm / 1000).toFixed(2)} mm</span>
                    </div>
                    <p className="text-[9px] text-blue-400 italic mt-1 leading-tight">Approximate stackup-based effective conductivity estimates.</p>
                </div>
            </div>
        </Accordion>

        <Accordion title="Debug Settings" icon={<Bug size={16} />}>
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-gray-700">Show Solver Grid</label>
                    <input
                        type="checkbox"
                        checked={showGrid}
                        onChange={(e) => setShowGrid(e.target.checked)}
                    />
                </div>
                <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-gray-700">Conductivity Map</label>
                    <input
                        type="checkbox"
                        checked={showConductivityMap}
                        onChange={(e) => setShowConductivityMap(e.target.checked)}
                    />
                </div>
                <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-gray-700">Debug Pointers</label>
                    <input
                        type="checkbox"
                        checked={debugPointerEvents}
                        onChange={(e) => setDebugPointerEvents(e.target.checked)}
                    />
                </div>
                {heatmapResult && (
                    <div className="pt-2 border-t border-gray-200 text-[10px] font-mono text-gray-500">
                        <div>Grid: {heatmapResult.width}x{heatmapResult.height}</div>
                        <div>Boundary: {zones.find(z => z.type === 'pcbBoundary')?.points.length || 0} pts</div>
                    </div>
                )}
            </div>
        </Accordion>
      </div>

      <div className="p-4 border-t border-gray-300 bg-white">
          <button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded flex items-center justify-center gap-2 transition-colors text-sm shadow-md"
            onClick={() => {
                if (stageRef) {
                    const dataURL = stageRef.toDataURL({ pixelRatio: 2 });
                    const link = document.createElement('a');
                    const date = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16);
                    link.download = `pcb-thermal-${heatmapViewMode}-${date}.png`;
                    link.href = dataURL;
                    link.click();
                } else {
                    alert("Export failed: Stage not found.");
                }
            }}
          >
              <Download size={18} />
              Export Image
          </button>
      </div>
    </div>
  );
};

export default PropertyPanel;

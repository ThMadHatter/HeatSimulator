import React from 'react';
import { useStore } from '../store/useStore';
import { Eye, EyeOff, Lock, Unlock, Layers } from 'lucide-react';

export const LayerManager: React.FC = () => {
    const layers = useStore(state => state.layers);
    const setLayerState = useStore(state => state.setLayerState);

    const layerConfig = [
        { id: 'heatmap', label: 'Heatmap', key: 'heatmap' },
        { id: 'components', label: 'Components', key: 'components' },
        { id: 'zones', label: 'Conductivity Zones', key: 'zones' },
        { id: 'boundary', label: 'PCB Boundary', key: 'boundary' },
        { id: 'grid', label: 'Solver Grid', key: 'grid' },
    ];

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mt-4">
            <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 flex items-center gap-2">
                <Layers size={14} className="text-gray-500" />
                <h3 className="text-[10px] font-bold text-gray-700 uppercase tracking-wider">Layers</h3>
            </div>
            <div className="p-1 space-y-0.5">
                {layerConfig.map(layer => {
                    const state = layers[layer.key as keyof typeof layers];
                    return (
                        <div key={layer.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded group">
                            <span className="text-[11px] font-medium text-gray-700 flex-1 truncate">{layer.label}</span>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setLayerState(layer.key as any, { visible: !state.visible })}
                                    className={`p-1 rounded hover:bg-gray-200 transition-colors ${state.visible ? 'text-blue-500' : 'text-gray-300'}`}
                                    title={state.visible ? "Hide" : "Show"}
                                >
                                    {state.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                                </button>
                                <button
                                    onClick={() => setLayerState(layer.key as any, { locked: !state.locked })}
                                    className={`p-1 rounded hover:bg-gray-200 transition-colors ${state.locked ? 'text-orange-500' : 'text-gray-300'}`}
                                    title={state.locked ? "Unlock" : "Lock"}
                                >
                                    {state.locked ? <Lock size={14} /> : <Unlock size={14} />}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

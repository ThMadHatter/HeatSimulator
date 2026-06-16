import React from 'react';
import { useStore } from '../store/useStore';
import { MousePointer2, Ruler, Maximize2, Thermometer, Box, Target } from 'lucide-react';

export const StatusBar: React.FC = () => {
    const mode = useStore(state => state.mode);
    const heatmapViewMode = useStore(state => state.heatmapViewMode);
    const navigation = useStore(state => state.navigation);
    const selection = useStore(state => state.selection);
    const heatmapResult = useStore(state => state.heatmapResult);

    const getModeIcon = () => {
        switch (mode) {
            case 'select': return <MousePointer2 size={12} />;
            case 'calibrate': return <Ruler size={12} />;
            case 'drawBoundary':
            case 'drawZone': return <Target size={12} />;
            case 'addComponent': return <Box size={12} />;
            default: return null;
        }
    };

    return (
        <div className="h-6 bg-gray-900 text-white flex items-center px-3 text-[10px] font-mono border-t border-white/10 select-none">
            <div className="flex items-center gap-4 flex-1">
                <div className="flex items-center gap-1.5 border-r border-white/10 pr-4 h-4">
                    <span className="text-gray-500 uppercase font-bold">Tool:</span>
                    <div className="flex items-center gap-1 text-blue-400 font-bold uppercase">
                        {getModeIcon()}
                        {mode}
                    </div>
                </div>

                <div className="flex items-center gap-1.5 border-r border-white/10 pr-4 h-4">
                    <span className="text-gray-500 uppercase font-bold">View:</span>
                    <div className="flex items-center gap-1 text-orange-400 font-bold uppercase">
                        <Maximize2 size={12} />
                        {heatmapViewMode}
                    </div>
                </div>

                <div className="flex items-center gap-1.5 border-r border-white/10 pr-4 h-4">
                    <span className="text-gray-500 uppercase font-bold">Pos:</span>
                    <span className="text-green-400">
                        {navigation.cursorMm ? `${navigation.cursorMm.x.toFixed(1)}, ${navigation.cursorMm.y.toFixed(1)} mm` : '--, -- mm'}
                    </span>
                </div>

                <div className="flex items-center gap-1.5 border-r border-white/10 pr-4 h-4">
                    <span className="text-gray-500 uppercase font-bold">Selection:</span>
                    <span className="text-purple-400 truncate max-w-[150px]">
                        {selection ? `${selection.type}${selection.type === 'polygon' ? ` (${(selection as any).shapeType})` : ''}` : 'None'}
                    </span>
                </div>
            </div>

            <div className="flex items-center gap-4">
                {heatmapResult && (
                    <div className="flex items-center gap-1.5 border-l border-white/10 pl-4 h-4">
                        <Thermometer size={12} className="text-red-500" />
                        <span className="text-gray-500 uppercase font-bold">Max:</span>
                        <span className="text-red-400 font-bold">{heatmapResult.maxTemp.toFixed(1)}°C</span>
                    </div>
                )}
                <div className="flex items-center gap-1.5 border-l border-white/10 pl-4 h-4">
                    <span className="text-gray-500 uppercase font-bold">Zoom:</span>
                    <span className="text-white font-bold">{Math.round(navigation.zoom * 100)}%</span>
                </div>
            </div>
        </div>
    );
};

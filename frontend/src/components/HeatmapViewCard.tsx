import React from 'react';
import { useStore } from '../store/useStore';
import { DraggableCard } from './DraggableCard';
import { Palette, X } from 'lucide-react';

export const HeatmapViewCard: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const {
    heatmapViewMode, setHeatmapViewMode,
    manualHeatmapMaxTemperatureC, setManualHeatmapMaxTemperatureC,
    heatmapOpacity, setHeatmapOpacity,
    heatmapResult,
    bottomImageOffset, setBottomImageOffset,
    bottomImageRotation, setBottomImageRotation,
    bottomImageMirrorX, setBottomImageMirrorX,
    bottomImageMirrorY, setBottomImageMirrorY
  } = useStore();

  return (
    <DraggableCard
      id="heatmap-view-card"
      title="Heatmap View"
      initialPosition={{ x: window.innerWidth - 300, y: 400 }}
    >
      <div className="space-y-3 p-1">
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
            <div className="text-[10px] font-bold text-orange-700 mb-2 uppercase">Alignment (Bottom)</div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[9px] text-gray-500 block">X (mm)</label>
                <input type="number" step="0.1" value={bottomImageOffset.x} onChange={(e) => setBottomImageOffset({...bottomImageOffset, x: parseFloat(e.target.value) || 0})} className="w-full bg-white text-gray-800 text-[10px] px-2 py-1 rounded border border-gray-300" />
              </div>
              <div>
                <label className="text-[9px] text-gray-500 block">Y (mm)</label>
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
    </DraggableCard>
  );
};

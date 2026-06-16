import React from 'react';
import { useStore } from '../store/useStore';
import { Trash2, Square, Circle, ArrowUpCircle, ArrowDownCircle, Zap } from 'lucide-react';

interface SelectionPopoverProps {
  stageScale: number;
  stageOffset: { x: number, y: number };
}

export const SelectionPopover: React.FC<SelectionPopoverProps> = ({ stageScale, stageOffset }) => {
  const { selection, components, zones, updateComponent, removeComponent, removeZone, updateZone, setSelection, calibrationTop, calibrationBottom, calibration } = useStore();

  const baseCal = calibrationTop.mmPerPixel ? calibrationTop : (calibrationBottom.mmPerPixel ? calibrationBottom : calibration);
  const mmToPx = (mm: number) => baseCal.mmPerPixel ? mm / baseCal.mmPerPixel : mm;

  if (!selection) return null;

  let targetX = 0;
  let targetY = 0;
  let label = '';
  let isComponent = false;

  if (selection.type === 'component') {
    const comp = components.find(c => c.id === selection.id);
    if (!comp) return null;
    targetX = comp.x;
    targetY = comp.y - (comp.height / 2) - 5; // mm
    label = comp.name;
    isComponent = true;
  } else if (selection.type === 'polygon' || selection.type === 'polygonVertex') {
    const zone = zones.find(z => z.id === selection.id);
    if (!zone) return null;
    // Simple centroid for popover
    const minX = Math.min(...zone.points.map(p => p.x));
    const maxX = Math.max(...zone.points.map(p => p.x));
    const minY = Math.min(...zone.points.map(p => p.y));
    targetX = (minX + maxX) / 2;
    targetY = minY - 10;
    label = zone.label;
  }

  // Convert mm to screen
  const screenX = mmToPx(targetX) * stageScale + stageOffset.x;
  const screenY = mmToPx(targetY) * stageScale + stageOffset.y;

  return (
    <div
      className="absolute z-50 transform -translate-x-1/2 -translate-y-full pointer-events-auto"
      style={{ left: screenX, top: screenY - 10 }}
    >
      <div className="bg-white rounded-lg shadow-2xl border border-gray-200 flex items-center gap-1 p-1 whitespace-nowrap overflow-hidden">
        <div className="px-2 py-1 text-[10px] font-bold text-gray-500 border-r border-gray-100 uppercase mr-1">{label}</div>

        {isComponent && (
            <>
                <button
                    onClick={() => {
                        const comp = components.find(c => c.id === selection.id);
                        if (comp) updateComponent(comp.id, { shape: comp.shape === 'circle' ? 'rect' : 'circle' });
                    }}
                    className="p-1.5 hover:bg-gray-100 rounded text-gray-600 transition-colors"
                    title="Toggle Shape"
                >
                    {components.find(c => c.id === selection.id)?.shape === 'circle' ? <Square size={14} /> : <Circle size={14} />}
                </button>
                <button
                    onClick={() => {
                        const comp = components.find(c => c.id === selection.id);
                        if (comp) updateComponent(comp.id, { side: comp.side === 'bottom' ? 'top' : 'bottom' });
                    }}
                    className="p-1.5 hover:bg-gray-100 rounded text-gray-600 transition-colors"
                    title="Toggle Side"
                >
                    {components.find(c => c.id === selection.id)?.side === 'bottom' ? <ArrowUpCircle size={14} /> : <ArrowDownCircle size={14} />}
                </button>
            </>
        )}

        <button
            onClick={() => {
                if (selection.type === 'component') removeComponent(selection.id);
                else removeZone(selection.id);
            }}
            className="p-1.5 hover:bg-red-50 rounded text-red-500 transition-colors"
            title="Delete"
        >
            <Trash2 size={14} />
        </button>
      </div>
      <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-white mx-auto drop-shadow-sm"></div>
    </div>
  );
};

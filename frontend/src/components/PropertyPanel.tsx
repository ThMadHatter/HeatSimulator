import React from 'react';
import { useStore } from '../store/useStore';
import { Trash2 } from 'lucide-react';

const PropertyPanel: React.FC = () => {
  const { selectedComponentId, components, updateComponent, removeComponent, calibration } = useStore();
  const selectedComp = components.find((c) => c.id === selectedComponentId);

  if (!selectedComp) {
    return (
      <div className="w-64 bg-gray-100 p-4 border-l border-gray-300 h-full overflow-y-auto">
        <h2 className="text-lg font-bold mb-4">Properties</h2>
        <p className="text-gray-500 italic">Select a component to edit its properties.</p>

        {calibration.point1 && calibration.point2 && !calibration.mmPerPixel && (
            <div className="mt-8 p-3 bg-blue-50 border border-blue-200 rounded">
                <p className="text-sm text-blue-800">Calibration: Points selected. Please set distance in bottom panel.</p>
            </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-64 bg-gray-100 p-4 border-l border-gray-300 h-full overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold">Properties</h2>
        <button
          onClick={() => removeComponent(selectedComp.id)}
          className="text-red-500 hover:text-red-700"
        >
          <Trash2 size={20} />
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Name</label>
          <input
            type="text"
            value={selectedComp.name}
            onChange={(e) => updateComponent(selectedComp.id, { name: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Power (W)</label>
          <input
            type="number"
            value={selectedComp.power}
            onChange={(e) => updateComponent(selectedComp.id, { power: parseFloat(e.target.value) || 0 })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Spread (sigma, mm)</label>
          <input
            type="number"
            value={selectedComp.spread}
            step="0.1"
            onChange={(e) => updateComponent(selectedComp.id, { spread: parseFloat(e.target.value) || 0.1 })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
          />
        </div>

        <div className="pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500">Position: {selectedComp.x.toFixed(1)}mm, {selectedComp.y.toFixed(1)}mm</p>
        </div>
      </div>
    </div>
  );
};

export default PropertyPanel;

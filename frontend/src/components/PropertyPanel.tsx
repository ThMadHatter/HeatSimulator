import React from 'react';
import { useStore } from '../store/useStore';
import { Trash2, Settings } from 'lucide-react';

const PropertyPanel: React.FC = () => {
  const {
    selectedComponentId, components, updateComponent, removeComponent,
    ambientTemperature, setAmbientTemperature,
    defaultBoardSigma, setDefaultBoardSigma,
    globalMaxTemperature, setGlobalMaxTemperature
  } = useStore();

  const selectedComp = components.find((c) => c.id === selectedComponentId);

  return (
    <div className="w-64 bg-gray-100 p-4 border-l border-gray-300 h-full overflow-y-auto">
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
                <label className="block text-xs font-medium text-gray-700">Default Sigma (mm)</label>
                <input
                    type="number"
                    value={defaultBoardSigma}
                    onChange={(e) => setDefaultBoardSigma(parseFloat(e.target.value) || 0.1)}
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
                <label className="block text-xs font-medium text-gray-700">thetaJA (°C/W)</label>
                <input
                type="number"
                value={selectedComp.thetaJA || 0}
                onChange={(e) => updateComponent(selectedComp.id, { thetaJA: parseFloat(e.target.value) || 0 })}
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

            <div className="pt-2">
                <label className="block text-xs font-medium text-gray-700">Spread (sigma, mm)</label>
                <input
                type="number"
                value={selectedComp.spread}
                step="0.1"
                onChange={(e) => updateComponent(selectedComp.id, { spread: parseFloat(e.target.value) || 0.1 })}
                className="mt-1 block w-full rounded border-gray-300 shadow-sm sm:text-xs p-1 border"
                />
            </div>

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

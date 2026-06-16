import React from 'react';
import { useStore } from '../store/useStore';

const Controls: React.FC = () => {
  const {
    heatmapOpacity, setHeatmapOpacity,
    calibration, setCalibrationDistance, resetCalibration
  } = useStore();

  return (
    <div className="h-16 bg-gray-900 text-white flex items-center px-6 gap-8 shadow-inner z-20">
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium">Heatmap Opacity</label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={heatmapOpacity}
          onChange={(e) => setHeatmapOpacity(parseFloat(e.target.value))}
          className="w-32"
        />
        <span className="text-xs w-8">{(heatmapOpacity * 100).toFixed(0)}%</span>
      </div>

      {calibration.point1 && calibration.point2 && (
        <div className="flex items-center gap-3 ml-auto border-l border-gray-700 pl-8">
          <label className="text-sm font-medium text-blue-400">Calibration Distance (mm)</label>
          <input
            type="number"
            value={calibration.distanceMm}
            onChange={(e) => setCalibrationDistance(parseFloat(e.target.value) || 0)}
            className="w-20 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm"
          />
          <button
            onClick={() => resetCalibration()}
            className="text-xs text-red-400 hover:text-red-300 underline"
          >
            Reset
          </button>
        </div>
      )}

      {calibration.mmPerPixel && (
          <div className="text-xs text-green-400 ml-4">
              Scale: {(1/calibration.mmPerPixel).toFixed(2)} px/mm
          </div>
      )}
    </div>
  );
};

export default Controls;

import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';

interface CalibrationInputProps {
  p1: { x: number; y: number };
  p2: { x: number; y: number };
  stageScale: number;
  stageOffset: { x: number, y: number };
}

export const CalibrationInput: React.FC<CalibrationInputProps> = ({ p1, p2, stageScale, stageOffset }) => {
  const { setCalibrationDistance, setMode } = useStore();
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Calculate midpoint in screen coordinates
  // p1 and p2 are in "node" coordinates (Layer coordinates)
  // We need to convert them to screen coordinates to place the HTML input
  const midX = (p1.x + p2.x) / 2;
  const midY = (p1.y + p2.y) / 2;

  // Manual transform to screen px
  const screenX = midX * stageScale + stageOffset.x;
  const screenY = midY * stageScale + stageOffset.y;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dist = parseFloat(value);
    if (!isNaN(dist) && dist > 0) {
      setCalibrationDistance(dist);
      setMode('select');
    }
  };

  return (
    <div
      className="absolute z-50 transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
      style={{ left: screenX, top: screenY }}
    >
      <form onSubmit={handleSubmit} className="flex flex-col items-center gap-1 bg-white p-2 rounded shadow-xl border border-blue-500">
        <label className="text-[10px] font-bold text-blue-600 uppercase">Enter Distance (mm)</label>
        <div className="flex gap-1">
          <input
            ref={inputRef}
            type="number"
            step="0.1"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-20 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="e.g. 50"
            onKeyDown={(e) => {
                if (e.key === 'Escape') setMode('select');
            }}
          />
          <button
            type="submit"
            className="bg-blue-600 text-white text-[10px] px-2 py-1 rounded font-bold hover:bg-blue-700"
          >
            OK
          </button>
        </div>
      </form>
    </div>
  );
};

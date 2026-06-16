import React from 'react';
import { ZoomIn, ZoomOut, Maximize, RotateCcw } from 'lucide-react';

interface NavigationControlsProps {
    zoom: number;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onFit: () => void;
    onReset: () => void;
}

export const NavigationControls: React.FC<NavigationControlsProps> = ({ zoom, onZoomIn, onZoomOut, onFit, onReset }) => {
    return (
        <div className="flex items-center gap-1 bg-white/90 p-1 rounded-lg shadow-lg border border-gray-200 backdrop-blur-sm">
            <button
                onClick={onZoomOut}
                className="p-2 hover:bg-gray-100 rounded text-gray-700 transition-colors"
                title="Zoom Out"
            >
                <ZoomOut size={18} />
            </button>
            <div className="px-2 min-w-[50px] text-center font-mono text-xs font-bold text-gray-600" data-testid="zoom-display">
                {Math.round(zoom * 100)}%
            </div>
            <button
                onClick={onZoomIn}
                className="p-2 hover:bg-gray-100 rounded text-gray-700 transition-colors"
                title="Zoom In"
            >
                <ZoomIn size={18} />
            </button>
            <div className="w-px h-4 bg-gray-300 mx-1" />
            <button
                onClick={onFit}
                className="p-2 hover:bg-gray-100 rounded text-gray-700 transition-colors"
                title="Fit to Screen (F)"
            >
                <Maximize size={18} />
            </button>
            <button
                onClick={onReset}
                className="p-2 hover:bg-gray-100 rounded text-gray-700 transition-colors"
                title="Reset Zoom (Ctrl+1)"
            >
                <RotateCcw size={18} />
            </button>
        </div>
    );
};

import React, { useMemo } from 'react';
import { useStore } from '../store/useStore';
import { CheckCircle2, Circle, AlertCircle, ChevronRight } from 'lucide-react';

export const GettingStarted: React.FC = () => {
    const {
        imageTop,
        calibrationTop,
        zones,
        components,
        heatmapResult,
        setMode
    } = useStore();

    const steps = useMemo(() => [
        {
            id: 'import',
            label: 'Import PCB Image',
            completed: !!imageTop,
            action: () => {}
        },
        {
            id: 'calibrate',
            label: 'Calibrate Scale',
            completed: !!calibrationTop.mmPerPixel,
            warning: !!imageTop && !calibrationTop.mmPerPixel,
            action: () => setMode('calibrate')
        },
        {
            id: 'boundary',
            label: 'Define PCB Boundary',
            completed: zones.some(z => z.type === 'pcbBoundary'),
            warning: !!calibrationTop.mmPerPixel && !zones.some(z => z.type === 'pcbBoundary'),
            action: () => setMode('drawBoundary')
        },
        {
            id: 'components',
            label: 'Add Components',
            completed: components.length > 0,
            warning: zones.some(z => z.type === 'pcbBoundary') && components.length === 0,
            action: () => setMode('addComponent')
        },
        {
            id: 'simulate',
            label: 'Run Simulation',
            completed: !!heatmapResult,
            action: () => {}
        }
    ], [imageTop, calibrationTop, zones, components, heatmapResult, setMode]);

    const progress = Math.round((steps.filter(s => s.completed).length / steps.length) * 100);

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-4">
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Getting Started</h3>
                <span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">{progress}%</span>
            </div>
            <div className="p-2 space-y-1">
                {steps.map(step => (
                    <button
                        key={step.id}
                        onClick={step.action}
                        disabled={step.completed}
                        className={`w-full flex items-center gap-3 p-2 rounded text-left transition-colors ${
                            step.completed ? 'opacity-50 cursor-default' : 'hover:bg-gray-50'
                        }`}
                    >
                        {step.completed ? (
                            <CheckCircle2 size={16} className="text-green-500 shrink-0" />
                        ) : step.warning ? (
                            <AlertCircle size={16} className="text-orange-500 shrink-0 animate-pulse" />
                        ) : (
                            <Circle size={16} className="text-gray-300 shrink-0" />
                        )}
                        <span className={`text-xs flex-1 ${step.completed ? 'text-gray-500 line-through' : 'font-medium text-gray-700'}`}>
                            {step.label}
                        </span>
                        {!step.completed && step.id !== 'import' && step.id !== 'simulate' && (
                            <ChevronRight size={14} className="text-gray-400" />
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
};

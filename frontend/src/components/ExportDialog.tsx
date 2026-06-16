import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { X, Download, ImageIcon, Layout, Thermometer, Box, Grid3X3, Flag } from 'lucide-react';

interface ExportDialogProps {
    onClose: () => void;
}

export const ExportDialog: React.FC<ExportDialogProps> = ({ onClose }) => {
    const { stageRef, heatmapViewMode } = useStore();
    const [resolution, setResolution] = useState(2);
    const [options, setOptions] = useState({
        includePCB: true,
        includeHeatmap: true,
        includeLegend: true,
        includeHotspots: true,
        includeLabels: true,
        includeGrid: false,
        includeBoundary: true,
    });

    const handleExport = () => {
        if (!stageRef) return;

        // Helper to safely set visibility and return original
        const setVisibility = (selector: string, visible: boolean) => {
            const nodes = stageRef.find(selector);
            const originals = nodes.map(n => n.visible());
            nodes.forEach(n => n.visible(visible));
            return originals;
        };

        const restoreVisibility = (selector: string, originals: boolean[]) => {
            const nodes = stageRef.find(selector);
            nodes.forEach((n, i) => n.visible(originals[i]));
        };

        // Prepare stage for export
        const origTop = setVisibility('.PCB_IMAGE_TOP', options.includePCB);
        const origBot = setVisibility('.PCB_IMAGE_BOTTOM', options.includePCB);
        const origHeat = setVisibility('Image', options.includeHeatmap);
        const origHot = setVisibility('.HOTSPOTS', options.includeHotspots);
        const origLabels = setVisibility('Text', options.includeLabels);
        const origGrid = setVisibility('.SOLVER_GRID', options.includeGrid);
        const origBoundary = setVisibility('.GEOMETRY', options.includeBoundary);

        // Perform export
        const date = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16);
        const fileName = `pcb-thermal-${heatmapViewMode}-${date}.png`;

        const dataURL = stageRef.toDataURL({
            pixelRatio: resolution,
            mimeType: 'image/png',
        });

        // Restore
        restoreVisibility('.PCB_IMAGE_TOP', origTop);
        restoreVisibility('.PCB_IMAGE_BOTTOM', origBot);
        restoreVisibility('Image', origHeat);
        restoreVisibility('.HOTSPOTS', origHot);
        restoreVisibility('Text', origLabels);
        restoreVisibility('.SOLVER_GRID', origGrid);
        restoreVisibility('.GEOMETRY', origBoundary);

        const link = document.createElement('a');
        link.download = fileName;
        link.href = dataURL;
        link.click();
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-[400px] overflow-hidden border border-gray-200">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <Download size={20} className="text-blue-600" />
                        Export Image
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-3">Resolution</label>
                        <div className="grid grid-cols-3 gap-2">
                            {[1, 2, 4].map(r => (
                                <button
                                    key={r}
                                    onClick={() => setResolution(r)}
                                    className={`py-2 text-sm font-bold rounded-lg border transition-all ${
                                        resolution === r
                                            ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                                            : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                                    }`}
                                >
                                    {r}x {r === 1 ? '(Standard)' : r === 2 ? '(High)' : '(Ultra)'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-3">Include Layers</label>
                        <div className="grid grid-cols-2 gap-3">
                            <Toggle label="PCB Image" icon={<ImageIcon size={14} />} active={options.includePCB} onClick={() => setOptions({...options, includePCB: !options.includePCB})} />
                            <Toggle label="Heatmap" icon={<Thermometer size={14} />} active={options.includeHeatmap} onClick={() => setOptions({...options, includeHeatmap: !options.includeHeatmap})} />
                            <Toggle label="Legend" icon={<Layout size={14} />} active={options.includeLegend} onClick={() => setOptions({...options, includeLegend: !options.includeLegend})} />
                            <Toggle label="Hotspots" icon={<Flag size={14} />} active={options.includeHotspots} onClick={() => setOptions({...options, includeHotspots: !options.includeHotspots})} />
                            <Toggle label="Labels" icon={<Box size={14} />} active={options.includeLabels} onClick={() => setOptions({...options, includeLabels: !options.includeLabels})} />
                            <Toggle label="Grid" icon={<Grid3X3 size={14} />} active={options.includeGrid} onClick={() => setOptions({...options, includeGrid: !options.includeGrid})} />
                        </div>
                    </div>

                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                        <div className="text-[10px] font-bold text-blue-700 uppercase mb-1">Export Summary</div>
                        <div className="text-xs text-blue-600">
                            Mode: <span className="font-bold uppercase">{heatmapViewMode}</span><br />
                            Format: <span className="font-bold">PNG</span>
                        </div>
                    </div>
                </div>

                <div className="bg-gray-50 p-6 border-t border-gray-200 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-100 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleExport}
                        className="flex-[2] px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
                    >
                        <Download size={18} />
                        Download PNG
                    </button>
                </div>
            </div>
        </div>
    );
};

const Toggle: React.FC<{ label: string, icon: React.ReactNode, active: boolean, onClick: () => void }> = ({ label, icon, active, onClick }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-all ${
            active ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-100 text-gray-400 opacity-60'
        }`}
    >
        <span className={active ? 'text-blue-600' : 'text-gray-400'}>{icon}</span>
        <span className="text-[11px] font-bold uppercase truncate">{label}</span>
    </button>
);

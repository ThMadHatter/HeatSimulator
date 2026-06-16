import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Upload, Ruler, Plus, MousePointer2, Square, Trash2, Scan, Zap, Hand, Edit3, Download, Target, Circle } from 'lucide-react';
import { SelectImage, LoadImage } from '../../wailsjs/go/main/App';
import { detectPCBOutline, isOpenCVReady } from '../thermal/edgeDetection';
import { ExportDialog } from './ExportDialog';

const Toolbar: React.FC = () => {
  const { mode, setMode, selection, setImageSide, image, calibration, calibrationTop, calibrationBottom, heatmapViewMode, addZone, removeZone, zones, clearSelection, studyArea, setStudyArea, addComponent, setSelection } = useStore();
  const [showExport, setShowExport] = useState(false);
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);

  const handleLoadImage = async (side: 'top' | 'bottom') => {
    try {
      const path = await SelectImage();
      if (path) {
        const base64 = await LoadImage(path);
        const img = new Image();
        img.onload = () => setImageSide(side, base64, img.width, img.height);
        img.src = base64;
      }
    } catch (err) {
      console.error("Failed to load image:", err);
    }
  };

  const handleAutoDetect = async () => {
    if (!isOpenCVReady()) { alert("OpenCV is still loading, please wait..."); return; }
    if (!image || !calibration.mmPerPixel) { alert("Please load an image and calibrate first!"); return; }

    const img = new Image();
    img.onload = async () => {
      try {
        const points = await detectPCBOutline(img);
        if (points.length > 0) {
          const mmPoints = points.map(p => ({
            x: p.x * (calibration.mmPerPixel as number),
            y: p.y * (calibration.mmPerPixel as number)
          }));
          const existing = zones.find(z => z.type === 'pcbBoundary');
          if (existing) removeZone(existing.id);
          addZone({
            id: 'pcb-boundary',
            type: 'pcbBoundary',
            label: 'PCB Boundary',
            points: mmPoints,
            enabled: true,
            editable: true,
            selectable: true,
            deletable: false
          });
          setMode('editBoundary');
        } else {
          alert("Could not detect a clear PCB outline.");
        }
      } catch (err) {
        console.error("Detection failed:", err);
        alert("Detection failed. Check console for details.");
      }
    };
    img.src = image;
  };

  const changeMode = (newMode: any) => {
    setMode(newMode);
    if (['drawZone', 'drawBoundary', 'addComponent', 'calibrate'].includes(newMode)) {
        clearSelection();
    }
  };

  const handleEdit = () => {
      if (selection?.type === 'polygon') {
        if (selection.shapeType === 'pcbBoundary') setMode('editBoundary');
        else setMode('editZone');
      }
  };

  return (
    <div className="flex-none flex flex-col gap-4 p-4 bg-gray-800 text-white w-16 items-center shadow-lg h-full z-20 overflow-y-auto">
      <div className="flex flex-col gap-2">
          <button onClick={() => handleLoadImage('top')} className="p-2 rounded hover:bg-gray-700 transition-colors relative group" title="Load Top Image">
              <Upload size={24} />
              <span className="absolute -bottom-1 -right-1 bg-blue-600 text-[8px] font-bold px-1 rounded">T</span>
          </button>
          <button onClick={() => handleLoadImage('bottom')} className="p-2 rounded hover:bg-gray-700 transition-colors relative group" title="Load Bottom Image">
              <Upload size={24} />
              <span className="absolute -bottom-1 -right-1 bg-green-600 text-[8px] font-bold px-1 rounded">B</span>
          </button>
      </div>
      <div className="w-full h-px bg-gray-700 my-1" />
      <button onClick={() => changeMode('select')} className={`p-2 rounded transition-colors ${mode === 'select' ? 'bg-blue-600' : 'hover:bg-gray-700'}`} title="Select (V)"><MousePointer2 size={24} /></button>
      <button onClick={() => changeMode('pan')} className={`p-2 rounded transition-colors ${mode === 'pan' ? 'bg-blue-600' : 'hover:bg-gray-700'}`} title="Pan (H)"><Hand size={24} /></button>
      <button onClick={handleEdit} disabled={!selection || selection.type !== 'polygon'} className={`p-2 rounded transition-colors ${['editZone', 'editBoundary'].includes(mode) ? 'bg-blue-600' : 'hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed'}`} title="Edit Geometry (E)"><Edit3 size={24} /></button>
      <div className="w-full h-px bg-gray-700 my-1" />
      <button onClick={() => changeMode('drawZone')} className={`p-2 rounded transition-colors ${mode === 'drawZone' ? 'bg-blue-600' : 'hover:bg-gray-700'}`} title="Draw Conductivity Zone (Z)"><Zap size={24} /></button>
      <button onClick={() => changeMode('drawBoundary')} className={`p-2 rounded transition-colors ${mode === 'drawBoundary' ? 'bg-blue-600' : 'hover:bg-gray-700'}`} title="Draw PCB Boundary (B)"><Square size={24} /></button>
      <button onClick={handleAutoDetect} className="p-2 rounded hover:bg-gray-700 transition-colors" title="Auto-detect PCB Boundary"><Scan size={24} /></button>
      <div className="relative group">
          <button
            onMouseEnter={() => setActiveSubmenu('component')}
            onClick={() => changeMode('addComponent')}
            className={`p-2 rounded transition-colors ${mode === 'addComponent' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
            title="Add Component (A)"
          >
              <Plus size={24} />
          </button>
          {activeSubmenu === 'component' && (
              <div
                className="absolute left-full ml-2 top-0 bg-gray-800 rounded shadow-xl p-1 flex flex-col gap-1 z-50 border border-gray-700"
                onMouseLeave={() => setActiveSubmenu(null)}
              >
                  <button
                    onClick={() => { changeMode('addComponent'); setActiveSubmenu(null); }}
                    className="p-2 hover:bg-gray-700 rounded flex items-center gap-2 text-xs whitespace-nowrap"
                  >
                      <Square size={16} /> Rectangular
                  </button>
                  <button
                    onClick={() => {
                        // We need a way to pass the shape to the add mode
                        // For now let's just trigger add and we'll fix CanvasView
                        (window as any).nextComponentShape = 'circle';
                        changeMode('addComponent');
                        setActiveSubmenu(null);
                    }}
                    className="p-2 hover:bg-gray-700 rounded flex items-center gap-2 text-xs whitespace-nowrap"
                  >
                      <Circle size={16} /> Circular
                  </button>
              </div>
          )}
      </div>

      <div className="relative group">
          <button
            onMouseEnter={() => setActiveSubmenu('study')}
            onClick={() => setStudyArea({ enabled: !studyArea.enabled })}
            className={`p-2 rounded transition-colors ${studyArea.enabled ? 'bg-purple-600' : 'hover:bg-gray-700'}`}
            title="Study Area Tool"
          >
              <Target size={24} />
          </button>
          {activeSubmenu === 'study' && (
              <div
                className="absolute left-full ml-2 top-0 bg-gray-800 rounded shadow-xl p-1 flex flex-col gap-1 z-50 border border-gray-700"
                onMouseLeave={() => setActiveSubmenu(null)}
              >
                  <button
                    onClick={() => { setStudyArea({ enabled: true, shape: 'rect' }); setActiveSubmenu(null); }}
                    className="p-2 hover:bg-gray-700 rounded flex items-center gap-2 text-xs whitespace-nowrap"
                  >
                      <Square size={16} /> Rectangular
                  </button>
                  <button
                    onClick={() => { setStudyArea({ enabled: true, shape: 'circle' }); setActiveSubmenu(null); }}
                    className="p-2 hover:bg-gray-700 rounded flex items-center gap-2 text-xs whitespace-nowrap"
                  >
                      <Circle size={16} /> Circular
                  </button>
              </div>
          )}
      </div>
      <div className="flex flex-col gap-1 items-center">
          <button onClick={() => changeMode('calibrate')} className={`p-2 rounded transition-colors ${mode === 'calibrate' ? 'bg-blue-600' : 'hover:bg-gray-700'} relative`} title="Calibrate Scale (C)">
              <Ruler size={24} />
              {calibrationTop.mmPerPixel && <span className="absolute top-0 right-0 w-2 h-2 bg-blue-500 rounded-full border border-gray-800" title="Top Calibrated"></span>}
              {calibrationBottom.mmPerPixel && <span className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 rounded-full border border-gray-800" title="Bottom Calibrated"></span>}
          </button>
          <span className="text-[8px] font-bold text-gray-400 uppercase">{(heatmapViewMode as string) === 'bottom' ? 'Bot' : 'Top'}</span>
      </div>
      <div className="w-full h-px bg-gray-700 my-1" />
      <button onClick={() => setShowExport(true)} className="p-2 rounded hover:bg-gray-700 transition-colors text-blue-400" title="Export Image">
          <Download size={24} />
      </button>

      {showExport && <ExportDialog onClose={() => setShowExport(false)} />}
    </div>
  );
};

export default Toolbar;

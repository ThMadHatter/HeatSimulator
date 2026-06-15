import React from 'react';
import { useStore } from '../store/useStore';
import { Upload, Ruler, Plus, MousePointer2, Square, Trash2, Scan, Zap, Hand, Edit3 } from 'lucide-react';
import { SelectImage, LoadImage } from '../../wailsjs/go/main/App';
import { detectPCBOutline, isOpenCVReady } from '../thermal/edgeDetection';

const Toolbar: React.FC = () => {
  const { mode, setMode, selection, setImageSide, image, calibration, addZone, removeZone, zones, clearSelection } = useStore();

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
    if (!['editZone', 'editBoundary', 'select'].includes(newMode)) clearSelection();
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
      <button onClick={() => changeMode('addComponent')} className={`p-2 rounded transition-colors ${mode === 'addComponent' ? 'bg-blue-600' : 'hover:bg-gray-700'}`} title="Add Component (A)"><Plus size={24} /></button>
      <button onClick={() => changeMode('calibrate')} className={`p-2 rounded transition-colors ${mode === 'calibrate' ? 'bg-blue-600' : 'hover:bg-gray-700'}`} title="Calibrate Scale (C)"><Ruler size={24} /></button>
    </div>
  );
};

export default Toolbar;

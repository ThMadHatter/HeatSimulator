import React from 'react';
import { useStore } from '../store/useStore';
import { Upload, Ruler, Plus, MousePointer2, Square, Trash2, Scan, Zap, Hand } from 'lucide-react';
import { SelectImage, LoadImage } from '../../wailsjs/go/main/App';
import { detectPCBOutline, isOpenCVReady } from '../thermal/edgeDetection';

const Toolbar: React.FC = () => {
  const { mode, setMode, setImage, image, calibration, setBoundary, clearBoundary, clearSelection } = useStore();

  const handleLoadImage = async () => {
    try {
      const path = await SelectImage();
      if (path) {
        const base64 = await LoadImage(path);

        // Get image dimensions
        const img = new Image();
        img.onload = () => {
          setImage(base64, img.width, img.height);
        };
        img.src = base64;
      }
    } catch (err) {
      console.error("Failed to load image:", err);
    }
  };

  const handleAutoDetect = async () => {
    if (!isOpenCVReady()) {
        alert("OpenCV is still loading, please wait...");
        return;
    }

    if (!image || !calibration.mmPerPixel) {
      alert("Please load an image and calibrate first!");
      return;
    }

    const img = new Image();
    img.onload = async () => {
      try {
        const points = await detectPCBOutline(img);
        if (points.length > 0) {
          const mmPoints = points.map(p => ({
            x: p.x * (calibration.mmPerPixel as number),
            y: p.y * (calibration.mmPerPixel as number)
          }));
          setBoundary(mmPoints);
          setMode('drawBoundary');
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
    if (newMode !== 'select') {
      clearSelection();
    }
  };

  return (
    <div className="flex-none flex flex-col gap-4 p-4 bg-gray-800 text-white w-16 items-center shadow-lg h-full z-20">
      <button
        onClick={handleLoadImage}
        className="p-2 rounded hover:bg-gray-700 transition-colors"
        title="Load Image"
      >
        <Upload size={24} />
      </button>

      <div className="w-full h-px bg-gray-700 my-2" />

      <button
        onClick={() => changeMode('select')}
        className={`p-2 rounded transition-colors ${mode === 'select' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
        title="Select (V)"
      >
        <MousePointer2 size={24} />
      </button>

      <button
        onClick={() => changeMode('pan')}
        className={`p-2 rounded transition-colors ${mode === 'pan' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
        title="Pan (H)"
      >
        <Hand size={24} />
      </button>

      <button
        onClick={handleAutoDetect}
        className="p-2 rounded hover:bg-gray-700 transition-colors"
        title="Auto-detect PCB Boundary"
      >
        <Scan size={24} />
      </button>

      <button
        onClick={() => changeMode('calibrate')}
        className={`p-2 rounded transition-colors ${mode === 'calibrate' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
        title="Calibrate Scale (C)"
      >
        <Ruler size={24} />
      </button>

      <button
        onClick={() => changeMode('drawBoundary')}
        className={`p-2 rounded transition-colors ${mode === 'drawBoundary' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
        title="Draw PCB Boundary (B)"
      >
        <Square size={24} />
      </button>

      <button
        onClick={() => changeMode('drawZone')}
        className={`p-2 rounded transition-colors ${mode === 'drawZone' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
        title="Draw Conductivity Zone (Z)"
      >
        <Zap size={24} />
      </button>

      <button
        onClick={() => changeMode('addComponent')}
        className={`p-2 rounded transition-colors ${mode === 'addComponent' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
        title="Add Component (A)"
      >
        <Plus size={24} />
      </button>

      <div className="mt-auto">
        <button
            onClick={clearBoundary}
            className="p-2 rounded hover:bg-red-900 transition-colors text-red-400"
            title="Clear Boundary"
        >
            <Trash2 size={24} />
        </button>
      </div>
    </div>
  );
};

export default Toolbar;

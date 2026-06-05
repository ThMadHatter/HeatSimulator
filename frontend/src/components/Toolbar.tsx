import React from 'react';
import { useStore } from '../store/useStore';
import { Upload, Ruler, Plus, MousePointer2 } from 'lucide-react';
import { SelectImage, LoadImage } from '../../wailsjs/go/main/App';

const Toolbar: React.FC = () => {
  const { mode, setMode, setImage } = useStore();

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

  return (
    <div className="flex flex-col gap-4 p-4 bg-gray-800 text-white w-16 items-center shadow-lg h-full">
      <button
        onClick={handleLoadImage}
        className="p-2 rounded hover:bg-gray-700 transition-colors"
        title="Load Image"
      >
        <Upload size={24} />
      </button>

      <div className="w-full h-px bg-gray-700 my-2" />

      <button
        onClick={() => setMode('select')}
        className={`p-2 rounded transition-colors ${mode === 'select' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
        title="Select/Drag"
      >
        <MousePointer2 size={24} />
      </button>

      <button
        onClick={() => setMode('calibrate')}
        className={`p-2 rounded transition-colors ${mode === 'calibrate' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
        title="Calibrate Scale"
      >
        <Ruler size={24} />
      </button>

      <button
        onClick={() => setMode('addComponent')}
        className={`p-2 rounded transition-colors ${mode === 'addComponent' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
        title="Add Component"
      >
        <Plus size={24} />
      </button>
    </div>
  );
};

export default Toolbar;

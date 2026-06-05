import React, { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Image as KonvaImage, Circle, Line, Text, Group } from 'react-konva';
import { useStore, Component } from '../store/useStore';
import HeatmapOverlay from './HeatmapOverlay';
import DebugPanel from './DebugPanel';
import { KonvaEventObject } from 'konva/lib/Node';

const CanvasView: React.FC = () => {
  const {
    image, imageDimensions, mode, components, addComponent,
    updateComponent, selectComponent, selectedComponentId,
    calibration, setCalibrationPoint
  } = useStore();

  const [stage, setStage] = useState({
    scale: 1,
    x: 0,
    y: 0,
  });

  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);
  const stageRef = useRef<any>(null);

  useEffect(() => {
    if (image) {
      const img = new window.Image();
      img.src = image;
      img.onload = () => setBgImage(img);
    } else {
      setBgImage(null);
    }
  }, [image]);

  const handleWheel = (e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const scaleBy = 1.1;
    const stageObj = stageRef.current;
    if (!stageObj) return;

    const oldScale = stageObj.scaleX();
    const pointer = stageObj.getPointerPosition();
    if (!pointer) return;

    const mousePointTo = {
      x: (pointer.x - stageObj.x()) / oldScale,
      y: (pointer.y - stageObj.y()) / oldScale,
    };

    const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;

    setStage({
      scale: newScale,
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    });
  };

  const handleStageClick = (e: KonvaEventObject<MouseEvent>) => {
    if (mode === 'calibrate') {
      const stageObj = e.target.getStage();
      if (!stageObj) return;
      const pos = stageObj.getRelativePointerPosition();
      if (pos) setCalibrationPoint({ x: pos.x, y: pos.y });
      return;
    }

    if (mode === 'addComponent') {
      if (!calibration.mmPerPixel) {
        alert("Please calibrate the scale first!");
        return;
      }
      const stageObj = e.target.getStage();
      if (!stageObj) return;
      const pos = stageObj.getRelativePointerPosition();
      if (pos) {
        const newComp: Component = {
          id: Math.random().toString(36).substr(2, 9),
          name: `U${components.length + 1}`,
          x: pos.x * calibration.mmPerPixel,
          y: pos.y * calibration.mmPerPixel,
          power: 1.0,
          spread: 5.0,
        };
        addComponent(newComp);
        selectComponent(newComp.id);
      }
      return;
    }

    // Clicked on background, deselect
    if (e.target === e.target.getStage()) {
      selectComponent(null);
    }
  };

  const mmToPx = (mm: number) => calibration.mmPerPixel ? mm / calibration.mmPerPixel : mm;

  if (!image) {
    return (
      <div className="flex-1 bg-gray-200 flex items-center justify-center text-gray-500">
        <p>No image loaded. Click the upload button to start.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gray-300 relative overflow-hidden">
      <Stage
        width={window.innerWidth - 64 - 256} // Adjust based on sidebar widths
        height={window.innerHeight - 64}
        scaleX={stage.scale}
        scaleY={stage.scale}
        x={stage.x}
        y={stage.y}
        onWheel={handleWheel}
        onClick={handleStageClick}
        draggable={mode === 'select' && !selectedComponentId}
        ref={stageRef}
      >
        <Layer>
          {bgImage && <KonvaImage image={bgImage} />}

          {calibration.mmPerPixel && imageDimensions && (
            <HeatmapOverlay
              width={imageDimensions.width}
              height={imageDimensions.height}
              widthMm={imageDimensions.width * calibration.mmPerPixel}
              heightMm={imageDimensions.height * calibration.mmPerPixel}
            />
          )}

          {/* Calibration Overlay */}
          {calibration.point1 && (
            <Circle x={calibration.point1.x} y={calibration.point1.y} radius={5 / stage.scale} fill="blue" />
          )}
          {calibration.point2 && (
            <Circle x={calibration.point2.x} y={calibration.point2.y} radius={5 / stage.scale} fill="blue" />
          )}
          {calibration.point1 && calibration.point2 && (
            <Line
              points={[calibration.point1.x, calibration.point1.y, calibration.point2.x, calibration.point2.y]}
              stroke="blue"
              strokeWidth={2 / stage.scale}
            />
          )}

          {/* Components */}
          {components.map((comp) => {
            const pxX = mmToPx(comp.x);
            const pxY = mmToPx(comp.y);
            const isSelected = comp.id === selectedComponentId;

            return (
              <Group
                key={comp.id}
                x={pxX}
                y={pxY}
                draggable={mode === 'select'}
                onDragStart={() => selectComponent(comp.id)}
                onDragEnd={(e: KonvaEventObject<DragEvent>) => {
                    if (calibration.mmPerPixel) {
                        updateComponent(comp.id, {
                            x: e.target.x() * calibration.mmPerPixel,
                            y: e.target.y() * calibration.mmPerPixel,
                        });
                    }
                }}
                onClick={(e: KonvaEventObject<MouseEvent>) => {
                    e.cancelBubble = true;
                    selectComponent(comp.id);
                }}
              >
                <Circle
                  radius={isSelected ? 10 / stage.scale : 8 / stage.scale}
                  fill={isSelected ? "#3b82f6" : "#ef4444"}
                  stroke={isSelected ? "yellow" : "white"}
                  strokeWidth={2 / stage.scale}
                  shadowBlur={isSelected ? 10 : 0}
                  shadowColor="black"
                />
                <Text
                  text={comp.name}
                  fontSize={14 / stage.scale}
                  fill={isSelected ? "#3b82f6" : "black"}
                  fontStyle={isSelected ? "bold" : "normal"}
                  y={-20 / stage.scale}
                  align="center"
                  width={60 / stage.scale}
                  x={-30 / stage.scale}
                />
              </Group>
            );
          })}
        </Layer>
      </Stage>

      {mode === 'calibrate' && !calibration.mmPerPixel && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg pointer-events-none">
          Click two points on the image to calibrate scale
        </div>
      )}

      <DebugPanel />
    </div>
  );
};

export default CanvasView;

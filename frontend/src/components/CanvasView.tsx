import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Stage, Layer, Image as KonvaImage, Circle, Line, Text, Group, Rect } from 'react-konva';
import { useStore, Component } from '../store/useStore';
import HeatmapOverlay from './HeatmapOverlay';
import DebugPanel from './DebugPanel';
import Legend from './Legend';
import { KonvaEventObject } from 'konva/lib/Node';
import { computeHeatmap } from '../thermal';
import Konva from 'konva';

const CanvasView: React.FC = () => {
  const {
    image, imageDimensions, mode, components, addComponent,
    updateComponent, selectComponent, selectedComponentId,
    calibration, setCalibrationPoint,
    boundary, addBoundaryPoint, updateBoundaryPoint, removeBoundaryPoint,
    insertBoundaryPoint, ambientTemperature
  } = useStore();

  const [stage, setStage] = useState({
    scale: 1,
    x: 0,
    y: 0,
  });

  const [heatmapRange, setHeatmapRange] = useState({ min: 25, max: 35 });
  const handleHeatmapResult = useCallback((min: number, max: number) => {
    setHeatmapRange({ min, max });
  }, []);

  const [mousePos, setMousePos] = useState({ x: 0, y: 0, mmX: 0, mmY: 0, temp: 0 });
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);
  const stageRef = useRef<any>(null);
  const [opacity, setOpacity] = useState(1);

  // Animation for flashing red
  useEffect(() => {
    const anim = new Konva.Animation((frame) => {
        if (!frame) return;
        const o = (Math.sin(frame.time / 200) + 1) / 2;
        setOpacity(0.4 + o * 0.6);
    });
    anim.start();
    return () => { anim.stop(); };
  }, []);

  useEffect(() => {
    if (image) {
      const img = new window.Image();
      img.src = image;
      img.onload = () => setBgImage(img);
    } else {
      setBgImage(null);
    }
  }, [image]);

  const heatmapResult = useMemo(() => {
    if (!imageDimensions || !calibration.mmPerPixel || components.length === 0) return null;
    return computeHeatmap(
        components,
        imageDimensions.width * calibration.mmPerPixel,
        imageDimensions.height * calibration.mmPerPixel,
        boundary,
        ambientTemperature,
        150
    );
  }, [components, imageDimensions, calibration, boundary, ambientTemperature]);

  const handleMouseMove = (e: any) => {
    const stageObj = e.target.getStage();
    const pointer = stageObj.getRelativePointerPosition();
    if (!pointer) return;

    let temp = ambientTemperature;
    let mmX = 0;
    let mmY = 0;

    if (calibration.mmPerPixel) {
        mmX = pointer.x * calibration.mmPerPixel;
        mmY = pointer.y * calibration.mmPerPixel;

        if (heatmapResult && imageDimensions) {
            const gridX = Math.floor((mmX / (imageDimensions.width * calibration.mmPerPixel)) * 150);
            const gridY = Math.floor((mmY / (imageDimensions.height * calibration.mmPerPixel)) * 150);
            if (gridX >= 0 && gridX < 150 && gridY >= 0 && gridY < 150) {
                temp = heatmapResult.data[gridY * 150 + gridX];
            }
        }
    }

    setMousePos({ x: pointer.x, y: pointer.y, mmX, mmY, temp });
  };

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
    const stageObj = e.target.getStage();
    if (!stageObj) return;
    const pos = stageObj.getRelativePointerPosition();
    if (!pos) return;

    if (mode === 'calibrate') {
      setCalibrationPoint({ x: pos.x, y: pos.y });
      return;
    }

    if (mode === 'drawBoundary') {
        if (!calibration.mmPerPixel) {
            alert("Calibrate first!");
            return;
        }
        addBoundaryPoint({ x: pos.x * calibration.mmPerPixel, y: pos.y * calibration.mmPerPixel });
        return;
    }

    if (mode === 'addComponent') {
      if (!calibration.mmPerPixel) {
        alert("Please calibrate the scale first!");
        return;
      }
      const newComp: Component = {
        id: Math.random().toString(36).substr(2, 9),
        name: `U${components.length + 1}`,
        x: pos.x * calibration.mmPerPixel,
        y: pos.y * calibration.mmPerPixel,
        width: 10,
        height: 10,
        power: 1.0,
        thetaJA: 40,
        maxTemperature: 125,
      };
      addComponent(newComp);
      selectComponent(newComp.id);
      return;
    }

    // Clicked on background, deselect
    if (e.target === e.target.getStage()) {
      selectComponent(null);
    }
  };

  const handleDragEnd = (e: KonvaEventObject<DragEvent>) => {
    if (e.target === stageRef.current) {
        setStage({
            ...stage,
            x: e.target.x(),
            y: e.target.y()
        });
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

  const boundaryPointsPx = boundary.flatMap(p => [mmToPx(p.x), mmToPx(p.y)]);

  return (
    <div className="flex-1 bg-gray-300 relative overflow-hidden cursor-crosshair">
      <Stage
        width={window.innerWidth - 64 - 256}
        height={window.innerHeight - 64}
        scaleX={stage.scale}
        scaleY={stage.scale}
        x={stage.x}
        y={stage.y}
        onWheel={handleWheel}
        onClick={handleStageClick}
        onMouseMove={handleMouseMove}
        onDragEnd={handleDragEnd}
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
              onResult={handleHeatmapResult}
            />
          )}

          {/* Boundary */}
          {boundary.length > 0 && (
              <Group>
                <Line
                    points={boundaryPointsPx}
                    stroke="#10b981"
                    strokeWidth={4 / stage.scale}
                    closed={true}
                    fill="#10b98122"
                    hitStrokeWidth={20 / stage.scale}
                    onClick={(e) => {
                        if (mode === 'drawBoundary' && calibration.mmPerPixel) {
                            const stageObj = e.target.getStage();
                            const pos = stageObj?.getRelativePointerPosition();
                            if (pos) {
                                // Find the closest segment to insert a point
                                // For simplicity, we can just find where on the line we clicked.
                                // Line.getPointOnLine might be useful but we can use our own logic.
                                // Actually, let's just append if it's not a clear segment click,
                                // or better: find the index where to insert.

                                // Simplified approach: find the segment (i, i+1) that is closest to the click
                                let minD = Infinity;
                                let insertIdx = boundary.length;

                                for (let i = 0; i < boundary.length; i++) {
                                    const p1 = { x: mmToPx(boundary[i].x), y: mmToPx(boundary[i].y) };
                                    const p2 = {
                                        x: mmToPx(boundary[(i + 1) % boundary.length].x),
                                        y: mmToPx(boundary[(i + 1) % boundary.length].y)
                                    };

                                    // Distance from point to segment
                                    const px = pos.x, py = pos.y;
                                    const l2 = Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2);
                                    if (l2 === 0) continue;
                                    let t = ((px - p1.x) * (p2.x - p1.x) + (py - p1.y) * (p2.y - p1.y)) / l2;
                                    t = Math.max(0, Math.min(1, t));
                                    const d = Math.sqrt(Math.pow(px - (p1.x + t * (p2.x - p1.x)), 2) + Math.pow(py - (p1.y + t * (p2.y - p1.y)), 2));

                                    if (d < minD) {
                                        minD = d;
                                        insertIdx = i + 1;
                                    }
                                }

                                if (minD < 20 / stage.scale) {
                                    insertBoundaryPoint(insertIdx, {
                                        x: pos.x * calibration.mmPerPixel,
                                        y: pos.y * calibration.mmPerPixel
                                    });
                                    e.cancelBubble = true;
                                }
                            }
                        }
                    }}
                />
                {mode === 'drawBoundary' && boundary.map((p, i) => (
                    <Circle
                        key={`boundary-point-${i}`}
                        x={mmToPx(p.x)}
                        y={mmToPx(p.y)}
                        radius={6 / stage.scale}
                        fill="#10b981"
                        stroke="white"
                        strokeWidth={1 / stage.scale}
                        draggable
                        onDragMove={(e) => {
                            if (calibration.mmPerPixel) {
                                updateBoundaryPoint(i, {
                                    x: e.target.x() * calibration.mmPerPixel,
                                    y: e.target.y() * calibration.mmPerPixel,
                                });
                            }
                        }}
                        onClick={(e) => {
                            e.cancelBubble = true;
                            if (e.evt.altKey || e.evt.shiftKey) {
                                removeBoundaryPoint(i);
                            }
                        }}
                    />
                ))}
              </Group>
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
            const pxW = mmToPx(comp.width);
            const pxH = mmToPx(comp.height);
            const isSelected = comp.id === selectedComponentId;

            const junction = heatmapResult?.junctions.find(j => j.compId === comp.id);
            let statusColor = "#10b981"; // green
            if (junction) {
                if (junction.isOverLimit) statusColor = "#ef4444"; // red
                else if (junction.ratingPercent > 90) statusColor = "#ef4444"; // red
                else if (junction.ratingPercent > 70) statusColor = "#f59e0b"; // yellow/orange
            }

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
                <Rect
                    x={-pxW/2}
                    y={-pxH/2}
                    width={pxW}
                    height={pxH}
                    fill="transparent"
                    stroke={isSelected ? "#3b82f6" : "rgba(255,255,255,0.5)"}
                    strokeWidth={2 / stage.scale}
                    dash={isSelected ? [] : [5, 5]}
                />
                <Circle
                  radius={8 / stage.scale}
                  fill={statusColor}
                  opacity={junction?.isOverLimit ? opacity : 1}
                  stroke="white"
                  strokeWidth={2 / stage.scale}
                  shadowBlur={junction?.isOverLimit ? 10 : 0}
                  shadowColor="red"
                />
                <Text
                  text={`${comp.name}\nTj: ${junction?.tj.toFixed(1)}°C\n(${junction?.ratingPercent.toFixed(0)}%)`}
                  fontSize={10 / stage.scale}
                  fill="white"
                  fontStyle="bold"
                  y={pxH/2 + 5 / stage.scale}
                  align="center"
                  width={100 / stage.scale}
                  x={-50 / stage.scale}
                  shadowColor="black"
                  shadowBlur={2}
                  shadowOffset={{x:1, y:1}}
                  shadowOpacity={1}
                />
                {junction?.isOverLimit && (
                    <Text
                        text="⚠️ CRITICAL"
                        fontSize={10 / stage.scale}
                        fill="#ef4444"
                        fontStyle="bold"
                        y={-pxH/2 - 15 / stage.scale}
                        align="center"
                        width={100 / stage.scale}
                        x={-50 / stage.scale}
                        opacity={opacity}
                    />
                )}
              </Group>
            );
          })}
        </Layer>
      </Stage>

      {/* DOM Overlays */}
      <Legend minTemp={heatmapRange.min} maxTemp={heatmapRange.max} />

      {calibration.mmPerPixel && (
        <div className="absolute bottom-4 right-4 bg-black/80 text-white p-2 rounded text-[10px] font-mono pointer-events-none border border-white/20 backdrop-blur-sm shadow-xl">
            <div className="text-blue-400 font-bold mb-1">CURSOR INFO</div>
            X: {mousePos.mmX.toFixed(1)} mm<br/>
            Y: {mousePos.mmY.toFixed(1)} mm<br/>
            T: <span className={mousePos.temp > 80 ? "text-red-400" : "text-green-400"}>{mousePos.temp.toFixed(1)} °C</span>
        </div>
      )}

      {mode === 'calibrate' && !calibration.mmPerPixel && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg pointer-events-none">
          Click two points on the image to calibrate scale
        </div>
      )}

      {mode === 'drawBoundary' && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-4 py-2 rounded-full shadow-lg pointer-events-none text-center">
          Click background to add points. Drag vertices to move.<br/>
          Click boundary line to insert point. Alt+Click vertex to remove.
        </div>
      )}

      <DebugPanel />
    </div>
  );
};

export default CanvasView;

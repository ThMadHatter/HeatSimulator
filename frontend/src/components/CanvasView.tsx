import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Stage, Layer, Image as KonvaImage, Circle, Line, Text, Group, Rect } from 'react-konva';
import { useStore, Component, Selection } from '../store/useStore';
import HeatmapOverlay from './HeatmapOverlay';
import DebugPanel from './DebugPanel';
import Legend from './Legend';
import { KonvaEventObject } from 'konva/lib/Node';
import { computeHeatmap } from '../thermal';
import Konva from 'konva';
import { Zone, Point } from '../thermal/types';
import { isPointInPolygon } from '../thermal/utils';

const CanvasView: React.FC = () => {
  const {
    image, imageDimensions, mode, setMode, components, addComponent,
    updateComponent, removeComponent,
    selection, setSelection, clearSelection,
    calibration, setCalibrationPoint,
    boundary, setBoundary, addBoundaryPoint, updateBoundaryPoint, removeBoundaryPoint,
    insertBoundaryPoint, ambientTemperature, showGrid,
    zones, addZone, updateZone, removeZone,
    stackup, heatmapResult, setHeatmapResult, debugPointerEvents
  } = useStore();

  const [stage, setStage] = useState({
    scale: 1,
    x: 0,
    y: 0,
  });

  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [drawingPoints, setDrawingPoints] = useState<Point[]>([]);
  const [cursorPos, setCursorPos] = useState<Point | null>(null);

  const [heatmapRange, setHeatmapRange] = useState({ min: 25, max: 35 });
  const handleHeatmapResult = useCallback((min: number, max: number) => {
    setHeatmapRange({ min, max });
  }, []);

  const [mousePos, setMousePos] = useState({ x: 0, y: 0, mmX: 0, mmY: 0, temp: 0, k: 0 });
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const [opacity, setOpacity] = useState(1);

  // Debug pointer logger
  const logPointer = (msg: string, e: any) => {
    if (!debugPointerEvents) return;
    const target = e.target;
    console.log(`[POINTER] ${msg} | mode=${mode} | target=${target.constructor.name} | name=${target.name()} | cancelBubble=${e.cancelBubble}`);
  };

  // Keyboard handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName || '')) {
            return;
        }

        if (e.key === 'Escape') {
            if (mode === 'drawZone' || mode === 'drawBoundary') {
                setDrawingPoints([]);
            }
            clearSelection();
            setMode('select');
        }
        if (e.key === 'v' || e.key === 'V') setMode('select');
        if (e.key === 'h' || e.key === 'H') setMode('pan');
        if (e.key === 'c' || e.key === 'C') { setMode('calibrate'); clearSelection(); }
        if (e.key === 'b' || e.key === 'B') { setMode('drawBoundary'); setDrawingPoints([]); clearSelection(); }
        if (e.key === 'z' || e.key === 'Z') { setMode('drawZone'); setDrawingPoints([]); clearSelection(); }
        if (e.key === 'a' || e.key === 'A') { setMode('addComponent'); clearSelection(); }
        if (e.key === 'e' || e.key === 'E') {
            if (selection?.type === 'conductivity-zone' || selection?.type === 'conductivity-zone-vertex') {
              setMode('editZone');
            } else if (selection?.type === 'pcb-boundary' || selection?.type === 'pcb-boundary-vertex') {
              setMode('editBoundary');
            }
        }

        if (e.key === 'Enter') {
            if (mode === 'drawZone' && drawingPoints.length >= 3) {
                const newZone: Zone = {
                    id: Math.random().toString(36).substr(2, 9),
                    label: `Zone ${zones.length + 1}`,
                    points: drawingPoints,
                    conductivity: 50.0,
                    enabled: true
                };
                addZone(newZone);
                setDrawingPoints([]);
                setSelection({ type: 'conductivity-zone', id: newZone.id });
                setMode('editZone');
            }
            if (mode === 'drawBoundary' && drawingPoints.length >= 3) {
                setBoundary(drawingPoints);
                setDrawingPoints([]);
                setSelection({ type: 'pcb-boundary' });
                setMode('editBoundary');
            }
        }

        if (e.key === 'Delete' || e.key === 'Backspace') {
            if (mode === 'select' || mode === 'editZone' || mode === 'editBoundary') {
                if (selection?.type === 'component') {
                    removeComponent(selection.id);
                    clearSelection();
                } else if (selection?.type === 'conductivity-zone') {
                    removeZone(selection.id);
                    clearSelection();
                } else if (selection?.type === 'pcb-boundary-vertex') {
                    removeBoundaryPoint(selection.index);
                    clearSelection();
                } else if (selection?.type === 'conductivity-zone-vertex') {
                    const zone = zones.find(z => z.id === selection.zoneId);
                    if (zone && zone.points.length > 3) {
                        const newPoints = zone.points.filter((_, i) => i !== selection.index);
                        updateZone(selection.zoneId, { points: newPoints });
                    } else if (zone) {
                        alert("Zone must have at least 3 vertices.");
                    }
                    clearSelection();
                }
            }
        }

        if (e.code === 'Space') {
            setIsSpacePressed(true);
        }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
        if (e.code === 'Space') {
            setIsSpacePressed(false);
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
    };
  }, [selection, zones, mode, drawingPoints, setMode, clearSelection, removeComponent, removeZone, removeBoundaryPoint, updateZone, addZone, setSelection, setBoundary]);

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

  useEffect(() => {
    if (!imageDimensions || !calibration.mmPerPixel || components.length === 0) {
        setHeatmapResult(null);
        return;
    }
    const result = computeHeatmap(
        components,
        zones,
        imageDimensions.width * calibration.mmPerPixel,
        imageDimensions.height * calibration.mmPerPixel,
        boundary,
        ambientTemperature,
        150,
        stackup
    );
    setHeatmapResult(result);
  }, [components, zones, imageDimensions, calibration, boundary, ambientTemperature, stackup, setHeatmapResult]);

  const handleMouseMove = (e: any) => {
    const stageObj = e.target.getStage();
    const pointer = stageObj.getRelativePointerPosition();
    if (!pointer) return;

    let temp = ambientTemperature;
    let k = 0;
    let mmX = 0;
    let mmY = 0;

    if (calibration.mmPerPixel) {
        mmX = pointer.x * calibration.mmPerPixel;
        mmY = pointer.y * calibration.mmPerPixel;

        if (heatmapResult && imageDimensions) {
            const dx = Math.max(imageDimensions.width * calibration.mmPerPixel, imageDimensions.height * calibration.mmPerPixel) / 150;
            const gridX = Math.floor(mmX / dx);
            const gridY = Math.floor(mmY / dx);
            if (gridX >= 0 && gridX < heatmapResult.width && gridY >= 0 && gridY < heatmapResult.height) {
                const idx = gridY * heatmapResult.width + gridX;
                temp = heatmapResult.data[idx];
                k = heatmapResult.kGrid[idx];
            }
        }
    }

    setMousePos({ x: pointer.x, y: pointer.y, mmX, mmY, temp, k });
    setCursorPos({ x: mmX, y: mmY });
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
    logPointer("StageClick", e);
    const stageObj = e.target.getStage();
    if (!stageObj) return;
    const pos = stageObj.getRelativePointerPosition();
    if (!pos) return;

    const mmX = pos.x * (calibration.mmPerPixel || 1);
    const mmY = pos.y * (calibration.mmPerPixel || 1);
    const pointMm = { x: mmX, y: mmY };

    if (mode === 'calibrate') {
      setCalibrationPoint({ x: pos.x, y: pos.y });
      return;
    }

    if (mode === 'drawBoundary') {
        if (!calibration.mmPerPixel) {
            alert("Calibrate first!");
            return;
        }
        setDrawingPoints([...drawingPoints, pointMm]);
        return;
    }

    if (mode === 'drawZone') {
        if (!calibration.mmPerPixel) {
            alert("Calibrate first!");
            return;
        }
        if (boundary.length >= 3 && !isPointInPolygon(pointMm, boundary)) {
            // Optional: visual feedback would be better than an alert
            return;
        }
        setDrawingPoints([...drawingPoints, pointMm]);
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
        x: pointMm.x,
        y: pointMm.y,
        width: 10,
        height: 10,
        power: 1.0,
        thetaJA: 40,
        maxTemperature: 125,
      };
      addComponent(newComp);
      setSelection({ type: 'component', id: newComp.id });
      setMode('select');
      return;
    }

    // Clicked on background, deselect if in select mode
    if (e.target === e.target.getStage() && (mode === 'select' || mode === 'editZone' || mode === 'editBoundary')) {
      clearSelection();
      setMode('select');
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
  const drawingPointsPx = drawingPoints.flatMap(p => [mmToPx(p.x), mmToPx(p.y)]);

  const isBoundarySelected = selection?.type === 'pcb-boundary' || selection?.type === 'pcb-boundary-vertex';

  // Helper for determining cursor
  const getCursor = () => {
    if (isSpacePressed) return 'grabbing';
    if (mode === 'pan') return 'grab';
    if (['drawZone', 'drawBoundary', 'addComponent', 'calibrate'].includes(mode)) return 'crosshair';
    return 'default';
  };

  const findInsertIndex = (points: Point[], clickPos: { x: number, y: number }) => {
    let minD = Infinity;
    let insertIdx = points.length;

    for (let i = 0; i < points.length; i++) {
        const p1 = { x: mmToPx(points[i].x), y: mmToPx(points[i].y) };
        const p2 = {
            x: mmToPx(points[(i + 1) % points.length].x),
            y: mmToPx(points[(i + 1) % points.length].y)
        };

        const px = clickPos.x, py = clickPos.y;
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
    return { minD, insertIdx };
  };

  return (
    <div className="flex-1 bg-gray-300 relative overflow-hidden" style={{ cursor: getCursor() }}>
      <Stage
        width={window.innerWidth - 64 - 256}
        height={window.innerHeight - 64}
        scaleX={stage.scale}
        scaleY={stage.scale}
        x={stage.x}
        y={stage.y}
        onWheel={handleWheel}
        onClick={handleStageClick}
        onDblClick={(e) => {
            if (mode === 'drawZone' && drawingPoints.length >= 3) {
                const newZone: Zone = {
                    id: Math.random().toString(36).substr(2, 9),
                    label: `Zone ${zones.length + 1}`,
                    points: drawingPoints,
                    conductivity: 50.0,
                    enabled: true
                };
                addZone(newZone);
                setDrawingPoints([]);
                setSelection({ type: 'conductivity-zone', id: newZone.id });
                setMode('editZone');
            }
            if (mode === 'drawBoundary' && drawingPoints.length >= 3) {
                setBoundary(drawingPoints);
                setDrawingPoints([]);
                setSelection({ type: 'pcb-boundary' });
                setMode('editBoundary');
            }
        }}
        onMouseMove={handleMouseMove}
        onDragEnd={handleDragEnd}
        draggable={isSpacePressed || mode === 'pan'}
        ref={stageRef}
      >
        <Layer>
          {bgImage && <KonvaImage image={bgImage} listening={false} name="PCB_IMAGE" />}

          {calibration.mmPerPixel && imageDimensions && (
            <HeatmapOverlay
              width={imageDimensions.width}
              height={imageDimensions.height}
              onResult={handleHeatmapResult}
            />
          )}

          {/* Zones */}
          {zones.map(zone => {
              const pointsPx = zone.points.flatMap(p => [mmToPx(p.x), mmToPx(p.y)]);
              const isSelected = selection?.type === 'conductivity-zone' && selection.id === zone.id;
              const isVertexOfThisZoneSelected = selection?.type === 'conductivity-zone-vertex' && selection.zoneId === zone.id;
              const isAnyPartOfThisZoneSelected = isSelected || isVertexOfThisZoneSelected;

              // In select mode, we show vertices for selected geometry
              const showVertices = (mode === 'select' || mode === 'editZone') && isAnyPartOfThisZoneSelected;
              const isInteractive = mode === 'select' || (mode === 'editZone' && isAnyPartOfThisZoneSelected);

              return (
                  <Group key={zone.id}>
                    <Line
                        points={pointsPx}
                        stroke={isAnyPartOfThisZoneSelected ? "#3b82f6" : "#f59e0b"}
                        strokeWidth={isAnyPartOfThisZoneSelected ? 4 / stage.scale : 2 / stage.scale}
                        closed={true}
                        fill={isAnyPartOfThisZoneSelected ? "#3b82f622" : "#f59e0b22"}
                        hitStrokeWidth={20 / stage.scale}
                        listening={isInteractive}
                        name={`ZONE_${zone.id}`}
                        onClick={(e) => {
                            logPointer("ZoneClick", e);
                            e.cancelBubble = true;
                            setSelection({ type: 'conductivity-zone', id: zone.id });

                            if (mode === 'editZone' && isAnyPartOfThisZoneSelected && calibration.mmPerPixel) {
                                const stageObj = e.target.getStage();
                                const pos = stageObj?.getRelativePointerPosition();
                                if (pos) {
                                    const { minD, insertIdx } = findInsertIndex(zone.points, pos);
                                    if (minD < 20 / stage.scale) {
                                        const newPoints = [...zone.points];
                                        newPoints.splice(insertIdx, 0, {
                                            x: pos.x * calibration.mmPerPixel,
                                            y: pos.y * calibration.mmPerPixel
                                        });
                                        updateZone(zone.id, { points: newPoints });
                                    }
                                }
                            }
                        }}
                        onMouseEnter={(e) => {
                            const container = e.target.getStage()?.container();
                            if (container && mode === 'select') container.style.cursor = 'pointer';
                        }}
                        onMouseLeave={(e) => {
                            const container = e.target.getStage()?.container();
                            if (container && mode === 'select') container.style.cursor = getCursor();
                        }}
                    />
                    {showVertices && zone.points.map((p, i) => {
                        const isVertexSelected = selection?.type === 'conductivity-zone-vertex' && selection.zoneId === zone.id && selection.index === i;
                        return (
                        <Circle
                            key={`zone-${zone.id}-p-${i}`}
                            x={mmToPx(p.x)}
                            y={mmToPx(p.y)}
                            radius={(isVertexSelected ? 8 : 6) / stage.scale}
                            fill={isVertexSelected ? "#3b82f6" : "#f59e0b"}
                            stroke="white"
                            strokeWidth={1 / stage.scale}
                            draggable
                            name={`ZONE_VERTEX_${zone.id}_${i}`}
                            onDragEnd={(e) => {
                                logPointer("VertexDragEnd", e);
                                if (calibration.mmPerPixel) {
                                    const newPoints = [...zone.points];
                                    newPoints[i] = {
                                        x: e.target.x() * calibration.mmPerPixel,
                                        y: e.target.y() * calibration.mmPerPixel,
                                    };
                                    updateZone(zone.id, { points: newPoints });
                                }
                            }}
                            onClick={(e) => {
                                logPointer("VertexClick", e);
                                e.cancelBubble = true;
                                if (e.evt.altKey) {
                                    if (zone.points.length <= 3) {
                                        alert("Zone must have at least 3 vertices.");
                                        return;
                                    }
                                    const newPoints = zone.points.filter((_, idx) => idx !== i);
                                    updateZone(zone.id, { points: newPoints });
                                    clearSelection();
                                } else {
                                    setSelection({ type: 'conductivity-zone-vertex', zoneId: zone.id, index: i });
                                }
                            }}
                            onMouseEnter={(e) => {
                                const container = e.target.getStage()?.container();
                                if (container) container.style.cursor = 'move';
                            }}
                            onMouseLeave={(e) => {
                                const container = e.target.getStage()?.container();
                                if (container) container.style.cursor = getCursor();
                            }}
                        />
                        );
                    })}
                  </Group>
              );
          })}

          {/* Current Drawing Preview */}
          {(mode === 'drawZone' || mode === 'drawBoundary') && drawingPoints.length > 0 && (
              <Group>
                  <Line
                      points={drawingPointsPx}
                      stroke="#3b82f6"
                      strokeWidth={2 / stage.scale}
                      dash={[5, 5]}
                  />
                  {cursorPos && (
                      <Line
                          points={[mmToPx(drawingPoints[drawingPoints.length-1].x), mmToPx(drawingPoints[drawingPoints.length-1].y), mmToPx(cursorPos.x), mmToPx(cursorPos.y)]}
                          stroke="#3b82f6"
                          strokeWidth={2 / stage.scale}
                          opacity={0.5}
                      />
                  )}
                  {drawingPoints.map((p, i) => (
                      <Circle
                        key={`drawing-p-${i}`}
                        x={mmToPx(p.x)}
                        y={mmToPx(p.y)}
                        radius={4 / stage.scale}
                        fill="#3b82f6"
                      />
                  ))}
              </Group>
          )}

          {/* Boundary */}
          {boundary.length > 0 && (
              <Group>
                <Line
                    points={boundaryPointsPx}
                    stroke={isBoundarySelected ? "#3b82f6" : "#10b981"}
                    strokeWidth={isBoundarySelected ? 6 / stage.scale : 4 / stage.scale}
                    closed={true}
                    fill={isBoundarySelected ? "#3b82f622" : "#10b98122"}
                    hitStrokeWidth={20 / stage.scale}
                    listening={mode === 'select' || mode === 'editBoundary'}
                    name="PCB_BOUNDARY"
                    onClick={(e) => {
                        logPointer("BoundaryClick", e);
                        e.cancelBubble = true;
                        setSelection({ type: 'pcb-boundary' });

                        if (mode === 'editBoundary' && calibration.mmPerPixel) {
                            const stageObj = e.target.getStage();
                            const pos = stageObj?.getRelativePointerPosition();
                            if (pos) {
                                const { minD, insertIdx } = findInsertIndex(boundary, pos);
                                if (minD < 20 / stage.scale) {
                                    insertBoundaryPoint(insertIdx, {
                                        x: pos.x * calibration.mmPerPixel,
                                        y: pos.y * calibration.mmPerPixel
                                    });
                                }
                            }
                        }
                    }}
                    onMouseEnter={(e) => {
                        const container = e.target.getStage()?.container();
                        if (container && mode === 'select') container.style.cursor = 'pointer';
                    }}
                    onMouseLeave={(e) => {
                        const container = e.target.getStage()?.container();
                        if (container && mode === 'select') container.style.cursor = getCursor();
                    }}
                />
                {(mode === 'select' || mode === 'editBoundary') && isBoundarySelected && boundary.map((p, i) => {
                    const isVertexSelected = selection?.type === 'pcb-boundary-vertex' && selection.index === i;
                    return (
                    <Circle
                        key={`boundary-point-${i}`}
                        x={mmToPx(p.x)}
                        y={mmToPx(p.y)}
                        radius={(isVertexSelected ? 8 : 6) / stage.scale}
                        fill={isVertexSelected ? "#3b82f6" : "#10b981"}
                        stroke="white"
                        strokeWidth={1 / stage.scale}
                        draggable
                        name={`BOUNDARY_VERTEX_${i}`}
                        onDragEnd={(e) => {
                            if (calibration.mmPerPixel) {
                                updateBoundaryPoint(i, {
                                    x: e.target.x() * calibration.mmPerPixel,
                                    y: e.target.y() * calibration.mmPerPixel,
                                });
                            }
                        }}
                        onClick={(e) => {
                            e.cancelBubble = true;
                            if (e.evt.altKey) {
                                removeBoundaryPoint(i);
                                clearSelection();
                            } else {
                                setSelection({ type: 'pcb-boundary-vertex', index: i });
                            }
                        }}
                        onMouseEnter={(e) => {
                            const container = e.target.getStage()?.container();
                            if (container) container.style.cursor = 'move';
                        }}
                        onMouseLeave={(e) => {
                            const container = e.target.getStage()?.container();
                            if (container) container.style.cursor = getCursor();
                        }}
                    />
                    );
                })}
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

          {/* Grid Debug */}
          {showGrid && heatmapResult && imageDimensions && calibration.mmPerPixel && (() => {
              const dx = Math.max(imageDimensions.width * calibration.mmPerPixel, imageDimensions.height * calibration.mmPerPixel) / 150;
              const gridLines = [];
              const nx = heatmapResult.width;
              const ny = heatmapResult.height;

              for (let i = 0; i <= nx; i++) {
                  gridLines.push(
                      <Line
                          key={`v-${i}`}
                          points={[mmToPx(i * dx), 0, mmToPx(i * dx), mmToPx(ny * dx)]}
                          stroke="rgba(255,255,255,0.2)"
                          strokeWidth={1 / stage.scale}
                          listening={false}
                      />
                  );
              }
              for (let j = 0; j <= ny; j++) {
                  gridLines.push(
                      <Line
                          key={`h-${j}`}
                          points={[0, mmToPx(j * dx), mmToPx(nx * dx), mmToPx(j * dx)]}
                          stroke="rgba(255,255,255,0.2)"
                          strokeWidth={1 / stage.scale}
                          listening={false}
                      />
                  );
              }
              return gridLines;
          })()}

          {/* Components */}
          {components.map((comp) => {
            const pxX = mmToPx(comp.x);
            const pxY = mmToPx(comp.y);
            const pxW = mmToPx(comp.width);
            const pxH = mmToPx(comp.height);
            const isSelected = selection?.type === 'component' && selection.id === comp.id;

            const junction = heatmapResult?.junctions.find(j => j.compId === comp.id);
            let statusColor = "#10b981"; // green
            if (junction) {
                if (junction.isOverLimit) statusColor = "#ef4444"; // red
                else if (junction.ratingPercent && junction.ratingPercent > 90) statusColor = "#ef4444"; // red
                else if (junction.ratingPercent && junction.ratingPercent > 70) statusColor = "#f59e0b"; // yellow/orange
            }

            const label = `${comp.name}\nTj: ${junction?.tj?.toFixed(1) ?? 'N/A'}°C\nTpcb: ${junction?.tPcb.toFixed(1)}°C\nRp: ${junction?.rThetaPcb.toFixed(2)} K/W`;

            return (
              <Group
                key={comp.id}
                x={pxX}
                y={pxY}
                draggable={mode === 'select'}
                name={`COMPONENT_${comp.id}`}
                listening={mode === 'select'}
                onDragStart={(e) => {
                    logPointer("CompDragStart", e);
                    e.cancelBubble = true;
                    setSelection({ type: 'component', id: comp.id });
                }}
                onDragEnd={(e: KonvaEventObject<DragEvent>) => {
                    logPointer("CompDragEnd", e);
                    if (calibration.mmPerPixel) {
                        updateComponent(comp.id, {
                            x: e.target.x() * calibration.mmPerPixel,
                            y: e.target.y() * calibration.mmPerPixel,
                        });
                    }
                }}
                onClick={(e: KonvaEventObject<MouseEvent>) => {
                    logPointer("CompClick", e);
                    e.cancelBubble = true;
                    setSelection({ type: 'component', id: comp.id });
                }}
                onMouseEnter={(e) => {
                    const container = e.target.getStage()?.container();
                    if (container && mode === 'select') container.style.cursor = 'move';
                }}
                onMouseLeave={(e) => {
                    const container = e.target.getStage()?.container();
                    if (container && mode === 'select') container.style.cursor = getCursor();
                }}
              >
                <Rect
                    x={-pxW/2}
                    y={-pxH/2}
                    width={pxW}
                    height={pxH}
                    fill="transparent"
                    stroke={isSelected ? "#3b82f6" : statusColor}
                    strokeWidth={isSelected ? 4 / stage.scale : 2 / stage.scale}
                    opacity={0.8}
                />
                <Circle
                  radius={8 / stage.scale}
                  fill={statusColor}
                  opacity={(junction?.isOverLimit || (junction?.ratingPercent && junction.ratingPercent > 90)) ? opacity : 1}
                  stroke="white"
                  strokeWidth={2 / stage.scale}
                  shadowBlur={junction?.isOverLimit ? 10 : 0}
                  shadowColor="red"
                />
                <Text
                  text={label}
                  fontSize={9 / stage.scale}
                  fill="white"
                  fontStyle="bold"
                  y={pxH/2 + 5 / stage.scale}
                  align="center"
                  width={120 / stage.scale}
                  x={-60 / stage.scale}
                  shadowColor="black"
                  shadowBlur={2}
                  shadowOffset={{x:1, y:1}}
                  shadowOpacity={1}
                  listening={false}
                />
                {(junction?.isOverLimit || junction?.warning) && (
                    <Text
                        text={junction?.isOverLimit ? "⚠️ CRITICAL" : `⚠️ ${junction?.warning}`}
                        fontSize={10 / stage.scale}
                        fill="#ef4444"
                        fontStyle="bold"
                        y={-pxH/2 - 15 / stage.scale}
                        align="center"
                        width={120 / stage.scale}
                        x={-60 / stage.scale}
                        opacity={opacity}
                        listening={false}
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
        <div className="absolute bottom-4 right-4 bg-black/80 text-white p-3 rounded text-[10px] font-mono pointer-events-none border border-white/20 backdrop-blur-sm shadow-xl min-w-[150px]">
            <div className="text-blue-400 font-bold mb-1 border-b border-white/10 pb-1">CURSOR INFO</div>
            <div className="grid grid-cols-2 gap-x-2">
                <span className="text-gray-400">POS X:</span> <span>{mousePos.mmX.toFixed(1)} mm</span>
                <span className="text-gray-400">POS Y:</span> <span>{mousePos.mmY.toFixed(1)} mm</span>
                <span className="text-gray-400">TEMP:</span> <span className={mousePos.temp > 80 ? "text-red-400" : "text-green-400"}>{mousePos.temp.toFixed(1)} °C</span>
                <span className="text-gray-400">k:</span> <span className="text-blue-300">{mousePos.k.toFixed(1)} W/mK</span>
            </div>

            {(() => {
                const nearest = components.map(c => {
                    const dx = c.x - mousePos.mmX;
                    const dy = c.y - mousePos.mmY;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    return { c, dist };
                }).filter(i => i.dist < 20).sort((a,b) => a.dist - b.dist)[0];

                if (nearest) {
                    return (
                        <div className="mt-2 pt-2 border-t border-white/10">
                            <div className="text-emerald-400 font-bold">NEAR: {nearest.c.name}</div>
                            <div className="text-gray-400">Dist: {nearest.dist.toFixed(1)} mm</div>
                        </div>
                    );
                }
                return null;
            })()}
        </div>
      )}

      {mode === 'calibrate' && !calibration.mmPerPixel && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg pointer-events-none">
          Click two points on the image to calibrate scale
        </div>
      )}

      {mode === 'drawBoundary' && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-4 py-2 rounded-full shadow-lg pointer-events-none text-center text-xs">
          Click to add boundary points. Enter to finish. Esc to cancel.
        </div>
      )}

      {mode === 'drawZone' && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-orange-600 text-white px-4 py-2 rounded-full shadow-lg pointer-events-none text-center text-xs">
          Click to add points. Double-click or Enter to finish. Esc to cancel.
        </div>
      )}

      {mode === 'editZone' && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg pointer-events-none text-center text-xs">
              Editing Zone. Drag vertices to move. Click edge to add vertex. Alt+Click to remove. Esc to finish.
          </div>
      )}

      {mode === 'editBoundary' && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg pointer-events-none text-center text-xs">
              Editing PCB Boundary. Drag vertices to move. Click edge to add vertex. Alt+Click to remove. Esc to finish.
          </div>
      )}

      <div className="absolute top-4 left-20 bg-gray-900/80 text-white p-3 rounded-lg text-[10px] font-mono border border-white/10 backdrop-blur-sm pointer-events-none">
          <div className="font-bold text-blue-400 border-b border-white/10 mb-1 pb-1 uppercase">Standard Tools</div>
          <div className="grid grid-cols-[80px_1fr] gap-y-1">
              <span className="text-gray-400">V:</span> <span>Select</span>
              <span className="text-gray-400">H:</span> <span>Pan</span>
              <span className="text-gray-400">E:</span> <span>Edit Geometry</span>
              <span className="text-gray-400">Space:</span> <span>Temp Pan</span>
              <span className="text-gray-400">Esc:</span> <span>Select/Cancel</span>
              <span className="text-gray-400">Delete:</span> <span>Remove</span>
          </div>
      </div>

      <DebugPanel />
    </div>
  );
};

export default CanvasView;

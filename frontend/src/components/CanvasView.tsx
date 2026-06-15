import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Stage, Layer, Image as KonvaImage, Circle, Line, Text, Group, Rect } from 'react-konva';
import { useStore, Component, Selection } from '../store/useStore';
import HeatmapOverlay from './HeatmapOverlay';
import SolverGridOverlay from './SolverGridOverlay';
import ExportLegend from './ExportLegend';
import { PolygonEditor } from './PolygonEditor';
import { KonvaEventObject } from 'konva/lib/Node';
import { computeHeatmap } from '../thermal';
import Konva from 'konva';
import { Zone, Point, PolygonType } from '../thermal/types';
import { isPointInPolygon } from '../thermal/utils';

const CanvasView: React.FC = () => {
  const imageTop = useStore(state => state.imageTop);
  const imageBottom = useStore(state => state.imageBottom);
  const imageDimensionsTop = useStore(state => state.imageDimensionsTop);
  const imageDimensionsBottom = useStore(state => state.imageDimensionsBottom);
  const mode = useStore(state => state.mode);
  const setMode = useStore(state => state.setMode);
  const components = useStore(state => state.components);
  const addComponent = useStore(state => state.addComponent);
  const updateComponent = useStore(state => state.updateComponent);
  const removeComponent = useStore(state => state.removeComponent);
  const selection = useStore(state => state.selection);
  const setSelection = useStore(state => state.setSelection);
  const clearSelection = useStore(state => state.clearSelection);
  const calibration = useStore(state => state.calibration);
  const calibrationTop = useStore(state => state.calibrationTop);
  const calibrationBottom = useStore(state => state.calibrationBottom);
  const setCalibrationPoint = useStore(state => state.setCalibrationPoint);
  const ambientTemperature = useStore(state => state.ambientTemperature);
  const zones = useStore(state => state.zones);
  const addZone = useStore(state => state.addZone);
  const updateZone = useStore(state => state.updateZone);
  const removeZone = useStore(state => state.removeZone);
  const stackup = useStore(state => state.stackup);
  const detailedStackup = useStore(state => state.detailedStackup);
  const heatmapResult = useStore(state => state.heatmapResult);
  const heatmapViewMode = useStore(state => state.heatmapViewMode);
  const setHeatmapResult = useStore(state => state.setHeatmapResult);
  const setStageRef = useStore(state => state.setStageRef);
  const debugPointerEvents = useStore(state => state.debugPointerEvents);

  const bottomImageOffset = useStore(state => state.bottomImageOffset);
  const setBottomImageOffset = useStore(state => state.setBottomImageOffset);
  const bottomImageRotation = useStore(state => state.bottomImageRotation);
  const bottomImageMirrorX = useStore(state => state.bottomImageMirrorX);
  const bottomImageMirrorY = useStore(state => state.bottomImageMirrorY);

  const [stage, setStage] = useState({ scale: 1, x: 0, y: 0 });
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [drawingPoints, setDrawingPoints] = useState<Point[]>([]);
  const [cursorPos, setCursorPos] = useState<Point | null>(null);

  const [mousePos, setMousePos] = useState({ x: 0, y: 0, mmX: 0, mmY: 0, temp: 0, tTop: 0, tBottom: 0, k: 0 });
  const [bgImageTop, setBgImageTop] = useState<HTMLImageElement | null>(null);
  const [bgImageBottom, setBgImageBottom] = useState<HTMLImageElement | null>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const [opacity, setOpacity] = useState(1);

  const pcbBoundary = useMemo(() => zones.find(z => z.type === 'pcbBoundary'), [zones]);
  const boundaryPoints = useMemo(() => pcbBoundary?.points || [], [pcbBoundary]);

  const logPointer = (msg: string, e: any) => {
    if (!debugPointerEvents) return;
    const target = e.target;
    console.log(`[POINTER] ${msg} | mode=${mode} | target=${target.constructor.name} | name=${target.name()} | cancelBubble=${e.cancelBubble}`);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName || '')) return;

        if (e.key === 'Escape') {
            setDrawingPoints([]);
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
            if (selection?.type === 'polygon' || selection?.type === 'polygonVertex') {
              if (selection.shapeType === 'pcbBoundary') setMode('editBoundary');
              else setMode('editZone');
            }
        }

        if (e.key === 'Enter') {
            if ((mode === 'drawZone' || mode === 'drawBoundary') && drawingPoints.length >= 3) {
                const type: PolygonType = mode === 'drawZone' ? 'conductivityZone' : 'pcbBoundary';
                const newZone: Zone = {
                    id: type === 'pcbBoundary' ? 'pcb-boundary' : Math.random().toString(36).substr(2, 9),
                    type,
                    label: type === 'pcbBoundary' ? 'PCB Boundary' : `Zone ${zones.length}`,
                    points: drawingPoints,
                    conductivity: type === 'conductivityZone' ? 50.0 : undefined,
                    enabled: true,
                    editable: true,
                    selectable: true,
                    deletable: type !== 'pcbBoundary'
                };
                if (type === 'pcbBoundary') {
                  const existing = zones.find(z => z.type === 'pcbBoundary');
                  if (existing) removeZone(existing.id);
                }
                addZone(newZone);
                setDrawingPoints([]);
                setSelection({ type: 'polygon', shapeType: type, id: newZone.id });
                setMode(type === 'pcbBoundary' ? 'editBoundary' : 'editZone');
            }
        }

        if (e.key === 'Delete' || e.key === 'Backspace') {
            if (selection?.type === 'component') {
                removeComponent(selection.id);
                clearSelection();
            } else if (selection?.type === 'polygon') {
                const zone = zones.find(z => z.id === selection.id);
                if (zone?.deletable) {
                    removeZone(selection.id);
                    clearSelection();
                } else if (zone?.type === 'pcbBoundary') {
                    alert("PCB Boundary cannot be deleted directly. Redraw it if needed.");
                }
            } else if (selection?.type === 'polygonVertex') {
                const zone = zones.find(z => z.id === selection.id);
                if (zone && zone.points.length > 3) {
                    const newPoints = zone.points.filter((_, i) => i !== selection.vertexIndex);
                    updateZone(zone.id, { points: newPoints });
                } else if (zone) {
                    alert("Shape must have at least 3 vertices.");
                }
                clearSelection();
            }
        }

        if (e.code === 'Space') setIsSpacePressed(true);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
        if (e.code === 'Space') setIsSpacePressed(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
    };
  }, [selection, zones, mode, drawingPoints, setMode, clearSelection, removeComponent, removeZone, updateZone, addZone, setSelection]);

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
    if (imageTop) {
      const img = new window.Image();
      img.src = imageTop;
      img.onload = () => setBgImageTop(img);
    } else {
      setBgImageTop(null);
    }
  }, [imageTop]);

  useEffect(() => {
    if (imageBottom) {
      const img = new window.Image();
      img.src = imageBottom;
      img.onload = () => setBgImageBottom(img);
    } else {
      setBgImageBottom(null);
    }
  }, [imageBottom]);

  useEffect(() => {
    // Use Top Image as the master reference for simulation dimensions
    const simDimensions = imageDimensionsTop || imageDimensionsBottom;
    const simCal = calibrationTop.mmPerPixel || calibrationBottom.mmPerPixel;

    if (!simDimensions || !simCal || components.length === 0) {
        setHeatmapResult(null);
        return;
    }

    const result = computeHeatmap(
        components,
        zones.filter(z => z.type === 'conductivityZone'),
        simDimensions.width * simCal,
        simDimensions.height * simCal,
        boundaryPoints,
        ambientTemperature,
        150,
        stackup,
        detailedStackup
    );
    setHeatmapResult(result);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [components, zones, imageDimensionsTop, imageDimensionsBottom, calibrationTop.mmPerPixel, calibrationBottom.mmPerPixel, ambientTemperature, stackup, setHeatmapResult]);

  // mmToPx uses the "Base Calibration" (Top if available) for consistent stage scaling
  const baseCal = calibrationTop.mmPerPixel ? calibrationTop : (calibrationBottom.mmPerPixel ? calibrationBottom : calibration);

  const mmToPx = useCallback((mm: number) => {
    return baseCal.mmPerPixel ? mm / baseCal.mmPerPixel : mm;
  }, [baseCal]);

  const pxToMm = useCallback((px: number) => {
    return baseCal.mmPerPixel ? px * baseCal.mmPerPixel : px;
  }, [baseCal]);

  const handleMouseMove = (e: any) => {
    const stageObj = e.target.getStage();
    const pointer = stageObj.getRelativePointerPosition();
    if (!pointer) return;

    let temp = ambientTemperature;
    let tTop = ambientTemperature;
    let tBottom = ambientTemperature;
    let k = 0;
    let mmX = 0;
    let mmY = 0;

    if (baseCal.mmPerPixel) {
        mmX = pointer.x * baseCal.mmPerPixel;
        mmY = pointer.y * baseCal.mmPerPixel;

        if (heatmapResult) {
            const dx = heatmapResult.widthMm / heatmapResult.width;
            const gridX = Math.floor(mmX / dx);
            const gridY = Math.floor(mmY / dx);
            if (gridX >= 0 && gridX < heatmapResult.width && gridY >= 0 && gridY < heatmapResult.height) {
                const idx = gridY * heatmapResult.width + gridX;
                tTop = heatmapResult.TTop[idx];
                tBottom = heatmapResult.TBottom[idx];
                k = heatmapResult.kGrid[idx];

                if (heatmapViewMode === 'top') temp = tTop;
                else if (heatmapViewMode === 'bottom') temp = tBottom;
                else if (heatmapViewMode === 'difference') temp = tTop - tBottom;
                else temp = Math.max(tTop, tBottom);
            }
        }
    }

    setMousePos({ x: pointer.x, y: pointer.y, mmX, mmY, temp, tTop, tBottom, k });
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

    const mmX = pos.x * (baseCal.mmPerPixel || 1);
    const mmY = pos.y * (baseCal.mmPerPixel || 1);
    const pointMm = { x: mmX, y: mmY };

    if (mode === 'calibrate') {
      setCalibrationPoint({ x: pos.x, y: pos.y });
      return;
    }

    if (mode === 'drawBoundary' || mode === 'drawZone') {
        if (!baseCal.mmPerPixel) {
            alert("Calibrate first!");
            return;
        }
        if (mode === 'drawZone' && boundaryPoints.length >= 3 && !isPointInPolygon(pointMm, boundaryPoints)) {
          return;
        }
        setDrawingPoints([...drawingPoints, pointMm]);
        return;
    }

    if (mode === 'addComponent') {
      if (!baseCal.mmPerPixel) {
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

    if (e.target === e.target.getStage() && (mode === 'select' || mode === 'editZone' || mode === 'editBoundary')) {
      clearSelection();
      setMode('select');
    }
  };

  if (!imageTop && !imageBottom) {
    return (
      <div className="flex-1 bg-gray-200 flex items-center justify-center text-gray-500">
        <p>No image loaded. Click the upload button to start.</p>
      </div>
    );
  }

  const drawingPointsPx = drawingPoints.flatMap(p => [mmToPx(p.x), mmToPx(p.y)]);

  const getCursor = () => {
    if (isSpacePressed) return 'grabbing';
    if (mode === 'pan' || heatmapViewMode === 'align') return 'grab';
    if (['drawZone', 'drawBoundary', 'addComponent', 'calibrate'].includes(mode)) return 'crosshair';
    return 'default';
  };

  const stageWidth = window.innerWidth - 64 - 256;
  const stageHeight = window.innerHeight - 64;

  const currentDimensions = heatmapViewMode === 'bottom' ? (imageDimensionsBottom || imageDimensionsTop) : (imageDimensionsTop || imageDimensionsBottom);

  return (
    <div className="flex-1 bg-gray-300 relative overflow-hidden" style={{ cursor: getCursor() }}>
      <Stage
        width={stageWidth}
        height={stageHeight}
        onWheel={handleWheel}
        onClick={handleStageClick}
        ref={(node) => {
            if (node && node !== stageRef.current) {
                (stageRef as any).current = node;
                setStageRef(node);
            }
        }}
        onDblClick={(e) => {
            if ((mode === 'drawZone' || mode === 'drawBoundary') && drawingPoints.length >= 3) {
              const type: PolygonType = mode === 'drawZone' ? 'conductivityZone' : 'pcbBoundary';
              const newZone: Zone = {
                  id: type === 'pcbBoundary' ? 'pcb-boundary' : Math.random().toString(36).substr(2, 9),
                  type,
                  label: type === 'pcbBoundary' ? 'PCB Boundary' : `Zone ${zones.length}`,
                  points: drawingPoints,
                  conductivity: type === 'conductivityZone' ? 50.0 : undefined,
                  enabled: true,
                  editable: true,
                  selectable: true,
                  deletable: type !== 'pcbBoundary'
              };
              if (type === 'pcbBoundary') {
                const existing = zones.find(z => z.type === 'pcbBoundary');
                if (existing) removeZone(existing.id);
              }
              addZone(newZone);
              setDrawingPoints([]);
              setSelection({ type: 'polygon', shapeType: type, id: newZone.id });
              setMode(type === 'pcbBoundary' ? 'editBoundary' : 'editZone');
            }
        }}
        onMouseMove={handleMouseMove}
        onDragEnd={(e) => {
          if (e.target.attrs.name === 'STAGE_DRAG_RECT' || e.target === stageRef.current) {
            setStage({ ...stage, x: e.target.x(), y: e.target.y() });
          }
        }}
      >
        <Layer
            draggable={isSpacePressed || mode === 'pan'}
            onDragEnd={(e) => {
              if (e.target === e.currentTarget) {
                setStage({ ...stage, x: e.target.x(), y: e.target.y() });
              }
            }}
            x={stage.x}
            y={stage.y}
            scaleX={stage.scale}
            scaleY={stage.scale}
        >
          {/* Background to catch drag events for panning */}
          {(imageDimensionsTop || imageDimensionsBottom) && (
            <Rect
              width={Math.max(imageDimensionsTop?.width || 0, imageDimensionsBottom?.width || 0)}
              height={Math.max(imageDimensionsTop?.height || 0, imageDimensionsBottom?.height || 0)}
              fill="transparent"
              listening={isSpacePressed || mode === 'pan'}
            />
          )}

          {/* Top Image (Reference) */}
          {bgImageTop && (heatmapViewMode !== 'bottom' || heatmapViewMode === 'align') && (
              <KonvaImage
                image={bgImageTop}
                opacity={heatmapViewMode === 'align' ? 0.5 : 1}
                listening={false}
                name="PCB_IMAGE_TOP"
              />
          )}

          {/* Bottom Image (Transformed) */}
          {bgImageBottom && (heatmapViewMode === 'bottom' || heatmapViewMode === 'align') && (
              <KonvaImage
                  image={bgImageBottom}
                  x={mmToPx(bottomImageOffset.x)}
                  y={mmToPx(bottomImageOffset.y)}
                  rotation={bottomImageRotation}
                  scaleX={(calibrationBottom.mmPerPixel && calibrationTop.mmPerPixel ? calibrationBottom.mmPerPixel / calibrationTop.mmPerPixel : 1) * (bottomImageMirrorX ? -1 : 1)}
                  scaleY={(calibrationBottom.mmPerPixel && calibrationTop.mmPerPixel ? calibrationBottom.mmPerPixel / calibrationTop.mmPerPixel : 1) * (bottomImageMirrorY ? -1 : 1)}
                  offsetX={bottomImageMirrorX ? bgImageBottom.width : 0}
                  offsetY={bottomImageMirrorY ? bgImageBottom.height : 0}
                  opacity={heatmapViewMode === 'align' ? 0.5 : 1}
                  draggable={heatmapViewMode === 'align'}
                  onDragEnd={(e) => {
                      setBottomImageOffset({
                          x: pxToMm(e.target.x()),
                          y: pxToMm(e.target.y())
                      });
                  }}
                  onMouseEnter={(e) => {
                      if (heatmapViewMode === 'align') {
                          const stage = e.target.getStage();
                          if (stage) stage.container().style.cursor = 'move';
                      }
                  }}
                  onMouseLeave={(e) => {
                      if (heatmapViewMode === 'align') {
                          const stage = e.target.getStage();
                          if (stage) stage.container().style.cursor = getCursor();
                      }
                  }}
                  listening={heatmapViewMode === 'align'}
                  name="PCB_IMAGE_BOTTOM"
              />
          )}

          {/* Overlays (Heatmap, Grid, Geometry) - Always in global MM space relative to Top Reference */}
          <Group name="OVERLAYS">
            {baseCal.mmPerPixel && currentDimensions && (
                <HeatmapOverlay width={mmToPx(currentDimensions.width * (calibrationTop.mmPerPixel || calibrationBottom.mmPerPixel || 1))} height={mmToPx(currentDimensions.height * (calibrationTop.mmPerPixel || calibrationBottom.mmPerPixel || 1))} />
            )}

            <SolverGridOverlay />

            {heatmapResult && baseCal.mmPerPixel && currentDimensions && (
                <Group name="HOTSPOTS" listening={false}>
                {/* Max Board Temp Hotspot */}
                {(() => {
                    const cellWidthPx = mmToPx(heatmapResult.widthMm) / heatmapResult.width;
                    const cellHeightPx = mmToPx(heatmapResult.heightMm) / heatmapResult.height;

                    let hotspots: { idx: number, label: string, color: string }[] = [];

                    if (heatmapViewMode === 'top') {
                        hotspots.push({ idx: heatmapResult.maxTempIdxTop, label: `MAX TOP: ${heatmapResult.TTop[heatmapResult.maxTempIdxTop].toFixed(1)}°C`, color: "#ef4444" });
                    } else if (heatmapViewMode === 'bottom') {
                        hotspots.push({ idx: heatmapResult.maxTempIdxBottom, label: `MAX BOT: ${heatmapResult.TBottom[heatmapResult.maxTempIdxBottom].toFixed(1)}°C`, color: "#ef4444" });
                    } else if (heatmapViewMode === 'max') {
                        hotspots.push({ idx: heatmapResult.maxTempIdx, label: `MAX BOARD: ${heatmapResult.maxTemp.toFixed(1)}°C`, color: "#ef4444" });
                    } else if (heatmapViewMode === 'difference') {
                        let minIdx = 0, maxIdx = 0, minVal = Infinity, maxVal = -Infinity;
                        for (let i = 0; i < heatmapResult.TTop.length; i++) {
                            const d = heatmapResult.TTop[i] - heatmapResult.TBottom[i];
                            if (d < minVal) { minVal = d; minIdx = i; }
                            if (d > maxVal) { maxVal = d; maxIdx = i; }
                        }
                        hotspots.push({ idx: maxIdx, label: `MAX Δ: +${maxVal.toFixed(1)}°C`, color: "#ef4444" });
                        hotspots.push({ idx: minIdx, label: `MIN Δ: ${minVal.toFixed(1)}°C`, color: "#3b82f6" });
                    }

                    return hotspots.map((hs, i) => {
                        const x = ((hs.idx % heatmapResult.width) + 0.5) * cellWidthPx;
                        const y = (Math.floor(hs.idx / heatmapResult.width) + 0.5) * cellHeightPx;
                        return (
                            <Group key={`hotspot-${i}`} x={x} y={y}>
                            <Circle radius={10 / stage.scale} stroke={hs.color} strokeWidth={2 / stage.scale} dash={[2, 2]} />
                            <Line points={[-15 / stage.scale, 0, 15 / stage.scale, 0]} stroke={hs.color} strokeWidth={1 / stage.scale} />
                            <Line points={[0, -15 / stage.scale, 0, 15 / stage.scale]} stroke={hs.color} strokeWidth={1 / stage.scale} />
                            <Text text={hs.label} fill={hs.color} fontSize={10 / stage.scale} fontStyle="bold" y={12 / stage.scale} x={-40 / stage.scale} align="center" width={80 / stage.scale} shadowBlur={2} shadowColor="black" />
                            </Group>
                        );
                    });
                })()}

                {/* Over-limit components */}
                {heatmapResult.junctions.filter(j => j.isOverLimit || (j.ratingPercent && j.ratingPercent > 90)).map(j => {
                    const comp = components.find(c => c.id === j.compId);
                    if (!comp) return null;
                    return (
                        <Group key={`hotspot-${comp.id}`} x={mmToPx(comp.x)} y={mmToPx(comp.y)}>
                            <Rect
                            x={-mmToPx(comp.width)/2 - 5 / stage.scale}
                            y={-mmToPx(comp.height)/2 - 5 / stage.scale}
                            width={mmToPx(comp.width) + 10 / stage.scale}
                            height={mmToPx(comp.height) + 10 / stage.scale}
                            stroke="#ef4444"
                            strokeWidth={3 / stage.scale}
                            />
                        </Group>
                    );
                })}
                </Group>
            )}

            {mode === 'calibrate' && (
                <Group listening={true}>
                {calibration.point1 && (
                    <Circle
                    x={calibration.point1.x}
                    y={calibration.point1.y}
                    radius={6 / stage.scale}
                    fill="#ef4444"
                    stroke="white"
                    strokeWidth={2 / stage.scale}
                    />
                )}
                {calibration.point2 && (
                    <Circle
                    x={calibration.point2.x}
                    y={calibration.point2.y}
                    radius={6 / stage.scale}
                    fill="#ef4444"
                    stroke="white"
                    strokeWidth={2 / stage.scale}
                    />
                )}
                {calibration.point1 && calibration.point2 && (
                    <Line
                    points={[
                        calibration.point1.x, calibration.point1.y,
                        calibration.point2.x, calibration.point2.y
                    ]}
                    stroke="#ef4444"
                    strokeWidth={3 / stage.scale}
                    dash={[5, 5]}
                    />
                )}
                </Group>
            )}

            <Group name="GEOMETRY">
                {pcbBoundary && <PolygonEditor shape={pcbBoundary} mmToPx={mmToPx} pxToMm={pxToMm} />}
                {zones.filter(z => z.type !== 'pcbBoundary').map(zone => (
                    <PolygonEditor key={zone.id} shape={zone} mmToPx={mmToPx} pxToMm={pxToMm} />
                ))}

                {(mode === 'drawZone' || mode === 'drawBoundary') && drawingPoints.length > 0 && (
                    <Group>
                        <Line points={drawingPointsPx} stroke="#3b82f6" strokeWidth={2 / stage.scale} dash={[5, 5]} />
                        {cursorPos && (
                            <Line
                                points={[mmToPx(drawingPoints[drawingPoints.length-1].x), mmToPx(drawingPoints[drawingPoints.length-1].y), mmToPx(cursorPos.x), mmToPx(cursorPos.y)]}
                                stroke="#3b82f6" strokeWidth={2 / stage.scale} opacity={0.5}
                            />
                        )}
                        {drawingPoints.map((p, i) => (
                            <Circle key={`drawing-p-${i}`} x={mmToPx(p.x)} y={mmToPx(p.y)} radius={4 / stage.scale} fill="#3b82f6" />
                        ))}
                    </Group>
                )}

                {components.map((comp) => {
                    const pxX = mmToPx(comp.x);
                    const pxY = mmToPx(comp.y);
                    const pxW = mmToPx(comp.width);
                    const pxH = mmToPx(comp.height);
                    const isSelected = selection?.type === 'component' && selection.id === comp.id;

                    const junction = heatmapResult?.junctions.find(j => j.compId === comp.id);
                    let statusColor = "#10b981";
                    if (junction) {
                        if (junction.isOverLimit) statusColor = "#ef4444";
                        else if (junction.ratingPercent && junction.ratingPercent > 90) statusColor = "#ef4444";
                        else if (junction.ratingPercent && junction.ratingPercent > 70) statusColor = "#f59e0b";
                    }

                    const sideLabel = (comp.side || 'top').toUpperCase()[0];
                    const label = `[${sideLabel}] ${comp.name}\nTj: ${junction?.tj?.toFixed(1) ?? 'N/A'}°C\nTpcb: ${junction?.tPcb.toFixed(1)}°C`;

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
                            updateComponent(comp.id, {
                                x: pxToMm(e.target.x()),
                                y: pxToMm(e.target.y()),
                            });
                        }}
                        onClick={(e: KonvaEventObject<MouseEvent>) => {
                            logPointer("CompClick", e);
                            e.cancelBubble = true;
                            setSelection({ type: 'component', id: comp.id });
                        }}
                    >
                        <Rect x={-pxW/2} y={-pxH/2} width={pxW} height={pxH} fill="transparent"
                            stroke={isSelected ? "#3b82f6" : statusColor} strokeWidth={isSelected ? 4 / stage.scale : 2 / stage.scale} opacity={0.8}
                            dash={comp.side === 'bottom' ? [4, 2] : undefined} />
                        <Circle radius={8 / stage.scale} fill={statusColor} opacity={(junction?.isOverLimit || (junction?.ratingPercent && junction.ratingPercent > 90)) ? opacity : 1}
                        stroke="white" strokeWidth={2 / stage.scale} shadowBlur={junction?.isOverLimit ? 10 : 0} shadowColor="red" />
                        <Text text={label} fontSize={9 / stage.scale} fill="white" fontStyle="bold" y={pxH/2 + 5 / stage.scale} align="center" width={120 / stage.scale} x={-60 / stage.scale} shadowColor="black" shadowBlur={2} shadowOffset={{x:1, y:1}} shadowOpacity={1} listening={false} />
                    </Group>
                    );
                })}
            </Group>
          </Group>
        </Layer>

        {/* Fixed overlays layer (not scaled/panned) */}
        <Layer listening={false}>
            <ExportLegend />
        </Layer>
      </Stage>

      {baseCal.mmPerPixel && (
        <div className="absolute bottom-4 right-4 bg-black/80 text-white p-3 rounded text-[10px] font-mono pointer-events-none border border-white/20 backdrop-blur-sm shadow-xl min-w-[150px]">
            <div className="text-blue-400 font-bold mb-1 border-b border-white/10 pb-1">CURSOR INFO</div>
            <div className="grid grid-cols-2 gap-x-2">
                <span className="text-gray-400">POS X:</span> <span>{mousePos.mmX.toFixed(1)} mm</span>
                <span className="text-gray-400">POS Y:</span> <span>{mousePos.mmY.toFixed(1)} mm</span>
                <span className="text-gray-400">TOP:</span> <span className="text-orange-300">{mousePos.tTop.toFixed(1)} °C</span>
                <span className="text-gray-400">BOT:</span> <span className="text-blue-300">{mousePos.tBottom.toFixed(1)} °C</span>
                <span className="text-gray-400">VIEW:</span> <span className={Math.abs(mousePos.temp) > 80 ? "text-red-400" : "text-green-400"}>{mousePos.temp.toFixed(1)} {heatmapViewMode === 'difference' ? 'Δ°C' : '°C'}</span>
                <span className="text-gray-400">k:</span> <span className="text-blue-300">{mousePos.k.toFixed(1)} W/mK</span>
            </div>
        </div>
      )}

      {mode === 'calibrate' && !baseCal.mmPerPixel && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg pointer-events-none">
          Click two points on the image to calibrate scale
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
    </div>
  );
};

export default CanvasView;

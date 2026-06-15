import React from 'react';
import { Group, Line, Circle } from 'react-konva';
import { useStore } from '../store/useStore';
import { Zone, Point } from '../thermal/types';

interface PolygonEditorProps {
  shape: Zone;
  mmToPx: (mm: number) => number;
  pxToMm: (px: number) => number;
}

export const PolygonEditor: React.FC<PolygonEditorProps> = ({ shape, mmToPx, pxToMm }) => {
  const { mode, selection, setSelection, updateZone, clearSelection } = useStore();

  const isSelected = selection?.type === 'polygon' && selection.id === shape.id;
  const isVertexSelected = selection?.type === 'polygonVertex' && selection.id === shape.id;
  const isAnyPartSelected = isSelected || isVertexSelected;

  const pointsPx = shape.points.flatMap(p => [mmToPx(p.x), mmToPx(p.y)]);

  const getStrokeColor = () => {
    if (isAnyPartSelected) return "#3b82f6";
    if (shape.type === 'pcbBoundary') return "#10b981";
    return "#f59e0b";
  };

  const getFillColor = () => {
    if (isAnyPartSelected) return "#3b82f622";
    if (shape.type === 'pcbBoundary') return "#10b98111";
    return "#f59e0b11";
  };

  const isEditableMode = (mode === 'editZone' && shape.type !== 'pcbBoundary') || (mode === 'editBoundary' && shape.type === 'pcbBoundary');
  const isInteractive = mode === 'select' || isEditableMode;

  const handlePolygonClick = (e: any) => {
    e.cancelBubble = true;
    setSelection({ type: 'polygon', shapeType: shape.type, id: shape.id });
  };

  const findInsertIndex = (points: Point[], clickPos: { x: number, y: number }) => {
    let minD = Infinity;
    let insertIdx = points.length;
    for (let i = 0; i < points.length; i++) {
        const p1 = { x: mmToPx(points[i].x), y: mmToPx(points[i].y) };
        const p2 = { x: mmToPx(points[(i + 1) % points.length].x), y: mmToPx(points[(i + 1) % points.length].y) };
        const px = clickPos.x, py = clickPos.y;
        const l2 = Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2);
        if (l2 === 0) continue;
        let t = Math.max(0, Math.min(1, ((px - p1.x) * (p2.x - p1.x) + (py - p1.y) * (p2.y - p1.y)) / l2));
        const d = Math.sqrt(Math.pow(px - (p1.x + t * (p2.x - p1.x)), 2) + Math.pow(py - (p1.y + t * (p2.y - p1.y)), 2));
        if (d < minD) { minD = d; insertIdx = i + 1; }
    }
    return { minD, insertIdx };
  };

  const handleEdgeClick = (e: any) => {
    if (!isEditableMode) return;
    const stage = e.target.getStage();
    if (!stage) return;
    const pos = stage.getRelativePointerPosition();
    if (pos) {
      const { minD, insertIdx } = findInsertIndex(shape.points, pos);
      if (minD < 20) {
        const newPoints = [...shape.points];
        newPoints.splice(insertIdx, 0, { x: pxToMm(pos.x), y: pxToMm(pos.y) });
        updateZone(shape.id, { points: newPoints });
        e.cancelBubble = true;
      }
    }
  };

  return (
    <Group>
      <Line
        points={pointsPx}
        stroke={getStrokeColor()}
        strokeWidth={(isAnyPartSelected ? 4 : 2)}
        closed={true}
        fill={getFillColor()}
        hitStrokeWidth={20}
        listening={isInteractive}
        onClick={(e) => {
          handlePolygonClick(e);
          handleEdgeClick(e);
        }}
        onMouseEnter={(e) => {
          if (mode === 'select') {
            const stage = e.target.getStage();
            if (stage) stage.container().style.cursor = 'pointer';
          }
        }}
        onMouseLeave={(e) => {
          if (mode === 'select') {
            const stage = e.target.getStage();
            if (stage) stage.container().style.cursor = 'default';
          }
        }}
      />
      {isAnyPartSelected && shape.points.map((p, i) => {
        const isThisVertexSelected = selection?.type === 'polygonVertex' && selection.id === shape.id && selection.vertexIndex === i;
        return (
          <Circle
            key={`${shape.id}-v-${i}`}
            x={mmToPx(p.x)}
            y={mmToPx(p.y)}
            radius={(isThisVertexSelected ? 8 : 6)}
            fill={isThisVertexSelected ? "#3b82f6" : getStrokeColor()}
            stroke="white"
            strokeWidth={1}
            draggable={isEditableMode}
            listening={isInteractive}
            onDragEnd={(e) => {
              const newPoints = [...shape.points];
              newPoints[i] = { x: pxToMm(e.target.x()), y: pxToMm(e.target.y()) };
              updateZone(shape.id, { points: newPoints });
            }}
            onClick={(e) => {
              e.cancelBubble = true;
              if (e.evt.altKey) {
                if (shape.points.length > 3) {
                  const newPoints = shape.points.filter((_, idx) => idx !== i);
                  updateZone(shape.id, { points: newPoints });
                  clearSelection();
                } else {
                  alert("Shape must have at least 3 vertices.");
                }
              } else {
                setSelection({ type: 'polygonVertex', shapeType: shape.type, id: shape.id, vertexIndex: i });
              }
            }}
            onMouseEnter={(e) => {
              if (isEditableMode) {
                const stage = e.target.getStage();
                if (stage) stage.container().style.cursor = 'move';
              }
            }}
            onMouseLeave={(e) => {
              if (isEditableMode) {
                const stage = e.target.getStage();
                if (stage) stage.container().style.cursor = 'default';
              }
            }}
          />
        );
      })}
    </Group>
  );
};

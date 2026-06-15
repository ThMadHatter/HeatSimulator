import { create } from 'zustand';
import { Zone, HeatmapResult, Stackup, PolygonType, BoardStackup, StackupLayer, HeatmapViewMode } from '../thermal/types';
import Konva from 'konva';

export interface Component {
  id: string;
  name: string;
  x: number; // mm (center)
  y: number; // mm (center)
  width: number; // mm
  height: number; // mm
  power: number; // W
  thetaJA?: number; // °C/W
  thetaJC?: number; // °C/W
  maxTemperature?: number; // °C
  side?: 'top' | 'bottom';
}

export interface Calibration {
  point1: { x: number; y: number } | null; // pixel
  point2: { x: number; y: number } | null; // pixel
  distanceMm: number;
  mmPerPixel: number | null;
}

export type InteractionMode =
  | 'select'
  | 'pan'
  | 'calibrate'
  | 'drawBoundary'
  | 'editBoundary'
  | 'drawZone'
  | 'editZone'
  | 'addComponent';

export type Selection =
  | { type: 'component'; id: string }
  | { type: 'polygon'; shapeType: PolygonType; id: string }
  | { type: 'polygonVertex'; shapeType: PolygonType; id: string; vertexIndex: number }
  | null;

interface State {
  image: string | null;
  imageDimensions: { width: number; height: number } | null;
  imageTop: string | null;
  imageBottom: string | null;
  imageDimensionsTop: { width: number; height: number } | null;
  imageDimensionsBottom: { width: number; height: number } | null;
  components: Component[];
  zones: Zone[];
  stackup: Stackup;
  detailedStackup: BoardStackup;
  calibration: Calibration;
  ambientTemperature: number; // °C
  globalMaxTemperature: number | null; // °C

  mode: InteractionMode;
  selection: Selection;

  heatmapOpacity: number;
  showGrid: boolean;
  showConductivityMap: boolean;
  heatmapResult: HeatmapResult | null;
  heatmapViewMode: HeatmapViewMode;
  manualHeatmapMaxTemperatureC: number | null;
  debugPointerEvents: boolean;
  stageRef: Konva.Stage | null;

  // Actions
  setImage: (image: string | null, width?: number, height?: number) => void;
  setImageSide: (side: 'top' | 'bottom', image: string | null, width?: number, height?: number) => void;
  setMode: (mode: InteractionMode) => void;
  setSelection: (selection: Selection) => void;
  clearSelection: () => void;

  addComponent: (comp: Component) => void;
  updateComponent: (id: string, updates: Partial<Component>) => void;
  removeComponent: (id: string) => void;

  addZone: (zone: Zone) => void;
  updateZone: (id: string, updates: Partial<Zone>) => void;
  removeZone: (id: string) => void;

  setStackup: (stackup: Partial<Stackup>) => void;
  setDetailedStackup: (stackup: BoardStackup) => void;
  updateStackupLayer: (layerId: string, updates: Partial<StackupLayer>) => void;

  setCalibrationPoint: (point: { x: number; y: number }) => void;
  setCalibrationDistance: (distance: number) => void;
  resetCalibration: () => void;

  setAmbientTemperature: (temp: number) => void;
  setGlobalMaxTemperature: (temp: number | null) => void;

  setHeatmapOpacity: (opacity: number) => void;
  setShowGrid: (showGrid: boolean) => void;
  setShowConductivityMap: (show: boolean) => void;
  setHeatmapResult: (result: HeatmapResult | null) => void;
  setHeatmapViewMode: (mode: HeatmapViewMode) => void;
  setManualHeatmapMaxTemperatureC: (temp: number | null) => void;
  setDebugPointerEvents: (enabled: boolean) => void;
  setStageRef: (ref: Konva.Stage | null) => void;
}

export const useStore = create<State>((set) => ({
  image: null,
  imageDimensions: null,
  imageTop: null,
  imageBottom: null,
  imageDimensionsTop: null,
  imageDimensionsBottom: null,
  components: [],
  zones: [],
  stackup: {
    boardThicknessMm: 1.6,
    layerCount: 2,
    copperOzPerLayer: 1,
    estimatedCopperCoveragePercent: 80,
    baseConductivityMode: 'manual',
  },
  detailedStackup: {
    layers: [
      { id: 'top-cu', name: 'Top Copper', type: 'copper', thicknessUm: 35, conductivityWmK: 385, copperCoveragePercent: 50 },
      { id: 'core', name: 'FR4 Core', type: 'core', thicknessUm: 1530, conductivityWmK: 0.35 },
      { id: 'bot-cu', name: 'Bottom Copper', type: 'copper', thicknessUm: 35, conductivityWmK: 385, copperCoveragePercent: 50 },
    ]
  },
  calibration: {
    point1: null,
    point2: null,
    distanceMm: 0,
    mmPerPixel: null,
  },
  ambientTemperature: 25,
  globalMaxTemperature: null,

  mode: 'select',
  selection: null,

  heatmapOpacity: 0.6,
  showGrid: false,
  showConductivityMap: false,
  heatmapResult: null,
  heatmapViewMode: 'top',
  manualHeatmapMaxTemperatureC: null,
  debugPointerEvents: false,
  stageRef: null,

  setImage: (image, width, height) => set({
    image,
    imageDimensions: width && height ? { width, height } : null,
    imageTop: image,
    imageDimensionsTop: width && height ? { width, height } : null,
    components: [],
    zones: [],
    selection: null,
    calibration: { point1: null, point2: null, distanceMm: 0, mmPerPixel: null }
  }),
  setImageSide: (side, image, width, height) => set((state) => {
    const updates: Partial<State> = {};
    if (side === 'top') {
      updates.imageTop = image;
      updates.imageDimensionsTop = width && height ? { width, height } : null;
      // Also update the legacy main image if this is the first image or current image
      if (!state.image || state.image === state.imageTop) {
        updates.image = image;
        updates.imageDimensions = width && height ? { width, height } : null;
      }
    } else {
      updates.imageBottom = image;
      updates.imageDimensionsBottom = width && height ? { width, height } : null;
      if (!state.image) {
        updates.image = image;
        updates.imageDimensions = width && height ? { width, height } : null;
      }
    }
    return updates;
  }),
  setMode: (mode) => set({ mode }),
  setSelection: (selection) => set((state) => {
    // Simple equality check to avoid re-renders
    if (JSON.stringify(state.selection) === JSON.stringify(selection)) return state;
    return { selection };
  }),
  clearSelection: () => set({ selection: null }),

  addComponent: (comp) => set((state) => ({ components: [...state.components, comp] })),
  updateComponent: (id, updates) => set((state) => ({
    components: state.components.map((c) => (c.id === id ? { ...c, ...updates } : c)),
  })),
  removeComponent: (id) => set((state) => ({
    components: state.components.filter((c) => c.id !== id),
    selection: (state.selection?.type === 'component' && state.selection.id === id) ? null : state.selection,
  })),

  addZone: (zone) => set((state) => ({ zones: [...state.zones, zone] })),
  updateZone: (id, updates) => set((state) => ({
    zones: state.zones.map((z) => (z.id === id ? { ...z, ...updates } : z)),
  })),
  removeZone: (id) => set((state) => ({
    zones: state.zones.filter((z) => z.id !== id),
    selection: (state.selection?.id === id) ? null : state.selection,
  })),

  setStackup: (updates) => set((state) => ({ stackup: { ...state.stackup, ...updates } })),
  setDetailedStackup: (detailedStackup) => set({ detailedStackup }),
  updateStackupLayer: (layerId, updates) => set((state) => ({
    detailedStackup: {
      ...state.detailedStackup,
      layers: state.detailedStackup.layers.map(l => l.id === layerId ? { ...l, ...updates } : l)
    }
  })),

  setCalibrationPoint: (point) => set((state) => {
    if (!state.calibration.point1) {
      return { calibration: { ...state.calibration, point1: point } };
    }
    if (!state.calibration.point2) {
      const p1 = state.calibration.point1;
      const distPx = Math.sqrt(Math.pow(point.x - p1.x, 2) + Math.pow(point.y - p1.y, 2));
      const mmPerPixel = state.calibration.distanceMm > 0 ? state.calibration.distanceMm / distPx : null;
      return { calibration: { ...state.calibration, point2: point, mmPerPixel } };
    }
    return { calibration: { ...state.calibration, point1: point, point2: null, mmPerPixel: null } };
  }),
  setCalibrationDistance: (distance) => set((state) => {
    let mmPerPixel = null;
    if (state.calibration.point1 && state.calibration.point2) {
      const p1 = state.calibration.point1;
      const distPx = Math.sqrt(Math.pow(state.calibration.point2.x - p1.x, 2) + Math.pow(state.calibration.point2.y - p1.y, 2));
      mmPerPixel = distance / distPx;
    }
    return { calibration: { ...state.calibration, distanceMm: distance, mmPerPixel } };
  }),
  resetCalibration: () => set({ calibration: { point1: null, point2: null, distanceMm: 0, mmPerPixel: null } }),

  setAmbientTemperature: (ambientTemperature) => set({ ambientTemperature }),
  setGlobalMaxTemperature: (globalMaxTemperature) => set({ globalMaxTemperature }),

  setHeatmapOpacity: (heatmapOpacity) => set({ heatmapOpacity }),
  setShowGrid: (showGrid) => set({ showGrid }),
  setShowConductivityMap: (show) => set({ showConductivityMap: show }),
  setHeatmapResult: (heatmapResult) => set({ heatmapResult }),
  setHeatmapViewMode: (heatmapViewMode) => set({ heatmapViewMode }),
  setManualHeatmapMaxTemperatureC: (manualHeatmapMaxTemperatureC) => set({ manualHeatmapMaxTemperatureC }),
  setDebugPointerEvents: (debugPointerEvents) => set({ debugPointerEvents }),
  setStageRef: (stageRef) => set({ stageRef }),
}));

if (typeof window !== 'undefined') {
  (window as any).useStore = useStore;
}

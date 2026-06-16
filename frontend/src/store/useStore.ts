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
  shape?: 'rect' | 'circle';
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
  calibrationTop: Calibration;
  calibrationBottom: Calibration;
  bottomImageOffset: { x: number; y: number }; // mm
  bottomImageRotation: number; // degrees
  bottomImageMirrorX: boolean;
  bottomImageMirrorY: boolean;
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
  debugCoords: boolean;
  stageRef: Konva.Stage | null;

  layers: {
    heatmap: { visible: boolean; locked: boolean };
    components: { visible: boolean; locked: boolean };
    zones: { visible: boolean; locked: boolean };
    boundary: { visible: boolean; locked: boolean };
    grid: { visible: boolean; locked: boolean };
  };

  navigation: {
    zoom: number;
    cursorMm: { x: number; y: number } | null;
  };

  studyArea: {
    enabled: boolean;
    shape: 'rect' | 'circle';
    rectMm: { x: number, y: number, width: number, height: number };
  };

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

  setCalibrationPoint: (point: { x: number; y: number }, side?: 'top' | 'bottom') => void;
  setCalibrationDistance: (distance: number, side?: 'top' | 'bottom') => void;
  resetCalibration: (side?: 'top' | 'bottom') => void;
  setBottomImageOffset: (offset: { x: number; y: number }) => void;
  setBottomImageRotation: (rotation: number) => void;
  setBottomImageMirrorX: (mirror: boolean) => void;
  setBottomImageMirrorY: (mirror: boolean) => void;

  setAmbientTemperature: (temp: number) => void;
  setGlobalMaxTemperature: (temp: number | null) => void;

  setHeatmapOpacity: (opacity: number) => void;
  setShowGrid: (showGrid: boolean) => void;
  setShowConductivityMap: (show: boolean) => void;
  setHeatmapResult: (result: HeatmapResult | null) => void;
  setHeatmapViewMode: (mode: HeatmapViewMode) => void;
  setManualHeatmapMaxTemperatureC: (temp: number | null) => void;
  setDebugPointerEvents: (enabled: boolean) => void;
  setDebugCoords: (enabled: boolean) => void;
  setLayerState: (layer: keyof State['layers'], updates: Partial<State['layers']['heatmap']>) => void;
  setNavigation: (nav: Partial<State['navigation']>) => void;
  setStudyArea: (studyArea: Partial<State['studyArea']>) => void;
  setStageRef: (ref: Konva.Stage | null) => void;
}

const initialCalibration: Calibration = {
  point1: null,
  point2: null,
  distanceMm: 0,
  mmPerPixel: null,
};

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
  calibration: { ...initialCalibration },
  calibrationTop: { ...initialCalibration },
  calibrationBottom: { ...initialCalibration },
  bottomImageOffset: { x: 0, y: 0 },
  bottomImageRotation: 0,
  bottomImageMirrorX: false,
  bottomImageMirrorY: false,
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
  debugCoords: false,
  navigation: {
    zoom: 1,
    cursorMm: null,
  },
  studyArea: {
    enabled: false,
    shape: 'rect',
    rectMm: { x: 0, y: 0, width: 50, height: 50 }
  },
  layers: {
    heatmap: { visible: true, locked: false },
    components: { visible: true, locked: false },
    zones: { visible: true, locked: false },
    boundary: { visible: true, locked: false },
    grid: { visible: false, locked: true },
  },
  stageRef: null,

  setImage: (image, width, height) => set({
    image,
    imageDimensions: width && height ? { width, height } : null,
    imageTop: image,
    imageDimensionsTop: width && height ? { width, height } : null,
    components: [],
    zones: [],
    selection: null,
    calibration: { ...initialCalibration },
    calibrationTop: { ...initialCalibration },
  }),
  setImageSide: (side, image, width, height) => set((state) => {
    const updates: Partial<State> = {};
    if (side === 'top') {
      updates.imageTop = image;
      updates.imageDimensionsTop = width && height ? { width, height } : null;
      if (!state.image || state.image === state.imageTop) {
        updates.image = image;
        updates.imageDimensions = width && height ? { width, height } : null;
        updates.calibration = state.calibrationTop;
      }
    } else {
      updates.imageBottom = image;
      updates.imageDimensionsBottom = width && height ? { width, height } : null;
      if (!state.image) {
        updates.image = image;
        updates.imageDimensions = width && height ? { width, height } : null;
        updates.calibration = state.calibrationBottom;
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

  setCalibrationPoint: (point, side) => set((state) => {
    const activeSide = side || (state.heatmapViewMode === 'bottom' ? 'bottom' : 'top');
    const calKey = activeSide === 'top' ? 'calibrationTop' : 'calibrationBottom';
    const cal = state[calKey];

    let newCal: Calibration;
    if (!cal.point1) {
      newCal = { ...cal, point1: point };
    } else if (!cal.point2) {
      const p1 = cal.point1;
      const distPx = Math.sqrt(Math.pow(point.x - p1.x, 2) + Math.pow(point.y - p1.y, 2));
      const mmPerPixel = cal.distanceMm > 0 ? cal.distanceMm / distPx : null;
      newCal = { ...cal, point2: point, mmPerPixel };
    } else {
      newCal = { ...cal, point1: point, point2: null, mmPerPixel: null };
    }

    const updates: Partial<State> = { [calKey]: newCal };
    if (activeSide === (state.heatmapViewMode === 'bottom' ? 'bottom' : 'top')) {
      updates.calibration = newCal;
    }
    return updates;
  }),
  setCalibrationDistance: (distance, side) => set((state) => {
    const activeSide = side || (state.heatmapViewMode === 'bottom' ? 'bottom' : 'top');
    const calKey = activeSide === 'top' ? 'calibrationTop' : 'calibrationBottom';
    const cal = state[calKey];

    let mmPerPixel = null;
    if (cal.point1 && cal.point2) {
      const p1 = cal.point1;
      const distPx = Math.sqrt(Math.pow(cal.point2.x - p1.x, 2) + Math.pow(cal.point2.y - p1.y, 2));
      mmPerPixel = distance / distPx;
    }
    const newCal = { ...cal, distanceMm: distance, mmPerPixel };
    const updates: Partial<State> = { [calKey]: newCal };
    if (activeSide === (state.heatmapViewMode === 'bottom' ? 'bottom' : 'top')) {
      updates.calibration = newCal;
    }
    return updates;
  }),
  resetCalibration: (side) => set((state) => {
    const activeSide = side || (state.heatmapViewMode === 'bottom' ? 'bottom' : 'top');
    const calKey = activeSide === 'top' ? 'calibrationTop' : 'calibrationBottom';
    const updates: Partial<State> = { [calKey]: { ...initialCalibration } };
    if (activeSide === (state.heatmapViewMode === 'bottom' ? 'bottom' : 'top')) {
      updates.calibration = { ...initialCalibration };
    }
    return updates;
  }),
  setBottomImageOffset: (bottomImageOffset) => set({ bottomImageOffset }),
  setBottomImageRotation: (bottomImageRotation) => set({ bottomImageRotation }),
  setBottomImageMirrorX: (bottomImageMirrorX) => set({ bottomImageMirrorX }),
  setBottomImageMirrorY: (bottomImageMirrorY) => set({ bottomImageMirrorY }),

  setAmbientTemperature: (ambientTemperature) => set({ ambientTemperature }),
  setGlobalMaxTemperature: (globalMaxTemperature) => set({ globalMaxTemperature }),

  setHeatmapOpacity: (heatmapOpacity) => set({ heatmapOpacity }),
  setShowGrid: (showGrid) => set({ showGrid }),
  setShowConductivityMap: (show) => set({ showConductivityMap: show }),
  setHeatmapResult: (heatmapResult) => set({ heatmapResult }),
  setHeatmapViewMode: (heatmapViewMode) => set((state) => {
    const updates: Partial<State> = { heatmapViewMode };
    // Maintain 'calibration' as the primary one for UI tools,
    // but we'll use Top/Bottom specifically in the canvas logic.
    if (heatmapViewMode === 'bottom') {
      updates.calibration = state.calibrationBottom;
    } else {
      updates.calibration = state.calibrationTop;
    }
    return updates;
  }),
  setManualHeatmapMaxTemperatureC: (manualHeatmapMaxTemperatureC) => set({ manualHeatmapMaxTemperatureC }),
  setDebugPointerEvents: (debugPointerEvents) => set({ debugPointerEvents }),
  setDebugCoords: (debugCoords) => set({ debugCoords }),
  setLayerState: (layer, updates) => set((state) => ({
    layers: {
        ...state.layers,
        [layer]: { ...state.layers[layer], ...updates }
    }
  })),
  setNavigation: (updates) => set((state) => ({ navigation: { ...state.navigation, ...updates } })),
  setStudyArea: (updates) => set((state) => ({ studyArea: { ...state.studyArea, ...updates } })),
  setStageRef: (stageRef) => set({ stageRef }),
}));

if (typeof window !== 'undefined') {
  (window as any).useStore = useStore;
}

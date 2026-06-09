import { create } from 'zustand';
import { Zone, HeatmapResult, Stackup, PolygonType } from '../thermal/types';

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
  components: Component[];
  zones: Zone[];
  stackup: Stackup;
  calibration: Calibration;
  ambientTemperature: number; // °C
  globalMaxTemperature: number | null; // °C

  mode: InteractionMode;
  selection: Selection;

  // Backward compatibility
  selectedComponentId: string | null;
  selectedZoneId: string | null;

  heatmapOpacity: number;
  showGrid: boolean;
  showConductivityMap: boolean;
  heatmapResult: HeatmapResult | null;
  debugPointerEvents: boolean;

  // Actions
  setImage: (image: string | null, width?: number, height?: number) => void;
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

  setCalibrationPoint: (point: { x: number; y: number }) => void;
  setCalibrationDistance: (distance: number) => void;
  resetCalibration: () => void;

  setAmbientTemperature: (temp: number) => void;
  setGlobalMaxTemperature: (temp: number | null) => void;

  setHeatmapOpacity: (opacity: number) => void;
  setShowGrid: (showGrid: boolean) => void;
  setShowConductivityMap: (show: boolean) => void;
  setHeatmapResult: (result: HeatmapResult | null) => void;
  setDebugPointerEvents: (enabled: boolean) => void;
}

export const useStore = create<State>((set, get) => ({
  image: null,
  imageDimensions: null,
  components: [],
  zones: [],
  stackup: {
    boardThicknessMm: 1.6,
    layerCount: 2,
    copperOzPerLayer: 1,
    estimatedCopperCoveragePercent: 80,
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
  selectedComponentId: null,
  selectedZoneId: null,

  heatmapOpacity: 0.6,
  showGrid: false,
  showConductivityMap: false,
  heatmapResult: null,
  debugPointerEvents: false,

  setImage: (image, width, height) => set({
    image,
    imageDimensions: width && height ? { width, height } : null,
    components: [],
    zones: [],
    selection: null,
    selectedComponentId: null,
    selectedZoneId: null,
    calibration: { point1: null, point2: null, distanceMm: 0, mmPerPixel: null }
  }),
  setMode: (mode) => set({ mode }),
  setSelection: (selection) => set((state) => {
    let selectedComponentId = null;
    let selectedZoneId = null;
    if (selection?.type === 'component') selectedComponentId = selection.id;
    if (selection?.type === 'polygon') selectedZoneId = selection.id;
    if (selection?.type === 'polygonVertex') selectedZoneId = selection.id;

    return { selection, selectedComponentId, selectedZoneId };
  }),
  clearSelection: () => set({ selection: null, selectedComponentId: null, selectedZoneId: null }),

  addComponent: (comp) => set((state) => ({ components: [...state.components, comp] })),
  updateComponent: (id, updates) => set((state) => ({
    components: state.components.map((c) => (c.id === id ? { ...c, ...updates } : c)),
  })),
  removeComponent: (id) => set((state) => ({
    components: state.components.filter((c) => c.id !== id),
    selection: (state.selection?.type === 'component' && state.selection.id === id) ? null : state.selection,
    selectedComponentId: state.selectedComponentId === id ? null : state.selectedComponentId,
  })),

  addZone: (zone) => set((state) => ({ zones: [...state.zones, zone] })),
  updateZone: (id, updates) => set((state) => ({
    zones: state.zones.map((z) => (z.id === id ? { ...z, ...updates } : z)),
  })),
  removeZone: (id) => set((state) => ({
    zones: state.zones.filter((z) => z.id !== id),
    selection: (state.selection?.id === id) ? null : state.selection,
    selectedZoneId: state.selectedZoneId === id ? null : state.selectedZoneId,
  })),

  setStackup: (updates) => set((state) => ({ stackup: { ...state.stackup, ...updates } })),

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
      const p2 = state.calibration.point2;
      const distPx = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
      mmPerPixel = distance / distPx;
    }
    return { calibration: { ...state.calibration, distanceMm: distance, mmPerPixel } };
  }),
  resetCalibration: () => set({ calibration: { point1: null, point2: null, distanceMm: 0, mmPerPixel: null } }),

  setAmbientTemperature: (ambientTemperature) => set({ ambientTemperature }),
  setGlobalMaxTemperature: (globalMaxTemperature) => set({ globalMaxTemperature }),

  setHeatmapOpacity: (heatmapOpacity) => set({ heatmapOpacity }),
  setShowGrid: (showGrid: boolean) => set({ showGrid }),
  setShowConductivityMap: (showConductivityMap: boolean) => set({ showConductivityMap }),
  setHeatmapResult: (heatmapResult) => set({ heatmapResult }),
  setDebugPointerEvents: (debugPointerEvents) => set({ debugPointerEvents }),
}));

if (typeof window !== 'undefined') {
  (window as any).useStore = useStore;
}

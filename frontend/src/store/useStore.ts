import { create } from 'zustand';

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

export type InteractionMode = 'select' | 'calibrate' | 'addComponent' | 'drawBoundary';

interface State {
  image: string | null;
  imageDimensions: { width: number; height: number } | null;
  components: Component[];
  calibration: Calibration;
  boundary: { x: number; y: number }[]; // in mm
  ambientTemperature: number; // °C
  defaultBoardSigma: number; // mm (kept for compatibility if needed elsewhere, but not used in solver)
  globalMaxTemperature: number | null; // °C

  mode: InteractionMode;
  selectedComponentId: string | null;
  heatmapOpacity: number;

  // Actions
  setImage: (image: string | null, width?: number, height?: number) => void;
  setMode: (mode: InteractionMode) => void;
  addComponent: (comp: Component) => void;
  updateComponent: (id: string, updates: Partial<Component>) => void;
  removeComponent: (id: string) => void;
  selectComponent: (id: string | null) => void;

  setCalibrationPoint: (point: { x: number; y: number }) => void;
  setCalibrationDistance: (distance: number) => void;
  resetCalibration: () => void;

  setBoundary: (points: { x: number; y: number }[]) => void;
  addBoundaryPoint: (point: { x: number; y: number }) => void;
  clearBoundary: () => void;

  setAmbientTemperature: (temp: number) => void;
  setDefaultBoardSigma: (sigma: number) => void;
  setGlobalMaxTemperature: (temp: number | null) => void;

  setHeatmapOpacity: (opacity: number) => void;
}

export const useStore = create<State>((set) => ({
  image: null,
  imageDimensions: null,
  components: [],
  calibration: {
    point1: null,
    point2: null,
    distanceMm: 0,
    mmPerPixel: null,
  },
  boundary: [],
  ambientTemperature: 25,
  defaultBoardSigma: 5,
  globalMaxTemperature: null,

  mode: 'select',
  selectedComponentId: null,
  heatmapOpacity: 0.6,

  setImage: (image, width, height) => set({
    image,
    imageDimensions: width && height ? { width, height } : null,
    components: [],
    boundary: [],
    calibration: { point1: null, point2: null, distanceMm: 0, mmPerPixel: null }
  }),
  setMode: (mode) => set({ mode }),
  addComponent: (comp) => set((state) => ({ components: [...state.components, comp] })),
  updateComponent: (id, updates) => set((state) => ({
    components: state.components.map((c) => (c.id === id ? { ...c, ...updates } : c)),
  })),
  removeComponent: (id) => set((state) => ({
    components: state.components.filter((c) => c.id !== id),
    selectedComponentId: state.selectedComponentId === id ? null : state.selectedComponentId,
  })),
  selectComponent: (id) => set({ selectedComponentId: id }),

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

  setBoundary: (boundary) => set({ boundary }),
  addBoundaryPoint: (point) => set((state) => ({ boundary: [...state.boundary, point] })),
  clearBoundary: () => set({ boundary: [] }),

  setAmbientTemperature: (ambientTemperature) => set({ ambientTemperature }),
  setDefaultBoardSigma: (defaultBoardSigma) => set({ defaultBoardSigma }),
  setGlobalMaxTemperature: (globalMaxTemperature) => set({ globalMaxTemperature }),

  setHeatmapOpacity: (heatmapOpacity) => set({ heatmapOpacity }),
}));

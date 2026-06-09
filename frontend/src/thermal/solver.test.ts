import { describe, it, expect, vi } from 'vitest';
import { solveSteadyState } from './solver';
import { Component } from '../store/useStore';
import { Zone, Point, Stackup } from './types';
import { estimateBaseConductivity, isPointInPolygon } from './utils';

describe('solveSteadyState', () => {
    const ambientTemp = 25;
    const boundary: Point[] = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
        { x: 0, y: 100 }
    ];

    it('does not throw with valid input', () => {
        const components: Component[] = [{
            id: 'c1', name: 'U1', x: 50, y: 50, width: 10, height: 10, power: 1.0
        }];
        expect(() => solveSteadyState(components, [], 100, 100, boundary, ambientTemp, 50)).not.toThrow();
    });

    it('throws with invalid board dimensions', () => {
        expect(() => solveSteadyState([], [], 0, 100, boundary, ambientTemp)).toThrow("Invalid board dimensions");
    });

    it('produces symmetric heat spread for a centered component', () => {
        const components: Component[] = [{
            id: 'c1', name: 'U1', x: 50, y: 50, width: 10, height: 10, power: 1.0
        }];
        const result = solveSteadyState(components, [], 100, 100, boundary, ambientTemp, 100);

        const nx = result.width;
        const ny = result.height;
        const centerX = Math.floor(nx / 2);
        const centerY = Math.floor(ny / 2);

        const t_left = result.data[centerY * nx + (centerX - 10)];
        const t_right = result.data[centerY * nx + (centerX + 10)];
        const t_up = result.data[(centerY - 10) * nx + centerX];
        const t_down = result.data[(centerY + 10) * nx + centerX];

        expect(Math.abs(t_left - t_right)).toBeLessThan(0.1);
        expect(Math.abs(t_up - t_down)).toBeLessThan(0.1);
    });

    it('keeps outside-PCB cells at ambient temperature', () => {
        const components: Component[] = [{
            id: 'c1', name: 'U1', x: 50, y: 50, width: 10, height: 10, power: 1.0
        }];
        const smallBoundary: Point[] = [
            { x: 10, y: 10 },
            { x: 40, y: 10 },
            { x: 40, y: 40 },
            { x: 10, y: 40 }
        ];
        const result = solveSteadyState(components, [], 100, 100, smallBoundary, ambientTemp, 50);

        expect(result.data[0]).toBe(ambientTemp);
    });

    it('correctly calculates RthPCB', () => {
        const power = 2.0;
        const components: Component[] = [{
            id: 'c1', name: 'U1', x: 50, y: 50, width: 10, height: 10, power
        }];
        const result = solveSteadyState(components, [], 100, 100, boundary, ambientTemp, 50);
        const junction = result.junctions[0];

        expect(junction.rThetaPcb).toBeGreaterThan(0);
        expect(junction.tPcb).toBeGreaterThan(ambientTemp);
        expect(junction.tPcb).toBeCloseTo(ambientTemp + power * junction.rThetaPcb, 5);
    });

    it('no zones = same result as constant-k solver (regression)', () => {
        const components: Component[] = [{
            id: 'c1', name: 'U1', x: 50, y: 50, width: 10, height: 10, power: 1.0
        }];
        const result = solveSteadyState(components, [], 100, 100, boundary, ambientTemp, 50);
        expect(result.kGrid.every(k => k === 25)).toBe(true);
    });

    it('high-k zone spreads heat more strongly', () => {
        const components: Component[] = [{
            id: 'c1', name: 'U1', x: 50, y: 50, width: 10, height: 10, power: 5.0
        }];
        const resultNormal = solveSteadyState(components, [], 100, 100, boundary, ambientTemp, 50);

        const highKZone: Zone = {
            id: 'z1', type: 'conductivityZone', label: 'High K', enabled: true, conductivity: 400,
            points: [ {x:0, y:0}, {x:100, y:0}, {x:100, y:100}, {x:0, y:100} ],
            editable: true, selectable: true, deletable: true
        };
        const resultHighK = solveSteadyState(components, [highKZone], 100, 100, boundary, ambientTemp, 50);

        expect(resultHighK.maxTemp).toBeLessThan(resultNormal.maxTemp);
    });

    it('low-k zone restricts heat flow (insulation)', () => {
        const components: Component[] = [{
            id: 'c1', name: 'U1', x: 50, y: 50, width: 10, height: 10, power: 2.0
        }];

        const lowKZone: Zone = {
            id: 'z1', type: 'conductivityZone', label: 'Low K', enabled: true, conductivity: 0.1,
            points: [ {x:40, y:40}, {x:60, y:40}, {x:60, y:60}, {x:40, y:60} ],
            editable: true, selectable: true, deletable: true
        };

        const resultLowK = solveSteadyState(components, [lowKZone], 100, 100, boundary, ambientTemp, 50);
        const resultNormal = solveSteadyState(components, [], 100, 100, boundary, ambientTemp, 50);

        expect(resultLowK.maxTemp).toBeGreaterThan(resultNormal.maxTemp);
    });

    it('stackup estimator returns reasonable values', () => {
        const s1: Stackup = { boardThicknessMm: 1.6, layerCount: 2, copperOzPerLayer: 1, estimatedCopperCoveragePercent: 100 };
        const k1 = estimateBaseConductivity(s1);
        expect(k1).toBeGreaterThan(10);

        const s2: Stackup = { boardThicknessMm: 1.6, layerCount: 0, copperOzPerLayer: 0, estimatedCopperCoveragePercent: 0 };
        const k2 = estimateBaseConductivity(s2);
        expect(k2).toBeCloseTo(0.35, 1);
    });

    it('kGrid dimensions match thermal grid', () => {
        const result = solveSteadyState([], [], 100, 100, boundary, ambientTemp, 50);
        expect(result.kGrid.length).toBe(result.data.length);
    });

    it('component with power > 0 produces max temperature > ambient', () => {
        const components: Component[] = [{
            id: 'c1', name: 'U1', x: 50, y: 50, width: 10, height: 10, power: 1.0
        }];
        const result = solveSteadyState(components, [], 100, 100, boundary, ambientTemp, 50);
        expect(result.maxTemp).toBeGreaterThan(ambientTemp);
    });

    it('increasing power increases max temperature', () => {
        const c1: Component = { id: 'c1', name: 'U1', x: 50, y: 50, width: 10, height: 10, power: 1.0 };
        const c2: Component = { ...c1, power: 2.0 };
        const r1 = solveSteadyState([c1], [], 100, 100, boundary, ambientTemp, 50);
        const r2 = solveSteadyState([c2], [], 100, 100, boundary, ambientTemp, 50);
        expect(r2.maxTemp).toBeGreaterThan(r1.maxTemp);
    });
});

describe('utils interaction logic', () => {
    it('isPointInPolygon returns false for polygons with < 3 points', () => {
        const p = { x: 50, y: 50 };
        expect(isPointInPolygon(p, [])).toBe(false);
        expect(isPointInPolygon(p, [{x:0, y:0}])).toBe(false);
        expect(isPointInPolygon(p, [{x:0, y:0}, {x:100, y:0}])).toBe(false);
    });

    it('isPointInPolygon correctly identifies points inside/outside', () => {
        const poly = [{x:0, y:0}, {x:100, y:0}, {x:100, y:100}, {x:0, y:100}];
        expect(isPointInPolygon({x:50, y:50}, poly)).toBe(true);
        expect(isPointInPolygon({x:150, y:50}, poly)).toBe(false);
    });
});

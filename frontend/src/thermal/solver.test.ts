import { describe, it, expect } from 'vitest';
import { solveSteadyState } from './solver';
import { Component } from '../store/useStore';
import { Zone, Point, Stackup } from './types';
import { estimateBaseConductivity } from './utils';

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
        // L-shaped board or just a small square in a larger grid
        const smallBoundary: Point[] = [
            { x: 10, y: 10 },
            { x: 40, y: 10 },
            { x: 40, y: 40 },
            { x: 10, y: 40 }
        ];
        const result = solveSteadyState(components, [], 100, 100, smallBoundary, ambientTemp, 50);

        // (0,0) is outside the boundary
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
        expect(junction.tPcb).toBeCloseTo(ambientTemp + power * junction.rThetaPcb, 5);
    });

    it('no zones = same result as constant-k solver (regression)', () => {
        const components: Component[] = [{
            id: 'c1', name: 'U1', x: 50, y: 50, width: 10, height: 10, power: 1.0
        }];
        const result = solveSteadyState(components, [], 100, 100, boundary, ambientTemp, 50);
        // Previously k=25, thickness=1.6mm. In new solver it's default 25 if no stackup.
        expect(result.kGrid.every(k => k === 25)).toBe(true);
    });

    it('high-k zone spreads heat more strongly', () => {
        const components: Component[] = [{
            id: 'c1', name: 'U1', x: 50, y: 50, width: 10, height: 10, power: 5.0
        }];
        const resultNormal = solveSteadyState(components, [], 100, 100, boundary, ambientTemp, 50);

        const highKZone: Zone = {
            id: 'z1', label: 'High K', enabled: true, conductivity: 400, // Copper-like
            points: [ {x:0, y:0}, {x:100, y:0}, {x:100, y:100}, {x:0, y:100} ]
        };
        const resultHighK = solveSteadyState(components, [highKZone], 100, 100, boundary, ambientTemp, 50);

        // Max temp should be lower because heat is spread better
        expect(resultHighK.maxTemp).toBeLessThan(resultNormal.maxTemp);
    });

    it('low-k zone restricts heat flow (insulation)', () => {
        const components: Component[] = [{
            id: 'c1', name: 'U1', x: 50, y: 50, width: 10, height: 10, power: 2.0
        }];

        // A "ring" of low conductivity around the component
        const lowKZone: Zone = {
            id: 'z1', label: 'Low K', enabled: true, conductivity: 0.1,
            points: [ {x:40, y:40}, {x:60, y:40}, {x:60, y:60}, {x:40, y:60} ]
        };

        const resultLowK = solveSteadyState(components, [lowKZone], 100, 100, boundary, ambientTemp, 50);
        const resultNormal = solveSteadyState(components, [], 100, 100, boundary, ambientTemp, 50);

        // Max temp should be higher because heat is trapped inside the low-k zone
        expect(resultLowK.maxTemp).toBeGreaterThan(resultNormal.maxTemp);
    });

    it('stackup estimator returns reasonable values', () => {
        const s1: Stackup = { boardThicknessMm: 1.6, layerCount: 2, copperOzPerLayer: 1, estimatedCopperCoveragePercent: 100 };
        const k1 = estimateBaseConductivity(s1);
        expect(k1).toBeGreaterThan(10); // Should be significantly higher than FR4

        const s2: Stackup = { boardThicknessMm: 1.6, layerCount: 0, copperOzPerLayer: 0, estimatedCopperCoveragePercent: 0 };
        const k2 = estimateBaseConductivity(s2);
        expect(k2).toBeCloseTo(0.35, 1); // Should be close to FR4
    });

    it('kGrid dimensions match thermal grid', () => {
        const result = solveSteadyState([], [], 100, 100, boundary, ambientTemp, 50);
        expect(result.kGrid.length).toBe(result.data.length);
    });
});

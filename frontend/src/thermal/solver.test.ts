import { describe, it, expect } from 'vitest';
import { solveSteadyState } from './solver';
import { Component } from '../store/useStore';
import { Zone, Point } from './types';

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
});

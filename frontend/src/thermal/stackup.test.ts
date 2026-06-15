import { describe, it, expect } from 'vitest';
import { calculateStackupKXY, calculateStackupKZ, estimateBaseConductivity } from './utils';
import { BoardStackup, Stackup } from './types';

describe('Stackup Calculations', () => {
    const stackup: BoardStackup = {
        layers: [
            { id: 'top', name: 'Top', type: 'copper', thicknessUm: 35, conductivityWmK: 385, copperCoveragePercent: 50 },
            { id: 'core', name: 'Core', type: 'core', thicknessUm: 1530, conductivityWmK: 0.35 },
            { id: 'bot', name: 'Bottom', type: 'copper', thicknessUm: 35, conductivityWmK: 385, copperCoveragePercent: 50 },
        ]
    };

    it('calculates total thickness correctly', () => {
        const totalUm = stackup.layers.reduce((acc, l) => acc + l.thicknessUm, 0);
        expect(totalUm).toBe(1600);
    });

    it('increasing copper thickness increases kXY', () => {
        const k1 = calculateStackupKXY(stackup);
        const stackup2 = JSON.parse(JSON.stringify(stackup));
        stackup2.layers[0].thicknessUm = 70;
        const k2 = calculateStackupKXY(stackup2);
        expect(k2).toBeGreaterThan(k1);
    });

    it('increasing copper coverage increases kXY', () => {
        const k1 = calculateStackupKXY(stackup);
        const stackup2 = JSON.parse(JSON.stringify(stackup));
        stackup2.layers[0].copperCoveragePercent = 80;
        const k2 = calculateStackupKXY(stackup2);
        expect(k2).toBeGreaterThan(k1);
    });

    it('kZ remains positive and reasonable', () => {
        const kz = calculateStackupKZ(stackup);
        expect(kz).toBeGreaterThan(0);
        expect(kz).toBeLessThan(1.0); // FR4 dominated
    });

    it('manual base conductivity override still works', () => {
        const legacy: Stackup = {
            boardThicknessMm: 1.6,
            layerCount: 2,
            copperOzPerLayer: 1,
            estimatedCopperCoveragePercent: 50,
            baseConductivityMode: 'manual'
        };
        const k = estimateBaseConductivity(legacy);
        expect(k).toBeGreaterThan(5);
        expect(k).toBeLessThan(20);
    });

    it('stackup mode uses kXY as base conductivity', () => {
        const legacy: Stackup = {
            boardThicknessMm: 1.6,
            layerCount: 2,
            copperOzPerLayer: 1,
            estimatedCopperCoveragePercent: 50,
            baseConductivityMode: 'stackup'
        };
        const kXY = calculateStackupKXY(stackup);
        const k = estimateBaseConductivity(legacy, stackup);
        expect(k).toBe(kXY);
    });
});


import { solveSteadyState } from './solver';
import { Component } from '../store/useStore';
import { Zone, Point } from './types';

function runValidation() {
    console.log("Starting Thermal Solver Validation...");

    const ambientTemp = 25;
    const components: Component[] = [
        {
            id: 'comp1',
            name: 'U1',
            x: 50,
            y: 50,
            width: 10,
            height: 10,
            power: 1.0,
            thetaJA: 40,
            maxTemperature: 125
        }
    ];

    const zones: Zone[] = [];
    const boundary: Point[] = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
        { x: 0, y: 100 }
    ];

    const result = solveSteadyState(
        components,
        zones,
        100,
        100,
        boundary,
        ambientTemp,
        100
    );

    const junction = result.junctions[0];
    console.log(`Component 1 Result:`);
    console.log(` - Tpcb: ${junction.tpcb.toFixed(2)} °C`);
    console.log(` - RthPCB: ${junction.rthPcb.toFixed(2)} K/W`);
    console.log(` - Tj: ${junction.tj.toFixed(2)} °C`);

    // Basic symmetry check
    const nx = result.width;
    const ny = result.height;
    const centerX = Math.floor(nx / 2);
    const centerY = Math.floor(ny / 2);

    const t_left = result.data[centerY * nx + (centerX - 5)];
    const t_right = result.data[centerY * nx + (centerX + 5)];
    const t_up = result.data[(centerY - 5) * nx + centerX];
    const t_down = result.data[(centerY + 5) * nx + centerX];

    console.log(`Symmetry Check (5 cells from center):`);
    console.log(` - Left: ${t_left.toFixed(3)}, Right: ${t_right.toFixed(3)}`);
    console.log(` - Up: ${t_up.toFixed(3)}, Down: ${t_down.toFixed(3)}`);

    const symmetric = Math.abs(t_left - t_right) < 0.1 && Math.abs(t_up - t_down) < 0.1;
    console.log(`Symmetry Result: ${symmetric ? 'PASS' : 'FAIL'}`);

    if (junction.rthPcb > 0 && symmetric) {
        console.log("Validation PASSED");
    } else {
        console.log("Validation FAILED");
        process.exit(1);
    }
}

runValidation();

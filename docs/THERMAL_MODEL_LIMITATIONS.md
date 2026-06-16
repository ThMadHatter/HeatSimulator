# Thermal Model Limitations - PCB Thermal Simulator

## Model Overview
The simulator uses a **2.5D Steady-State Heat Equation** solver based on the Gauss-Seidel method. It models heat conduction across two primary planes (Top and Bottom) coupled by vertical thermal resistance.

## Core Assumptions
- **Steady State**: The model calculates the final temperature distribution after infinite time. It does NOT model warm-up or transient pulses.
- **Conduction-Dominant**: Heat transfer is primarily through the PCB substrate and copper.
- **Simplified Convection**: Surface cooling is modeled as a uniform heat transfer coefficient ($h$) applied to all board surfaces. It does NOT account for local airflow velocity or orientation.
- **Isotropic Grid**: The simulation grid is uniform ($dx = dy$), derived from the board dimensions and chosen resolution.

## Conductivity ($k$) Modeling
- **In-Plane ($k_{XY}$)**: Modeled as a parallel thermal resistance of all layers in the stackup.
- **Through-Thickness ($k_Z$)**: Modeled as a series thermal resistance.
- **Zones**: Users can define regional conductivity to model high-density copper areas or thermal reliefs.

## Top/Bottom Coupling
- Vertical heat transfer between sides is modeled via a vertical conductance ($g_Z = k_Z \cdot \frac{dx^2}{thickness}$).
- Large components are assumed to inject heat into the side they are mounted on.

## Component Modeling ($R\theta_{PCB}$)
- **$T_{pcb}$**: The average board temperature directly under the component footprint.
- **$R\theta_{PCB}$**: Calculated as $(T_{pcb} - T_{ambient}) / Power$.
- **$T_j$ (Junction Temp)**: Estimated using $T_{pcb} + Power \cdot \theta_{JB}$ or similar resistor-network approximations.

## Appropriate Use Cases
- **Feasibility Studies**: Estimating if a component will exceed its max operating temperature.
- **Placement Optimization**: Comparing different component arrangements for thermal relief.
- **Heatsink/Pour Planning**: Identifying where copper pours or thermal vias are most needed.

## Non-Use Cases
- **Absolute Accuracy**: This is not a substitute for high-fidelity 3D CFD (Computational Fluid Dynamics).
- **Transient Timing**: Cannot be used to determine how long it takes for a board to reach a certain temperature.
- **Complex Airflow**: Does not account for "shadowing" of air by large components.

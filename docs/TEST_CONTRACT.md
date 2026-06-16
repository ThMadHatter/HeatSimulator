# Test Contract - PCB Thermal Simulator

## Overview
This document defines the testing requirements and quality gates for the project.

## Required Unit Tests (Vitest)
- **Coordinate Conversion**:
  - `mmToStage` and `stageToMm` are perfect inverses.
  - `mmToGrid` correctly handles boundary clipping.
  - Conversions account for stage scale and offset.
- **Thermal Solver**:
  - Top/bottom coupling increases with $k_Z$.
  - Power injection is conserved.
  - Rtheta_PCB calculation logic matches physical definition.
  - Multi-zone conductivity correctly overrides base board properties.

## Required E2E Tests (Playwright)
- **Workflow - New Project**:
  1. Load image.
  2. Calibrate (100mm).
  3. Draw 100x100mm boundary.
  4. Add 1W component.
  5. Verify simulation results appear.
- **Navigation**:
  - Zoom-at-mouse-position verification.
  - Pan behavior does not trigger selection.
- **Interaction**:
  - Drag component and verify new position in store.
  - Edit polygon vertex and verify geometry update.

## Required Visual Regression Tests
- **Baselines**:
  - Default empty state.
  - Heatmap (Top/Bottom/Max/Diff).
  - Conductivity map.
  - Legend and Hotspots.
  - Export Dialog.
  - Draggable Panel layout.

## Quality Gates (Pre-commit)
The following commands MUST pass before any PR submission:
- `npm run typecheck`: Zero TypeScript errors.
- `npm run lint`: Compliance with styling rules.
- `npm run test`: All unit tests pass.
- `npx playwright test`: All E2E and visual tests pass.
- `npm run build`: Successful production build.

## CI Configuration
- Run full suite on every PR to `main`.
- Fail build if coverage drops below 80% on core thermal/coord logic.
- Visual regressions require manual approval if snapshots differ.

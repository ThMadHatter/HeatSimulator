# UX Contract - PCB Thermal Simulator

## Overview
This document defines the user experience, workflow, and interface standards for the PCB Thermal Simulator. It serves as a source of truth for UI behavior and acceptance criteria.

## App Workflow
1. **Import PCB Image**: Load top and optional bottom side photos of the PCB.
2. **Calibrate Scale**: Define the physical dimensions of the board by mapping pixels to millimeters.
3. **Define PCB Boundary**: Mask the simulation area to the physical extents of the board.
4. **Add Components**: Place heat sources with physical dimensions and power ratings.
5. **Define Stackup/Zones**: Set regional or global conductivity based on PCB construction.
6. **Simulate**: Run steady-state thermal analysis.
7. **Export**: Generate high-resolution reports and images.

## Tool Behavior & Selection Priority
- **Select (V)**: Default tool. Primary selection priority:
  1. Component center markers/handles
  2. Polygon vertices
  3. Polygon edges
  4. Component bodies
  5. Polygons (Zones, then PCB Boundary)
- **Pan (H)**: Stage-wide panning.
- **Draw Boundary (B) / Draw Zone (Z)**: Point-by-point polygon creation.
- **Add Component (A)**: Click-to-place component at cursor.
- **Calibrate (C)**: Define two points and a distance.

## Cursor Rules
- **Crosshair**: Drawing, Add Component, Calibration.
- **Grab**: Panning mode.
- **Grabbing**: Active pan/drag.
- **Pointer**: Selectable object hover.
- **Move**: Draggable handle/vertex/component hover.

## Zoom & Pan Rules
- **Zoom around cursor**: Ctrl + Wheel. The point under the mouse must remain fixed.
- **Spacebar Pan**: Holding Space temporarily activates Pan tool regardless of current mode.
- **Limits**: Zoom range 0.1x to 20x.

## Coordinate Mapping Rules
- **Master Reference**: The top-left corner of the Top Image is (0,0) mm.
- **Millimeters**: All geometry (components, zones, boundary) is stored in millimeters.
- **Pixels**: Rendering converts millimeters to stage coordinates based on current zoom/pan and calibration.
- **Consistency**: All tools must use the canonical `coords.ts` utility.

## Layer Visibility Rules
- **Heatmap**: Toggleable; opacity adjustable.
- **Grid**: Debug only; default off.
- **Hotspots**: Displayed over heatmap; shows max T coordinates.
- **Labels**: High-contrast, scalable text for components.

## Export Behavior
- **DPI**: Support 1x, 2x, 4x resolution.
- **Toggles**: User can include/exclude any layer (Legend, Grid, Heatmap, etc.).
- **Filename**: `pcb-thermal-[view]-[timestamp].png`.

## Accessibility Requirements
- **Focus States**: All buttons and inputs must have visible focus rings.
- **Hit Targets**: Interactive elements (handles, buttons) must be at least 24x24 CSS pixels or have equivalent spacing.
- **Keyboard**: Full navigation of side panels via Tab; Esc to cancel/reset tool.
- **Color**: Critical status (over-temp) must use both color (Red) and icons/text.

## Acceptance Criteria
- [x] No visual offset between cursor and active drag point.
- [x] Zoom centered on mouse cursor.
- [x] Checklist panel guides new users to completion.
- [x] Export contains exactly what is toggled in the menu.
- [x] All engineering inputs have info tooltips.

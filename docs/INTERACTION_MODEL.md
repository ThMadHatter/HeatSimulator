# Interaction Model - PCB Thermal Simulator

## Tool Modes
| Mode | Action | Result |
|---|---|---|
| **Select (V)** | Left Click | Select object under cursor |
| | Left Drag | Move selected component or vertex |
| **Pan (H)** | Left Drag | Pan stage |
| **Draw (B/Z)** | Left Click | Add vertex to polygon |
| | Double Click | Close/finish polygon |
| **Add (A)** | Left Click | Place component |
| **Calibrate (C)**| Left Click | Set calibration points (2 max) |

## Mouse Behaviors
- **Hover**: Objects highlight or show handles when selectable.
- **Click**: Updates selection in global store.
- **Drag**:
  - On component: Updates (x, y) in mm.
  - On vertex: Updates vertex index in mm.
  - On stage: Pans view (if in Pan mode or Space held).
- **Wheel**: Scroll vertically.
- **Ctrl + Wheel**: Zoom around mouse cursor.
- **Shift + Wheel**: Scroll horizontally.

## Keyboard Shortcuts
- `V`: Select Mode
- `H`: Pan Mode
- `B`: Draw PCB Boundary
- `Z`: Draw Conductivity Zone
- `A`: Add Component
- `E`: Edit Geometry (for selected polygon)
- `Esc`: Cancel tool / Clear selection
- `Enter`: Finish polygon / Confirm dialog
- `Delete / Backspace`: Remove selected object
- `Space (Hold)`: Temporary Pan
- `F` / `Ctrl+0`: Fit board to screen
- `Ctrl+1`: Reset zoom to 100%
- `Ctrl+K`: Command Palette

## Layer Hit-Testing Rules
1. **Handles/Vertices**: Highest priority (24px hit area).
2. **Components**: Selectable by body or center marker.
3. **Zones**: Selectable by fill or edge (20px hit stroke).
4. **PCB Boundary**: Lowest interactive priority.
5. **Heatmap/Grid**: Non-interactive (`listening={false}`).

## UI Panels
- **Draggable Cards**: Sidebars can be moved.
- **Z-Index**: Active card or selected object handle always on top.
- **Focus**: Inputs capture keyboard; shortcuts disabled during typing.

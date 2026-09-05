# Titan V26 Refactoring & Repair Logic Fix

## Overview
This project simulates a 2D physics engine for a ship. The codebase was originally a single massive HTML file that mixed UI, rendering, input handling, and physics logic.

In this update, the monolithic file has been refactored into a clean, modular setup using ES Modules (ESM) and Vite as the build tool.

## Architecture

The logic is split into the following modular files:
- **`index.html`**: Entry point and UI overlay. It only contains HTML/CSS and imports `main.js`.
- **`main.js`**: Controls the game loop, Canvas API rendering, and connects the systems.
- **`physics.js`**: Contains the core physics loop (`updatePhysics`), simulating point masses (nodes), springs, water buoyancy, and structural integrity.
- **`input.js`**: Manages all user interactions (touch/mouse), handling different tools (Grab, Laser, Bomb, Door, Pump, Repair).
- **`ship.js`**: Handles the memory (`HEAP` Float64Array) and structural initialization logic (`buildShip`).

## Repair Logic Fix
### The Issue
Previously, the "Repair" tool was manually moving node coordinates to snap them together. This bypassed the core physics solver, leading to torn chunks, permanent deformation, and gaps where springs were restored while nodes were still too far apart (causing instant re-breaking). The repair radius was also prone to auto-growing uncontrollably.

### The Fix
The repair tool logic has been entirely refactored to cooperate with the physics engine rather than fight it:
1. **Structural Immunity:** Instead of manually moving nodes in `input.js`, the tool now simply restores broken springs (`S_BRK = 0.0`) within the radius and grants them a negative fatigue value (`S_FATIGUE = -120.0`).
2. **Physics Solver Integration:** In `physics.js`, springs with negative fatigue are considered "immune". They cannot break, regardless of how far apart they are stretched. The physics engine constraint solver naturally pulls the massively stretched springs back together over multiple frames.
3. **Velocity Damping:** A global physics dampening modifier (`repairDamping = 0.5`) is applied while the repair tool is active. This prevents violent physics explosions caused by detached chunks snapping back too quickly.
4. **Configurable Radius:** The repair radius auto-growth was removed. It is now controlled manually by the user via a UI slider (`#repair-radius`).

This ensures a 100% gapless, perfect repair without permanent deformations or physics explosions.

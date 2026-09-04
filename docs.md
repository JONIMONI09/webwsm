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
Previously, the "Repair" tool was trying to pull broken spring nodes back together by moving them towards their *original* delta values (`S_ODX` / `S_ODY`), recorded when the ship was initially built. When a user rotated or broke parts of the ship, these original X/Y delta vectors were no longer valid relative to the world coordinates. Pulling the parts along their original deltas caused the ship parts to incorrectly drift away or repair in chaotic manners.

### The Fix
In the newly extracted `updateRepairLogic` function inside `input.js`:
Instead of referencing `S_ODX` and `S_ODY`, the code now dynamically computes the distance between `p1` and `p2`.
It computes a normalized vector `(dx / dist, dy / dist)` representing the *current* angle between the two broken nodes. It then pulls both nodes together along this current vector until they reach their rest distance (`rest`), completely ignoring their original rotation.

This ensures that the repair works flawlessly from any angle or rotation in the simulation.

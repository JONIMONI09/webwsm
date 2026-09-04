# WebWSM (Titan V26 Refactoring & Repair Logic Fix)

A robust 2D physics engine simulating a ship using the HTML5 Canvas API and a custom point/spring constraint system. This project builds on the "Titan V26" physics logic, now refactored into a clean, modular setup using ES Modules (ESM) and Vite.


## Overview

Previously an intricate monolithic application, the codebase has been thoroughly modularized to separate concerns across logic, rendering, UI, and input processing. The repository demonstrates a complete development lifecycle configuration with Jest testing and GitHub Actions CI/CD workflows.


### Architecture

The application logic is organized into focused modular files:
- **`index.html`**: Entry point and UI overlay. Imports the main module.
- **`main.js`**: Core game loop controller, orchestrating Canvas rendering and system integrations.
- **`physics.js`**: Core physics loop (`updatePhysics`), simulating point masses (nodes), spring constraints, water buoyancy, and structural integrity.
- **`input.js`**: Handles user interactions across touch and mouse events, providing tools such as Grab, Laser, Bomb, Door, Pump, and an advanced Repair tool.
- **`ship.js`**: Manages the physics memory layout (`HEAP` Float64Array) and structural initialization logic (`buildShip`).


## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v22.x recommended for alignment with GitHub Action workflows)
- npm or yarn

### Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/JONIMONI09/webwsm.git
cd webwsm
npm install
```

### Development

This project leverages [Vite](https://vitejs.dev/) for a lightning-fast development experience.

To start the local development server:

```bash
npm run dev
```

### Building for Production

To create an optimized production build:

```bash
npm run build
```

The compiled assets will be output to the `dist` directory.


## Testing

Tests are written using [Jest](https://jestjs.io/) and require Node's experimental ES module support.

To run the test suite:

```bash
npm test
```

*Note: The test command automatically runs with the `--experimental-vm-modules` flag as defined in `package.json`.*


## CI/CD Workflow

The repository includes GitHub Actions workflows (`.github/workflows/deploy.yml`) ensuring code stability on branches targeting `main`. The pipeline automatically executes tests and verifies the Vite production build.


## Contributing

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Write appropriate tests in `.test.js` files next to logic modifications.
4. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
5. Push to the branch (`git push origin feature/AmazingFeature`)
6. Open a Pull Request
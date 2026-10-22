# Atlas Copco — Telemetry Monitor

Real-time telemetry monitoring dashboard for industrial embedded controllers. Built with **Angular 22**, an **Express backend simulation server**, and **Electron** for native desktop distribution.

---

## Prerequisites

- **Node.js**: `v18.x` or higher (recommended: `v20.x` or `v22.x`)
- **npm**: `v9.x` or higher

Verify your installation:
```bash
node -v
npm -v
```

---

## 1. Installing & Running Angular (Frontend)

The frontend is an Angular 22 application using Apache ECharts, Tailwind CSS with Atlas Copco brand tokens, and standalone components.

### Installation
From the root project directory:
```bash
npm install
```

### Running the Development Server
```bash
npm start
# or: ng serve
```
- Open your browser at: **`http://localhost:4200/`**
- The app automatically reloads when you modify any source file.

### Building for Production
```bash
npm run build
```
Compiled production bundles are generated in `dist/telemetry-monitor/`.

---

## 2. Installing & Running the Backend Server

The backend is a Node.js / Express server that simulates real-time controller metrics (Velocity, Pressure, Temperature) with a sliding window buffer of 100 historical samples.

### Installation
Navigate to the `backend/` directory:
```bash
cd backend
npm install
```

### Starting the Server
From inside the `backend/` directory:
```bash
node server.js
```

> **Tip:** You can also run the backend directly from the project root:
> ```bash
> npm run start:backend
> ```

- The API will be active at: **`http://localhost:3000/api/dashboard`**
- CORS is enabled so the Angular client can poll live telemetry every 1000 ms.

---

## 3. Installing & Running Electron (Desktop App)

Electron packages the telemetry dashboard into a cross-platform desktop application with native OS file dialogs for CSV and Excel exports.

### Installation
Electron is installed as a development dependency in the root project:
```bash
# If you haven't already run this in step 1:
npm install
```

### Running Electron in Development
With the Angular dev server (`npm start`) and the backend (`npm run start:backend`) already running in separate terminals:
```bash
npm run electron
```
This launches the Electron desktop window loading `http://localhost:4200/` live.

### Running Electron in Standalone / Production Mode
To build the Angular production assets and immediately launch the desktop app:
```bash
npm run electron:start
```
This executes `ng build` and opens the standalone desktop application pointing directly to the compiled bundle in `dist/`.

---

## Quick Reference Summary

| Step | Component | Directory | Install Command | Run Command | Default URL / Port |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | **Angular Frontend** | Root (`./`) | `npm install` | `npm start` | `http://localhost:4200` |
| **2** | **Backend Server** | `backend/` | `cd backend && npm install` | `npm run start:backend` | `http://localhost:3000` |
| **3** | **Electron Desktop** | Root (`./`) | `npm install` | `npm run electron` | Desktop Window |

---

## Features

- **Atlas Copco Brand Palette**: Official Blue (`#0092BC`), Gray (`#5B6770`), Beige (`#F5F2EF`), and White with `Source Sans 3` typography.
- **Real-Time Visualizations**: Radial gauges and live sliding waveforms (100-sample history buffer).
- **Interactive High-Resolution Modal**: Maximize button on each waveform card to view an expanded dialog with full zoom and pan controls.
- **Unit Conversions**: Real-time conversion across metric and imperial units (e.g. `mm/s`, `cm/s`, `m/s`, `mbar`, `bar`, `psi`, `°C`, `°F`, `K`).
- **Data Export**: Export snapshot telemetry to **CSV** or **Excel (.xlsx)** via native OS save dialogs in Electron or direct browser download.

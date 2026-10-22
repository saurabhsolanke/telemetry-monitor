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

---

## 4. Architecture and Technical Decisions

### 1. State Management with Angular Signals
- **Decision**: Replaced complex external state libraries (NgRx) with Angular 22's native **Signals** (`signal()`, `computed()`, `effect()`).
- **Rationale**: Signals provide fine-grained reactivity with zero boilerplate. Unit conversions and summary metrics (Min, Max, Mean, Delta %) calculate instantly on the client without redundant change detection cycles.

### 2. Client-Side Unit Conversion
- **Decision**: Implemented `UnitConverterService` entirely in the frontend using exact physical constants and linear/affine conversion formulas.
- **Rationale**: Unit toggles (e.g., `cm/s` ↔ `m/s`, `mbar` ↔ `psi`, `°C` ↔ `°F`) execute synchronously with zero network overhead or latency, ensuring instantaneous UI feedback.

### 3. Modular Apache ECharts
- **Decision**: Imported modular ECharts components (`GaugeChart`, `LineChart`, `GridComponent`, `TooltipComponent`, `DataZoomComponent`, `CanvasRenderer`) via `ngx-echarts` and `echarts/core`.
- **Rationale**: Keeps the production JavaScript bundle lightweight (~1.1 MB including XLSX) while delivering 60 FPS hardware-accelerated canvas rendering for high-frequency live telemetry streaming.

### 4. Resilient Telemetry Streaming Service
- **Decision**: Configured RxJS `timer(0, intervalMs).pipe(switchMap(...), catchError(...))` for 1.0 Hz polling.
- **Rationale**: `switchMap` cancels stale in-flight requests if network jitter occurs. Latency and packet counters provide real-time connection diagnostics.

### 5. Dual Export Strategy (Desktop & Browser)
- **Decision**: `ExportService` detects `window.electronAPI`. If available, it invokes native OS save dialogs (`dialog.showSaveDialog`); otherwise, it triggers browser Blob downloads.
- **Rationale**: Enables a single codebase to operate seamlessly both in standard web browsers and as a native desktop application.

---

## 5. Assumptions Made During Implementation

1. **Telemetry Sampling Rate**: The embedded controller simulation server runs at **1.0 Hz (1000 ms)** with a rolling buffer of the last **100 samples** per channel.
2. **Channel Thresholds**: Standard operational boundaries were established for industrial baseline parameters:
   - **Velocity**: Normal: 160–200 cm/s; Warning: 140–160 or 200–220 cm/s; Critical: <140 or >220 cm/s.
   - **Pressure**: Normal: 970–1050 mbar; Warning: 920–970 or 1050–1100 mbar; Critical: <920 or >1100 mbar.
   - **Temperature**: Normal: 30–40 °C; Warning: 25–30 or 40–45 °C; Critical: <25 or >45 °C.
3. **Environment Configuration**: API endpoints are managed via Angular environment files (`environment.ts` and `environment.development.ts`) defaulting to `http://localhost:3000/api/dashboard` for local development.
4. **Network Resilience**: If the backend goes offline, the UI persists the last known buffer, updates connection status to `DISCONNECTED`, and displays an animated error banner while automatically retrying on the next poll cycle.


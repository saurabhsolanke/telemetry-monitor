const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());

const PORT = 3000;
const MAX_SAMPLES = 100;

// Base values
const BASE = {
  velocity: 185.4,   // cm/s
  pressure: 1012.0,  // mbar
  temperature: 36.8  // °C
};

// Current simulation state
const state = {
  velocity: BASE.velocity,
  pressure: BASE.pressure,
  temperature: BASE.temperature,
  history: {
    velocity: [],
    pressure: [],
    temperature: []
  },
  cycleCount: 0
};

// Seed initial history
const now = Date.now();
for (let i = MAX_SAMPLES - 1; i >= 0; i--) {
  const t = new Date(now - i * 1000).toISOString().substr(11, 8);
  state.history.velocity.push({ time: t, value: Number((BASE.velocity + (Math.random() * 4 - 2)).toFixed(2)) });
  state.history.pressure.push({ time: t, value: Number((BASE.pressure + (Math.random() * 6 - 3)).toFixed(1)) });
  state.history.temperature.push({ time: t, value: Number((BASE.temperature + (Math.random() * 1 - 0.5)).toFixed(2)) });
}

function updateTelemetry() {
  state.cycleCount++;
  const isReverting = state.cycleCount % 6 === 0;

  ['velocity', 'pressure', 'temperature'].forEach((param) => {
    let current = state[param];
    const base = BASE[param];

    if (isReverting) {
      // Step 5 cycles return towards baseline
      current = current + (base - current) * 0.4;
    } else {
      // Random delta ±10%
      const deltaPercent = (Math.random() * 0.20) - 0.10;
      current = current * (1 + deltaPercent);
    }

    current = Number(current.toFixed(2));
    state[param] = current;

    const timeStr = new Date().toISOString().substr(11, 8);
    const hist = state.history[param];
    hist.push({ time: timeStr, value: current });
    if (hist.length > MAX_SAMPLES) {
      hist.shift();
    }
  });
}

setInterval(updateTelemetry, 1000);

app.get('/api/dashboard', (req, res) => {
  res.json({
    timestamp: new Date().toISOString(),
    velocity: {
      value: state.velocity,
      unit: "cm/s",
      history: state.history.velocity
    },
    pressure: {
      value: state.pressure,
      unit: "mbar",
      history: state.history.pressure
    },
    temperature: {
      value: state.temperature,
      unit: "°C",
      history: state.history.temperature
    }
  });
});

app.listen(PORT, () => console.log(`Telemetry Backend running on http://localhost:${PORT}`));
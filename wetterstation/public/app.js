'use strict';

// ── State ─────────────────────────────────────────────────────────────────────
let stations  = [];   // from /config
let liveState = {};   // stationId → key → { value, ts, available }
let chart     = null;
let modalSensor = null;  // { stationId, key, label, unit }
let currentRange = '24h';

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtTs(ts) {
  if (!ts) return '–';
  return new Date(ts * 1000).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function compassDir(deg) {
  const dirs = ['N','NO','O','SO','S','SW','W','NW'];
  return dirs[Math.round(deg / 45) % 8];
}

function drawCompassSVG(deg) {
  const rad = (deg - 90) * Math.PI / 180;
  const cx = 22, cy = 22, r = 18;
  const tip  = { x: cx + r * Math.cos(rad),      y: cy + r * Math.sin(rad) };
  const tail = { x: cx - r * .6 * Math.cos(rad), y: cy - r * .6 * Math.sin(rad) };
  return `<svg class="compass" viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg">
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#30363d" stroke-width="1.5"/>
    <text x="${cx}" y="5"  text-anchor="middle" fill="#8b949e" font-size="5" font-family="sans-serif">N</text>
    <text x="${cx}" y="42" text-anchor="middle" fill="#8b949e" font-size="5" font-family="sans-serif">S</text>
    <text x="2"    y="${cy+2}" text-anchor="middle" fill="#8b949e" font-size="5" font-family="sans-serif">W</text>
    <text x="42"   y="${cy+2}" text-anchor="middle" fill="#8b949e" font-size="5" font-family="sans-serif">O</text>
    <line x1="${tail.x}" y1="${tail.y}" x2="${tip.x}" y2="${tip.y}"
          stroke="#58a6ff" stroke-width="2.5" stroke-linecap="round"/>
    <circle cx="${tip.x}" cy="${tip.y}" r="2.5" fill="#58a6ff"/>
  </svg>`;
}

// ── DOM rendering ─────────────────────────────────────────────────────────────
function buildGrid() {
  const main = document.getElementById('main');
  main.innerHTML = '';

  for (const station of stations) {
    const section = document.createElement('section');
    const title   = document.createElement('div');
    title.className = 'station-title';
    title.textContent = station.name;
    section.appendChild(title);

    const grid = document.createElement('div');
    grid.className = 'grid';
    grid.id = `grid-${station.id}`;
    section.appendChild(grid);
    main.appendChild(section);

    for (const s of station.sensors) {
      const card = document.createElement('div');
      card.className = 'card' + (s.type === 'text' || s.type === 'direction' ? '' : '');
      card.id = `card-${station.id}-${s.key}`;
      card.innerHTML = `
        <div class="card-header">
          <div class="card-label">${s.label}</div>
          <div class="badge-offline">Offline</div>
        </div>
        <div class="card-val">–</div>
        <div class="card-ts" id="ts-${station.id}-${s.key}">–</div>
      `;

      if (s.type === 'number') {
        card.title = 'Klicken für Verlauf';
        card.addEventListener('click', () => openModal(station.id, s));
      } else {
        card.classList.add('no-chart');
      }

      grid.appendChild(card);
    }
  }
}

function updateCard(stationId, key, value, ts, available) {
  const station = stations.find(s => s.id === stationId);
  if (!station) return;
  const sensor = station.sensors.find(s => s.key === key);
  if (!sensor) return;

  const card    = document.getElementById(`card-${stationId}-${key}`);
  const tsEl    = document.getElementById(`ts-${stationId}-${key}`);
  if (!card) return;

  // availability
  if (available === false) {
    card.classList.add('offline');
  } else {
    card.classList.remove('offline');
  }

  const valEl = card.querySelector('.card-val');

  if (sensor.type === 'direction') {
    const deg = parseFloat(value);
    valEl.innerHTML = `
      <div class="compass-wrap">
        ${drawCompassSVG(deg)}
        <div class="compass-deg">${isNaN(deg) ? '–' : Math.round(deg)}<span class="unit">°</span>
          <div style="font-size:.75rem;color:var(--muted);font-weight:400">${isNaN(deg) ? '' : compassDir(deg)}</div>
        </div>
      </div>`;
  } else if (sensor.type === 'text') {
    valEl.innerHTML = `<div class="card-value" style="font-size:1.1rem">${value ?? '–'}</div>`;
  } else {
    const num = parseFloat(value);
    valEl.innerHTML = `<div class="card-value">${isNaN(num) ? '–' : num.toFixed(num % 1 === 0 ? 0 : 1)}<span class="unit">${sensor.unit}</span></div>`;
  }

  if (tsEl && ts) tsEl.textContent = fmtTs(ts);
}

function applySnapshot(state) {
  for (const [stationId, keys] of Object.entries(state)) {
    for (const [key, data] of Object.entries(keys)) {
      if (!liveState[stationId]) liveState[stationId] = {};
      liveState[stationId][key] = data;
      updateCard(stationId, key, data.value, data.ts, data.available);
    }
  }
}

// ── Modal / Chart ─────────────────────────────────────────────────────────────
function openModal(stationId, sensor) {
  modalSensor  = { stationId, key: `${stationId}/${sensor.key}`, label: sensor.label, unit: sensor.unit };
  currentRange = '24h';
  document.getElementById('modal-title').textContent = `${sensor.label} (${sensor.unit})`;
  document.querySelectorAll('.range-btn').forEach(b => b.classList.toggle('active', b.dataset.range === '24h'));
  document.getElementById('modal-backdrop').classList.add('open');
  loadChart();
}

function closeModal() {
  document.getElementById('modal-backdrop').classList.remove('open');
  if (chart) { chart.destroy(); chart = null; }
  modalSensor = null;
}

async function loadChart() {
  if (!modalSensor) return;
  const { key, unit } = modalSensor;
  const rows = await fetch(`/history?sensor=${encodeURIComponent(key)}&range=${currentRange}`).then(r => r.json());

  const labels = rows.map(r => {
    const d = new Date(r.ts * 1000);
    if (currentRange === '24h') return d.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit' });
  });
  const values = rows.map(r => r.avg != null ? +r.avg.toFixed(2) : null);

  if (chart) chart.destroy();
  const ctx = document.getElementById('chart').getContext('2d');
  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: unit,
        data: values,
        borderColor: '#58a6ff',
        backgroundColor: 'rgba(88,166,255,0.08)',
        borderWidth: 1.5,
        pointRadius: rows.length > 100 ? 0 : 2,
        fill: true,
        tension: 0.3,
        spanGaps: true,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: 'index' },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => `${ctx.parsed.y} ${unit}`,
          }
        }
      },
      scales: {
        x: { ticks: { color: '#8b949e', maxTicksLimit: 10 }, grid: { color: '#21262d' } },
        y: { ticks: { color: '#8b949e' }, grid: { color: '#21262d' } },
      }
    }
  });
}

// range buttons
document.querySelectorAll('.range-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    currentRange = btn.dataset.range;
    document.querySelectorAll('.range-btn').forEach(b => b.classList.toggle('active', b === btn));
    loadChart();
  });
});

document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('modal-backdrop').addEventListener('click', e => {
  if (e.target === document.getElementById('modal-backdrop')) closeModal();
});

// ── SSE ───────────────────────────────────────────────────────────────────────
const dot = document.getElementById('status-dot');

function connect() {
  const es = new EventSource('/events');

  es.addEventListener('open', () => {
    dot.className = 'online';
  });

  es.addEventListener('error', () => {
    dot.className = 'offline';
  });

  es.addEventListener('message', ({ data }) => {
    const msg = JSON.parse(data);

    if (msg.type === 'snapshot') {
      applySnapshot(msg.state);
    } else if (msg.type === 'update') {
      if (!liveState[msg.stationId]) liveState[msg.stationId] = {};
      const prev = liveState[msg.stationId][msg.key] || {};
      liveState[msg.stationId][msg.key] = { value: msg.value, ts: msg.ts, available: prev.available };
      updateCard(msg.stationId, msg.key, msg.value, msg.ts, prev.available);
    } else if (msg.type === 'available') {
      if (!liveState[msg.stationId]) liveState[msg.stationId] = {};
      const prev = liveState[msg.stationId][msg.key] || {};
      liveState[msg.stationId][msg.key] = { ...prev, available: msg.available };
      updateCard(msg.stationId, msg.key, prev.value, prev.ts, msg.available);
    }
  });
}

// ── Init ──────────────────────────────────────────────────────────────────────
(async () => {
  stations = await fetch('/config').then(r => r.json());
  buildGrid();
  connect();
})();

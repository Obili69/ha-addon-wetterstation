'use strict';
const http       = require('http');
const fs         = require('fs');
const path       = require('path');
const mqtt       = require('mqtt');
const config     = require('./config');
const db         = require('./db');

// ── Build lookup maps from config ────────────────────────────────────────────

const topicToSensor   = {};   // mqtt topic  → { stationId, key, type }
const availableTopics = {};   // availableTopic → key it governs

for (const station of config.stations) {
  for (const s of station.sensors) {
    topicToSensor[s.topic] = { stationId: station.id, key: s.key, type: s.type };
    if (s.availableTopic) {
      availableTopics[s.availableTopic] = s.key;
    }
  }
}

// Live state: { [stationId]: { [key]: { value, ts, available } } }
const state = {};
for (const station of config.stations) {
  state[station.id] = {};
}

// ── HTTP + static file server ─────────────────────────────────────────────────

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.ico':  'image/x-icon',
};

// SSE clients
const sseClients = new Set();

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost`);

  // ── REST: /history ──────────────────────────────────────────────────────
  if (url.pathname === '/history') {
    const sensor = url.searchParams.get('sensor');
    const range  = url.searchParams.get('range') || '24h';
    if (!sensor) {
      res.writeHead(400); return res.end('sensor param required');
    }
    const rows = db.history(sensor, range);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(rows));
  }

  // ── REST: /config ──────────────────────────────────────────────────────
  if (url.pathname === '/config') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(config.stations));
  }

  // ── REST: /state ──────────────────────────────────────────────────────
  if (url.pathname === '/state') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(state));
  }

  // ── SSE: /events ──────────────────────────────────────────────────────
  if (url.pathname === '/events') {
    res.writeHead(200, {
      'Content-Type':      'text/event-stream',
      'Cache-Control':     'no-cache',
      'Connection':        'keep-alive',
      'X-Accel-Buffering': 'no',   // disable Nginx response buffering
    });
    // Send full state immediately on connect
    res.write(`data: ${JSON.stringify({ type: 'snapshot', state })}\n\n`);
    sseClients.add(res);
    req.on('close', () => sseClients.delete(res));
    return;
  }

  // ── Static files ────────────────────────────────────────────────────────
  let filePath = path.join(__dirname, 'public',
    url.pathname === '/' ? 'index.html' : url.pathname);
  const ext = path.extname(filePath);

  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'text/plain' });
    res.end(data);
  });
});

// ── SSE broadcast + keepalive ─────────────────────────────────────────────────

function broadcast(msg) {
  const payload = `data: ${JSON.stringify(msg)}\n\n`;
  for (const client of sseClients) {
    client.write(payload);
  }
}

// Prevent proxy timeouts on idle SSE connections
setInterval(() => {
  for (const client of sseClients) {
    client.write(': keepalive\n\n');
  }
}, 25000);

// ── MQTT ──────────────────────────────────────────────────────────────────────

const mqttClient = mqtt.connect({
  host:     config.mqtt.host,
  port:     config.mqtt.port,
  username: config.mqtt.username,
  password: config.mqtt.password,
});

mqttClient.on('connect', () => {
  console.log('[MQTT] Connected to', config.mqtt.host);
  for (const station of config.stations) {
    mqttClient.subscribe(`weather/${station.id}/#`);
  }
});

mqttClient.on('error', (err) => console.error('[MQTT]', err.message));

mqttClient.on('message', (topic, payload) => {
  const raw = payload.toString().trim();

  // ── availability topics ──────────────────────────────────────────────────
  if (availableTopics[topic]) {
    const key       = availableTopics[topic];
    const parts     = topic.split('/');
    const stationId = parts[1];
    if (state[stationId] && state[stationId][key] !== undefined) {
      state[stationId][key].available = (raw === 'online');
      broadcast({ type: 'available', stationId, key, available: raw === 'online' });
    }
    return;
  }

  // ── value topics ─────────────────────────────────────────────────────────
  const meta = topicToSensor[topic];
  if (!meta) return;

  const { stationId, key, type } = meta;
  const value = type === 'text' ? raw : parseFloat(raw);
  const ts    = Math.floor(Date.now() / 1000);

  if (!state[stationId]) state[stationId] = {};
  const prev = state[stationId][key] || {};
  state[stationId][key] = { value, ts, available: prev.available !== false };

  if (type !== 'text') db.insert(`${stationId}/${key}`, value);

  broadcast({ type: 'update', stationId, key, value, ts });
});

// ── Start ─────────────────────────────────────────────────────────────────────

server.listen(config.wsPort, () => {
  console.log(`[HTTP/SSE] Listening on port ${config.wsPort}`);
});

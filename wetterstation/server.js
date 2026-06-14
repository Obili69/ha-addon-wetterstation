'use strict';
const http       = require('http');
const fs         = require('fs');
const path       = require('path');
const mqtt       = require('mqtt');
const { WebSocketServer } = require('ws');
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

  // ── REST: /config (sends station/sensor meta to frontend) ──────────────
  if (url.pathname === '/config') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(config.stations));
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

// ── WebSocket server ──────────────────────────────────────────────────────────

const wss = new WebSocketServer({ server });

function broadcast(msg) {
  const payload = JSON.stringify(msg);
  for (const client of wss.clients) {
    if (client.readyState === 1 /* OPEN */) client.send(payload);
  }
}

wss.on('connection', (ws) => {
  // Send full current state to newly connected client
  ws.send(JSON.stringify({ type: 'snapshot', state }));
});

// ── MQTT ──────────────────────────────────────────────────────────────────────

const mqttClient = mqtt.connect({
  host:     config.mqtt.host,
  port:     config.mqtt.port,
  username: config.mqtt.username,
  password: config.mqtt.password,
});

mqttClient.on('connect', () => {
  console.log('[MQTT] Connected to', config.mqtt.host);
  // Subscribe all station topics
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
    // find station id
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

  // Persist numeric values
  if (type !== 'text') db.insert(`${stationId}/${key}`, value);

  broadcast({ type: 'update', stationId, key, value, ts });
});

// ── Start ─────────────────────────────────────────────────────────────────────

server.listen(config.wsPort, () => {
  console.log(`[HTTP/WS] Listening on port ${config.wsPort}`);
});

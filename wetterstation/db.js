'use strict';
const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = '/data/weather.db';
const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS readings (
    id     INTEGER PRIMARY KEY,
    sensor TEXT    NOT NULL,
    value  REAL,
    ts     INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx ON readings(sensor, ts);
`);

const INSERT = db.prepare('INSERT INTO readings (sensor, value, ts) VALUES (?, ?, ?)');

function insert(sensor, value) {
  INSERT.run(sensor, value, Math.floor(Date.now() / 1000));
}

const RANGES = {
  '24h': 86400,
  '7d':  86400 * 7,
  '30d': 86400 * 30,
  '1y':  86400 * 365,
};

function history(sensor, range) {
  const seconds = RANGES[range] || RANGES['24h'];
  const since = Math.floor(Date.now() / 1000) - seconds;

  // Bucket into ~200 points max to keep payload small
  const totalPoints = 200;
  const bucketSize = Math.max(1, Math.floor(seconds / totalPoints));

  const rows = db.prepare(`
    SELECT
      (ts / ?) * ? AS bucket,
      AVG(value)   AS avg,
      MIN(value)   AS min,
      MAX(value)   AS max,
      COUNT(*)     AS cnt
    FROM readings
    WHERE sensor = ? AND ts >= ?
    GROUP BY bucket
    ORDER BY bucket ASC
  `).all(bucketSize, bucketSize, sensor, since);

  return rows.map(r => ({
    ts:  r.bucket,
    avg: r.avg,
    min: r.min,
    max: r.max,
  }));
}

// Return a flat snapshot of the latest value per sensor
function latest() {
  const rows = db.prepare(`
    SELECT sensor, value, ts
    FROM readings
    WHERE id IN (
      SELECT MAX(id) FROM readings GROUP BY sensor
    )
  `).all();

  const map = {};
  for (const r of rows) map[r.sensor] = { value: r.value, ts: r.ts };
  return map;
}

module.exports = { insert, history, latest };

#!/bin/sh
set -e

OPTIONS_FILE="/data/options.json"

# HA supervisor writes options to /data/options.json
if [ -f "$OPTIONS_FILE" ]; then
  export MQTT_HOST=$(jq -r '.mqtt_host' "$OPTIONS_FILE")
  export MQTT_PORT=$(jq -r '.mqtt_port' "$OPTIONS_FILE")
  export MQTT_USER=$(jq -r '.mqtt_user' "$OPTIONS_FILE")
  export MQTT_PASSWORD=$(jq -r '.mqtt_password' "$OPTIONS_FILE")
  export PORT=$(jq -r '.web_port' "$OPTIONS_FILE")
else
  echo "No options.json found, using defaults"
  export MQTT_HOST="${MQTT_HOST:-localhost}"
  export MQTT_PORT="${MQTT_PORT:-1883}"
  export MQTT_USER="${MQTT_USER:-homeassistant}"
  export MQTT_PASSWORD="${MQTT_PASSWORD:-}"
  export PORT="${PORT:-3001}"
fi

echo "Starting Wetterstation on port ${PORT}"
echo "Connecting to MQTT: ${MQTT_HOST}:${MQTT_PORT}"

exec node /app/server.js

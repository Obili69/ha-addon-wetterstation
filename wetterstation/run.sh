#!/usr/bin/with-contenv bashio

# Read config from HA options
export MQTT_HOST=$(bashio::config 'mqtt_host')
export MQTT_PORT=$(bashio::config 'mqtt_port')
export MQTT_USER=$(bashio::config 'mqtt_user')
export MQTT_PASSWORD=$(bashio::config 'mqtt_password')
export PORT=$(bashio::config 'web_port')

bashio::log.info "Starting Wetterstation on port ${PORT}"
bashio::log.info "Connecting to MQTT: ${MQTT_HOST}:${MQTT_PORT}"

cd /app
exec node server.js

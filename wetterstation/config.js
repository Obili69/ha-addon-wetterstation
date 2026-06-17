module.exports = {
  mqtt: {
    host:     process.env.MQTT_HOST     || 'localhost',
    port:     parseInt(process.env.MQTT_PORT || '1883', 10),
    username: process.env.MQTT_USER     || 'homeassistant',
    password: process.env.MQTT_PASSWORD || '',
  },
  wsPort: parseInt(process.env.PORT || '3001', 10),

  stations: [
    {
      id: 'F9',
      name: 'Guldistückli F9',
      sensors: [
        { topic: 'weather/F9/wind',         key: 'wind',             label: 'Wind',                       unit: 'km/h', type: 'number' },
        { topic: 'weather/F9/windDirection', key: 'windDirection',    label: 'Windrichtung',               unit: '°',    type: 'direction' },
        { topic: 'weather/F9/rainPerHour',   key: 'rainPerHour',      label: 'Regen',                      unit: 'mm/h', type: 'number' },
        { topic: 'weather/F9/totalRain24h',  key: 'totalRain24h',     label: 'Regen 24h',                  unit: 'mm',   type: 'number' },
        { topic: 'weather/F9/temperature',   key: 'temperature',    label: 'Temperatur',        unit: '°C',  type: 'number', availableTopic: 'weather/F9/temperature/available' },
        { topic: 'weather/F9/humidity',      key: 'humidity',       label: 'Luftfeuchtigkeit',  unit: '%',   type: 'number', availableTopic: 'weather/F9/humidity/available' },
        { topic: 'weather/F9/pressure',      key: 'pressure',       label: 'Luftdruck',         unit: 'hPa', type: 'number', availableTopic: 'weather/F9/pressure/available' },
        { topic: 'weather/F9/co2',           key: 'co2',            label: 'CO₂',               unit: 'ppm', type: 'number', availableTopic: 'weather/F9/co2/available' },
        { topic: 'weather/F9/lightningDist', key: 'lightningDist',  label: 'Blitz Distanz',     unit: 'km',  type: 'number', availableTopic: 'weather/F9/lightningDist/available' },
        { topic: 'weather/F9/lightningEnergy', key: 'lightningEnergy', label: 'Blitz Energie',  unit: '',    type: 'number' },
        { topic: 'weather/F9/rssi',          key: 'rssi',             label: 'Signal',                     unit: 'dBm',  type: 'number' },
        { topic: 'weather/F9/rssiCategory',  key: 'rssiCategory',     label: 'Signalqualität',             unit: '',     type: 'text' },
      ],
    },
  ],
};

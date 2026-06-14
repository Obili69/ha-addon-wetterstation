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
        { topic: 'weather/F9/temperatureStation',    key: 'tempStation',      label: 'Temp Station',               unit: '°C',   type: 'number', availableTopic: 'weather/F9/temperatureStation/available' },
        { topic: 'weather/F9/humidityStation',       key: 'humidityStation',  label: 'Luftfeuchtigkeit Station',   unit: '%',    type: 'number', availableTopic: 'weather/F9/humidityStation/available' },
        { topic: 'weather/F9/temperatureTraubenzone',key: 'tempTraubenzone',  label: 'Temp Traubenzone',           unit: '°C',   type: 'number', availableTopic: 'weather/F9/temperatureTraubenzone/available' },
        { topic: 'weather/F9/humidityTraubenzone',   key: 'humidityTraubenzone', label: 'Luftfeuchtigkeit Traubenzone', unit: '%', type: 'number', availableTopic: 'weather/F9/humidityTraubenzone/available' },
        { topic: 'weather/F9/rssi',          key: 'rssi',             label: 'Signal',                     unit: 'dBm',  type: 'number' },
        { topic: 'weather/F9/rssiCategory',  key: 'rssiCategory',     label: 'Signalqualität',             unit: '',     type: 'text' },
      ],
    },
  ],
};

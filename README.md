# Wetterstation Guldistückli — Home Assistant Add-on

MQTT weather dashboard for Guldistückli F9.

## Installation

1. Go to **Settings → Add-ons → Add-on Store**
2. Click the **⋮ menu** (top right) → **Repositories**
3. Add: `https://github.com/YOUR_GITHUB_USERNAME/ha-addon-wetterstation`
4. Find **Wetterstation Guldistückli** in the store and install
5. Configure MQTT credentials in the add-on **Configuration** tab
6. Start the add-on

## Configuration

| Option | Default | Description |
|---|---|---|
| `mqtt_host` | `localhost` | MQTT broker IP (use `localhost` if Mosquitto runs on HAOS) |
| `mqtt_port` | `1883` | MQTT broker port |
| `mqtt_user` | `homeassistant` | MQTT username |
| `mqtt_password` | `` | MQTT password |
| `web_port` | `3001` | Web UI port |

## Access

Open `http://<your-ha-ip>:3001` in your browser.

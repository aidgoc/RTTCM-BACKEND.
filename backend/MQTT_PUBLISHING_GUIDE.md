# 📤 MQTT Publishing Guide

This guide explains how to send data back to your MQTT broker from your backend.

## 🎯 Overview

You can publish messages to your MQTT broker in three ways:

1. **API Endpoints** - Send messages through HTTP API (recommended for production)
2. **Direct Script** - Publish directly using the standalone script
3. **Programmatic** - Use the MQTT client in your code

---

## 📡 Method 1: Using API Endpoints

### Send Command to Specific Crane

```bash
POST /api/cranes/:craneId/mqtt/publish
```

**Example Request:**
```bash
curl -X POST http://localhost:3001/api/cranes/TC101/mqtt/publish \
  -H "Content-Type: application/json" \
  -H "Cookie: token=YOUR_AUTH_TOKEN" \
  -d '{
    "messageType": "command",
    "message": {
      "action": "start_test",
      "testType": "limit_switch"
    }
  }'
```

**Example using JavaScript/Axios:**
```javascript
const response = await axios.post(
  `http://localhost:3001/api/cranes/TC101/mqtt/publish`,
  {
    messageType: 'command',
    message: {
      action: 'start_test',
      testType: 'limit_switch',
      parameters: {
        ls1: true,
        ls2: true,
        ls3: true,
        ls4: true
      }
    }
  },
  { withCredentials: true }
);
```

**Response:**
```json
{
  "success": true,
  "message": "Message published to MQTT broker",
  "topic": "crane/TC101/command",
  "craneId": "TC101",
  "payload": {
    "action": "start_test",
    "testType": "limit_switch"
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Custom Topic

You can also specify a custom MQTT topic:

```javascript
const response = await axios.post(
  `http://localhost:3001/api/cranes/TC101/mqtt/publish`,
  {
    topic: 'custom/crane/TC101/settings',
    message: {
      swl: 5000,
      reportingInterval: 5000
    }
  },
  { withCredentials: true }
);
```

### Broadcast to All Cranes

```bash
POST /api/cranes/mqtt/broadcast
```

**Example:**
```javascript
const response = await axios.post(
  `http://localhost:3001/api/cranes/mqtt/broadcast`,
  {
    messageType: 'announcement',
    message: {
      type: 'maintenance_notice',
      message: 'System maintenance tonight at 2 AM',
      priority: 'medium'
    }
  },
  { withCredentials: true }
);
```

---

## 🛠️ Method 2: Using Direct Script

We've created ready-to-use scripts for testing:

### Publish Message Script

```bash
node publish-mqtt-message.js [craneId] [messageType] [message]
```

**Examples:**

```bash
# Start a test
node publish-mqtt-message.js TC101 command '{"action":"start_test"}'

# Update settings
node publish-mqtt-message.js TC101 settings '{"swl":5000,"reportingInterval":3000}'

# Emergency stop
node publish-mqtt-message.js TC101 command '{"action":"emergency_stop","reason":"Safety override"}'

# Trigger alarm
node publish-mqtt-message.js TC101 alarm '{"type":"overload","severity":"critical"}'
```

### Monitor Commands Script

Monitor all published commands in real-time:

```bash
# Monitor all cranes
node monitor-mqtt-commands.js

# Monitor specific crane
node monitor-mqtt-commands.js TC101
```

### Test API Publishing Script

Complete test suite using the API:

```bash
node test-mqtt-publish.js
```

This script will:
1. Login to your system
2. Publish various test messages
3. Show you the results

---

## 💻 Method 3: Programmatic Usage

Use the MQTT client directly in your code:

```javascript
const mqttClient = require('./mqttClient');

// Publish a message
const topic = 'crane/TC101/command';
const message = JSON.stringify({
  action: 'start_test',
  testType: 'limit_switch'
});

mqttClient.publish(topic, message);
```

**Example: Send command from your route handler**

```javascript
router.post('/cranes/:id/start-test', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Publish MQTT command
    const mqttClient = require('../mqttClient');
    const message = JSON.stringify({
      action: 'start_test',
      timestamp: new Date().toISOString()
    });
    
    mqttClient.publish(`crane/${id}/command`, message);
    
    res.json({ success: true, message: 'Test started' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

## 📋 Common Message Types

### 1. **Command Messages** 
Topic: `crane/{craneId}/command`

```json
{
  "action": "start_test",
  "testType": "limit_switch",
  "parameters": {
    "ls1": true,
    "ls2": true,
    "ls3": true,
    "ls4": true
  }
}
```

### 2. **Settings Messages**
Topic: `crane/{craneId}/settings`

```json
{
  "swl": 5000,
  "reportingInterval": 5000,
  "windSpeedThreshold": 50,
  "autoShutdownEnabled": true
}
```

### 3. **Alarm Messages**
Topic: `crane/{craneId}/alarm`

```json
{
  "type": "overload",
  "severity": "critical",
  "message": "Load exceeds SWL",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 4. **Configuration Messages**
Topic: `crane/{craneId}/config`

```json
{
  "action": "update_config",
  "config": {
    "deviceId": "TC101",
    "firmware": "v2.1.0",
    "features": ["limit_test", "wind_monitor"]
  }
}
```

### 5. **Status Request**
Topic: `crane/{craneId}/command`

```json
{
  "action": "request_status",
  "includeDetails": true
}
```

### 6. **Emergency Commands**
Topic: `crane/{craneId}/command`

```json
{
  "action": "emergency_stop",
  "reason": "Safety override",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

## 🔍 Monitoring Published Messages

### Using MQTT Explorer (GUI)
1. Download [MQTT Explorer](http://mqtt-explorer.com/)
2. Connect to your broker
3. Navigate to `crane/` topics

### Using Mosquitto CLI

```bash
# Monitor all crane commands
mosquitto_sub -h localhost -t "crane/+/command"

# Monitor specific crane
mosquitto_sub -h localhost -t "crane/TC101/#"

# Monitor all topics
mosquitto_sub -h localhost -t "#"

# Monitor with credentials
mosquitto_sub -h localhost -u username -P password -t "crane/+/command"
```

### Using Our Monitor Script

```bash
# Monitor all
node monitor-mqtt-commands.js

# Monitor specific crane
node monitor-mqtt-commands.js TC101
```

---

## 📊 Topic Patterns

Your system uses these topic patterns:

| Pattern | Description | Example |
|---------|-------------|---------|
| `crane/{craneId}/telemetry` | Incoming telemetry data | `crane/TC101/telemetry` |
| `crane/{craneId}/command` | Outgoing commands | `crane/TC101/command` |
| `crane/{craneId}/settings` | Configuration updates | `crane/TC101/settings` |
| `crane/{craneId}/alarm` | Alarm triggers | `crane/TC101/alarm` |
| `crane/all/{type}` | Broadcast messages | `crane/all/announcement` |

---

## 🚀 Quick Start Examples

### Example 1: Start Limit Test

```bash
# Using script
node publish-mqtt-message.js TC101 command '{"action":"start_test","testType":"limit_switch"}'

# Using API
curl -X POST http://localhost:3001/api/cranes/TC101/mqtt/publish \
  -H "Content-Type: application/json" \
  -H "Cookie: token=YOUR_TOKEN" \
  -d '{"messageType":"command","message":{"action":"start_test"}}'
```

### Example 2: Update Crane Settings

```bash
node publish-mqtt-message.js TC101 settings '{"swl":5000,"reportingInterval":3000}'
```

### Example 3: Emergency Stop

```bash
node publish-mqtt-message.js TC101 command '{"action":"emergency_stop"}'
```

### Example 4: Monitor All Messages

Open a new terminal and run:
```bash
node monitor-mqtt-commands.js
```

Then publish messages in another terminal to see them appear.

---

## 🔧 Troubleshooting

### MQTT Client Not Connected

**Error:** `MQTT client not connected`

**Solution:**
1. Check your `.env` file has `MQTT_BROKER_URL` configured
2. Verify MQTT broker is running: `mosquitto -v`
3. Test connection: `mosquitto_pub -h localhost -t test -m "hello"`

### Authentication Failed

**Error:** `Connection refused: Not authorized`

**Solution:**
1. Check MQTT username/password in `.env`
2. Verify mosquitto.conf allows your credentials
3. Try without auth first: `allow_anonymous true` in mosquitto.conf

### Messages Not Received

**Checklist:**
- ✅ MQTT broker is running
- ✅ Backend is connected (check logs for "Connected to MQTT broker")
- ✅ Topic names match exactly (case-sensitive)
- ✅ QoS levels are compatible
- ✅ No firewall blocking MQTT port

---

## 📚 Additional Resources

- **MQTT Basics:** https://mqtt.org/
- **Mosquitto Documentation:** https://mosquitto.org/documentation/
- **MQTT Explorer:** http://mqtt-explorer.com/
- **Topic Best Practices:** https://www.hivemq.com/blog/mqtt-essentials-part-5-mqtt-topics-best-practices/

---

## 🆘 Need Help?

If you encounter issues:

1. Check backend logs for MQTT connection status
2. Use `monitor-mqtt-commands.js` to verify messages are published
3. Test with `mosquitto_sub` to rule out code issues
4. Verify your `.env` configuration

**Common .env settings:**
```bash
MQTT_BROKER_URL=mqtt://localhost:1883
MQTT_USERNAME=your_username
MQTT_PASSWORD=your_password
```

---

Happy Publishing! 🎉


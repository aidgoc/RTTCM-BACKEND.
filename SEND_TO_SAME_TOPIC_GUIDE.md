# 📤 How to Send Data to the Same Topic Your Crane Subscribes To

## 🎯 Quick Answer

Your crane is **subscribed to certain topics** to receive commands. You need to **publish to those EXACT topics** for your crane to receive the data.

---

## 🔍 **Step 1: Find Out What Topic Your Crane Listens To**

### Option A: Discover Active Topics Automatically

Run this script to see ALL topics in your MQTT broker:

```bash
node discover-mqtt-topics.js
```

This will show you:
- ✅ All active topics
- ✅ How many messages on each topic
- ✅ Sample messages from each topic

**Example output:**
```
📋 All Discovered Topics:

1. crane/TC101/telemetry       ← Crane is PUBLISHING here (you receive)
   Messages: 150

2. crane/TC101/status          ← Crane is PUBLISHING here (you receive)
   Messages: 50

3. crane/TC101/command         ← Crane is LISTENING here (you send)
   Messages: 5
```

### Option B: Check Your Crane Documentation

Your crane/device should document what topics it subscribes to. Common patterns:

```
crane/TC101/command     ← Most common for commands
crane/TC101/settings    ← For configuration
crane/TC101/config      ← For settings
crane/TC101/cmd         ← Alternative command topic
crane/TC101/downlink    ← LoRa/IoT devices
device/TC101/command    ← Alternative pattern
```

### Option C: Ask Your Hardware Team

Ask them: **"What MQTT topics does the crane subscribe to?"**

---

## 📤 **Step 2: Publish to That Exact Topic**

Once you know the topic, use one of these methods:

### Method A: Using the Exact Topic Script (Easiest!) ⭐

```bash
node publish-to-exact-topic.js "crane/TC101/command" '{"action":"start_test"}'
```

**Format:**
```bash
node publish-to-exact-topic.js "EXACT_TOPIC" '{"your":"message"}'
```

**Examples:**

```bash
# If crane subscribes to: crane/TC101/command
node publish-to-exact-topic.js "crane/TC101/command" '{"action":"start_test"}'

# If crane subscribes to: crane/TC101/settings
node publish-to-exact-topic.js "crane/TC101/settings" '{"swl":5000}'

# If crane subscribes to: device/TC101/cmd
node publish-to-exact-topic.js "device/TC101/cmd" '{"cmd":"reset"}'

# Custom topic structure
node publish-to-exact-topic.js "your/custom/topic/here" '{"data":"anything"}'
```

---

### Method B: Using the API with Custom Topic

```javascript
const response = await axios.post(
  'http://localhost:3001/api/cranes/TC101/mqtt/publish',
  {
    topic: 'crane/TC101/command',  // ← EXACT topic your crane listens to
    message: {
      action: 'start_test',
      testType: 'limit_switch'
    }
  },
  { withCredentials: true }
);
```

**Using curl:**
```bash
curl -X POST http://localhost:3001/api/cranes/TC101/mqtt/publish \
  -H "Content-Type: application/json" \
  -H "Cookie: token=YOUR_TOKEN" \
  -d '{
    "topic": "crane/TC101/command",
    "message": {"action": "start_test"}
  }'
```

---

### Method C: Directly in Code

```javascript
const mqttClient = require('./mqttClient');

// Publish to the exact topic your crane is subscribed to
const exactTopic = 'crane/TC101/command';
const message = JSON.stringify({
  action: 'start_test',
  timestamp: new Date().toISOString()
});

mqttClient.publish(exactTopic, message);
```

---

## 🧪 **Complete Testing Workflow**

### **Step 1:** Discover what topics are active
```bash
# Terminal 1 - Start discovery
node discover-mqtt-topics.js
```

Let it run for 30 seconds while your crane is sending data. You'll see all active topics.

### **Step 2:** Monitor the specific topic
```bash
# Terminal 2 - Monitor specific topic
mosquitto_sub -h localhost -t "crane/TC101/command" -v
```

### **Step 3:** Publish to that topic
```bash
# Terminal 3 - Publish
node publish-to-exact-topic.js "crane/TC101/command" '{"action":"test"}'
```

You should see the message appear in Terminal 2!

---

## 📋 **Common Topic Patterns**

### Pattern 1: Bidirectional with Different Suffixes

```
Crane publishes to:          Backend publishes to:
├─ crane/TC101/telemetry     ├─ crane/TC101/command
├─ crane/TC101/status        ├─ crane/TC101/settings
├─ crane/TC101/heartbeat     └─ crane/TC101/config
└─ crane/TC101/alarm

Backend subscribes to:       Crane subscribes to:
├─ crane/+/telemetry         ├─ crane/TC101/command
├─ crane/+/status            ├─ crane/TC101/settings
├─ crane/+/heartbeat         └─ crane/TC101/config
└─ crane/+/alarm
```

### Pattern 2: Uplink/Downlink

```
Crane publishes to:          Backend publishes to:
└─ crane/TC101/uplink        └─ crane/TC101/downlink

Backend subscribes to:       Crane subscribes to:
└─ crane/+/uplink            └─ crane/TC101/downlink
```

### Pattern 3: Request/Response

```
Crane publishes to:          Backend publishes to:
└─ crane/TC101/response      └─ crane/TC101/request

Backend subscribes to:       Crane subscribes to:
└─ crane/+/response          └─ crane/TC101/request
```

---

## 🔧 **Verify Your Setup**

### Check 1: Is your crane receiving messages?

```bash
# Monitor the command topic
mosquitto_sub -h localhost -t "crane/TC101/command" -v

# In another terminal, publish
node publish-to-exact-topic.js "crane/TC101/command" '{"action":"test"}'

# You should see the message appear
```

### Check 2: Check your crane logs

Your crane/device should log when it receives MQTT messages. Check those logs.

### Check 3: Use MQTT Explorer

1. Download [MQTT Explorer](http://mqtt-explorer.com/)
2. Connect to your broker
3. Publish a message
4. Watch for subscriptions

---

## 💡 **Real-World Example**

Let's say your crane documentation says:

> "The crane subscribes to `crane/{DEVICE_ID}/cmd` for receiving commands"

Here's how to send commands:

```bash
# Publish to exact topic
node publish-to-exact-topic.js "crane/TC101/cmd" '{"action":"start_test"}'

# Or using API
curl -X POST http://localhost:3001/api/cranes/TC101/mqtt/publish \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "crane/TC101/cmd",
    "message": {"action": "start_test"}
  }'
```

---

## 🆘 **Troubleshooting**

### ❌ Crane not receiving messages?

**Checklist:**

1. ✅ **Verify topic name exactly matches**
   ```bash
   # Wrong: crane/TC101/Command (capital C)
   # Right: crane/TC101/command (lowercase)
   ```

2. ✅ **Check MQTT broker logs**
   ```bash
   # Run mosquitto in verbose mode
   mosquitto -v
   ```

3. ✅ **Verify crane is connected**
   ```bash
   # Use MQTT Explorer to see active clients
   ```

4. ✅ **Check message format**
   - Is it JSON? String?
   - Does crane expect specific fields?

5. ✅ **Test with mosquitto_pub**
   ```bash
   mosquitto_pub -h localhost -t "crane/TC101/command" -m '{"action":"test"}'
   ```

---

## 📚 **Quick Reference Commands**

```bash
# Discover all active topics
node discover-mqtt-topics.js

# Publish to exact topic
node publish-to-exact-topic.js "TOPIC" '{"message":"data"}'

# Monitor specific topic
mosquitto_sub -h localhost -t "crane/TC101/command" -v

# Monitor all topics
mosquitto_sub -h localhost -t "#" -v

# Test publish with mosquitto
mosquitto_pub -h localhost -t "crane/TC101/command" -m '{"test":"message"}'
```

---

## 🎯 **Summary**

1. **Find the exact topic** your crane subscribes to (use `discover-mqtt-topics.js`)
2. **Publish to that exact topic** (use `publish-to-exact-topic.js "TOPIC" 'MESSAGE'`)
3. **Verify** the message was received (check crane logs or use `mosquitto_sub`)

---

**Need help finding your crane's subscription topic?** 

Run these and share the output:
```bash
node discover-mqtt-topics.js
```

Let me know what topics you see, and I can help you determine which one to publish to! 🚀


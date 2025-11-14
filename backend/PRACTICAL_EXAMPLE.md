# Practical Example: Complete Working Example

## 🎯 Real-World Scenario

**Company:** ABC Construction Ltd.  
**Company ID:** `ABC001`  
**Device:** DRM3400 with Device ID `abc`  
**Location:** Construction Site A

---

## 📡 Step 1: Device Configuration

### Configure DRM3400 Device

```bash
# Device Settings
MQTT Broker: mqtt://your-broker.com:1883
MQTT Username: company1_user
MQTT Password: secure_password_123
MQTT Topic: company/ABC001/crane/DM-abc/telemetry
Publish Interval: Every 30 seconds
```

### Device Sends Data

**Every 30 seconds, device publishes:**
```
Topic: company/ABC001/crane/DM-abc/telemetry
Payload: $DMabc68e1d43820087#0506
```

---

## 🔧 Step 2: Backend Configuration

### `.env` File Setup

```bash
# MQTT Configuration
MQTT_BROKER_URL=mqtt://your-broker.com:1883
MQTT_USERNAME=backend_user
MQTT_PASSWORD=backend_password

# Subscribe to all companies
TOPIC_TELEMETRY=company/+/crane/+/telemetry
TOPIC_STATUS=company/+/crane/+/status
TOPIC_LOCATION=company/+/crane/+/location
TOPIC_TEST=company/+/crane/+/test
TOPIC_ALARM=company/+/crane/+/alarm
TOPIC_HEARTBEAT=company/+/crane/+/heartbeat

# MongoDB
MONGO_URI=mongodb://localhost:27017/cranefleet
```

### Backend Logs (When Message Arrives)

```
✅ Connected to MQTT broker successfully
Subscribed to company/+/crane/+/telemetry
Subscribed to company/+/crane/+/status
...

📦 Company: ABC001, Crane: DM-abc
Received MQTT message on company/ABC001/crane/DM-abc/telemetry: $DMabc68e1d43820087#0506
✅ Parser succeeded!
Processed telemetry for crane DM-abc
```

---

## 💾 Step 3: Data Storage

### MongoDB Telemetry Document

```javascript
// Collection: telemetries
{
  "_id": ObjectId("65a1b2c3d4e5f6a7b8c9d0e1"),
  "craneId": "DM-abc",
  "ts": ISODate("2090-01-22T15:20:00.000Z"),
  "load": 0,
  "swl": 0,
  "ls1": "OK",
  "ls2": "HIT",        // ← Limit Switch 2 triggered
  "ls3": "OK",
  "ls4": "OK",
  "util": 0,
  "ut": "OFF",
  "raw": "$DMabc68e1d43820087#0506",
  "createdAt": ISODate("2024-01-15T10:30:00.000Z"),
  "updatedAt": ISODate("2024-01-15T10:30:00.000Z")
}
```

### MongoDB Crane Document (if new)

```javascript
// Collection: cranes (pending)
{
  "craneId": "DM-abc",
  "name": "Unknown Crane DM-abc",
  "location": "Unknown Location",
  "swl": 0,
  "isActive": false,
  "isPending": true,
  "companyId": "ABC001",  // ← From MQTT topic
  "discoveredAt": ISODate("2024-01-15T10:30:00.000Z"),
  "lastSeen": ISODate("2024-01-15T10:30:00.000Z"),
  "telemetryCount": 1
}
```

---

## 🌐 Step 4: API Access

### Get Telemetry Data

**Request:**
```bash
GET /api/cranes/DM-abc/telemetry
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**
```json
{
  "craneId": "DM-abc",
  "telemetry": [
    {
      "craneId": "DM-abc",
      "timestamp": "2090-01-22T15:20:00.000Z",
      "load": 0,
      "swl": 0,
      "utilization": 0,
      "isOverloaded": false,
      "limitSwitchStatus": {
        "ls1": "OK",
        "ls2": "HIT",
        "ls3": "OK",
        "ls4": "OK"
      },
      "hasFailures": true,
      "raw": "$DMabc68e1d43820087#0506"
    }
  ],
  "count": 1
}
```

---

## 🖥️ Step 5: Frontend Display

### React Component Example

```jsx
import React, { useState, useEffect } from 'react';
import { cranesAPI } from '../lib/api';

function CraneStatus({ craneId }) {
  const [telemetry, setTelemetry] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTelemetry() {
      try {
        const response = await cranesAPI.getTelemetry(craneId);
        if (response.data.telemetry && response.data.telemetry.length > 0) {
          setTelemetry(response.data.telemetry[0]);
        }
      } catch (error) {
        console.error('Error fetching telemetry:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchTelemetry();
    // Refresh every 5 seconds
    const interval = setInterval(fetchTelemetry, 5000);
    return () => clearInterval(interval);
  }, [craneId]);

  if (loading) return <div>Loading...</div>;
  if (!telemetry) return <div>No data available</div>;

  const { limitSwitchStatus } = telemetry;
  const hasAlerts = limitSwitchStatus.ls2 === 'HIT';

  return (
    <div className="crane-dashboard">
      <h2>Crane: {craneId}</h2>
      
      <div className="status-grid">
        <div className="status-card">
          <h3>Load Information</h3>
          <p>Current Load: {telemetry.load} kg</p>
          <p>SWL: {telemetry.swl} kg</p>
          <p>Utilization: {telemetry.utilization}%</p>
        </div>

        <div className="status-card">
          <h3>Limit Switches</h3>
          <div className="limit-switches">
            <div className={`switch ${limitSwitchStatus.ls1 === 'HIT' ? 'alert' : 'ok'}`}>
              LS1: {limitSwitchStatus.ls1}
            </div>
            <div className={`switch ${limitSwitchStatus.ls2 === 'HIT' ? 'alert' : 'ok'}`}>
              LS2: {limitSwitchStatus.ls2} {limitSwitchStatus.ls2 === 'HIT' && '⚠️'}
            </div>
            <div className={`switch ${limitSwitchStatus.ls3 === 'HIT' ? 'alert' : 'ok'}`}>
              LS3: {limitSwitchStatus.ls3}
            </div>
            <div className={`switch ${limitSwitchStatus.ls4 === 'HIT' ? 'alert' : 'ok'}`}>
              LS4: {limitSwitchStatus.ls4}
            </div>
          </div>
        </div>
      </div>

      {hasAlerts && (
        <div className="alert-banner">
          ⚠️ Alert: Limit Switch LS2 is HIT!
        </div>
      )}
    </div>
  );
}

export default CraneStatus;
```

### Visual Display

```
┌─────────────────────────────────────────────────────────┐
│  Crane Dashboard: DM-abc                    [ABC001]    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  📊 Load Information                                     │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Current Load:  0 kg                               │  │
│  │ SWL:           0 kg                               │  │
│  │ Utilization:   0%                                 │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  🔌 Limit Switches                                       │
│  ┌──────┬──────┬──────┬──────┐                         │
│  │ LS1  │ LS2  │ LS3  │ LS4  │                         │
│  ├──────┼──────┼──────┼──────┤                         │
│  │ ✅ OK│ ⚠️ HIT│ ✅ OK│ ✅ OK│                         │
│  └──────┴──────┴──────┴──────┘                         │
│                                                          │
│  ⚠️  Alert: Limit Switch LS2 is HIT!                     │
│                                                          │
│  Last Updated: 2024-01-15 10:30:00                      │
└─────────────────────────────────────────────────────────┘
```

---

## 🧪 Testing with Command Line

### 1. Test Parser Only

```bash
cd backend
node test-complete-flow.js
```

### 2. Test MQTT Publishing

```bash
# Install mosquitto client (if not installed)
# Windows: Download from https://mosquitto.org/download/
# Linux: sudo apt-get install mosquitto-clients

# Publish test message
mosquitto_pub -h localhost -p 1883 \
  -t "company/ABC001/crane/DM-abc/telemetry" \
  -m "$DMabc68e1d43820087#0506"
```

### 3. Check Backend Logs

```bash
# In backend terminal, you should see:
📦 Company: ABC001, Crane: DM-abc
Received MQTT message on company/ABC001/crane/DM-abc/telemetry: $DMabc68e1d43820087#0506
✅ Parser succeeded!
Processed telemetry for crane DM-abc
```

### 4. Check MongoDB

```bash
# Connect to MongoDB
mongosh mongodb://localhost:27017/cranefleet

# Query telemetry
db.telemetries.find({ craneId: "DM-abc" }).sort({ ts: -1 }).limit(1).pretty()

# Query pending cranes
db.cranes.find({ isPending: true }).pretty()
```

### 5. Test API Endpoint

```bash
# Get authentication token first (login)
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'

# Use token to get telemetry
curl -X GET http://localhost:3001/api/cranes/DM-abc/telemetry \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Cookie: token=YOUR_SESSION_TOKEN"
```

---

## 📊 Complete Data Flow Timeline

```
Time: 10:30:00.000
┌─────────────────────────────────────────────────────────────┐
│ Device (DRM3400)                                            │
│   └─> Publishes: company/ABC001/crane/DM-abc/telemetry     │
│       Payload: $DMabc68e1d43820087#0506                     │
└─────────────────────────────────────────────────────────────┘
                          ↓
Time: 10:30:00.100
┌─────────────────────────────────────────────────────────────┐
│ MQTT Broker (Mosquitto)                                      │
│   └─> Receives message                                      │
│   └─> Routes to subscribed clients                          │
└─────────────────────────────────────────────────────────────┘
                          ↓
Time: 10:30:00.200
┌─────────────────────────────────────────────────────────────┐
│ Backend MQTT Client                                          │
│   └─> Extracts: companyId="ABC001", craneId="DM-abc"        │
│   └─> Calls: processTelemetry("DM-abc", payload, "ABC001")  │
└─────────────────────────────────────────────────────────────┘
                          ↓
Time: 10:30:00.300
┌─────────────────────────────────────────────────────────────┐
│ Parser                                                       │
│   └─> Parses: $DMabc68e1d43820087#0506                      │
│   └─> Returns: { craneId: "DM-abc", ls2: "HIT", ... }       │
└─────────────────────────────────────────────────────────────┘
                          ↓
Time: 10:30:00.400
┌─────────────────────────────────────────────────────────────┐
│ Crane Discovery                                              │
│   └─> Checks if crane exists                                │
│   └─> Creates pending entry with companyId="ABC001"         │
└─────────────────────────────────────────────────────────────┘
                          ↓
Time: 10:30:00.500
┌─────────────────────────────────────────────────────────────┐
│ MongoDB                                                      │
│   └─> Saves Telemetry document                              │
│   └─> Updates/creates Crane document                        │
└─────────────────────────────────────────────────────────────┘
                          ↓
Time: 10:30:01.000
┌─────────────────────────────────────────────────────────────┐
│ Frontend (User requests data)                                │
│   └─> GET /api/cranes/DM-abc/telemetry                      │
│   └─> Receives JSON response                                │
│   └─> Displays in UI                                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔐 Security & Access Control

### Company Isolation

**User from ABC001:**
- ✅ Can see: DM-abc, DM-def (ABC001 cranes)
- ❌ Cannot see: DM-xyz (XYZ002 cranes)

**User from XYZ002:**
- ✅ Can see: DM-xyz (XYZ002 cranes)
- ❌ Cannot see: DM-abc, DM-def (ABC001 cranes)

### MQTT ACL Example (Mosquitto)

```bash
# /etc/mosquitto/acl.conf

# ABC001 company user
user company1_user
topic write company/ABC001/crane/+/#
topic read company/ABC001/crane/+/#

# XYZ002 company user
user company2_user
topic write company/XYZ002/crane/+/#
topic read company/XYZ002/crane/+/#

# Backend user (can read all)
user backend_user
topic read company/+/crane/+/#
```

---

## ✅ Verification Checklist

- [ ] MQTT broker running and accessible
- [ ] Backend subscribed to company-based topics
- [ ] Device configured with correct topic format
- [ ] Parser correctly decoding 20-byte packets
- [ ] Company ID extracted from topic
- [ ] Data stored in MongoDB
- [ ] API endpoint returning correct data
- [ ] Frontend displaying data correctly
- [ ] Company isolation working (users see only their company's data)

---

This is a complete, working example! 🚀












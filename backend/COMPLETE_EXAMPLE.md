# Complete Example: Company-Based MQTT Data Flow

## Scenario
- **Company**: ABC Construction (Company ID: `ABC001`)
- **Device**: DRM3400 with Device ID: `abc`
- **Crane ID**: `DM-abc` (auto-generated from device ID)
- **MQTT Topic**: `company/ABC001/crane/DM-abc/telemetry`
- **Data Packet**: `$DMabc68e1d43820087#0506`

---

## Step-by-Step Flow

### Step 1: Device Sends MQTT Message

**Device Configuration:**
```
MQTT Broker: mqtt://your-broker.com:1883
Topic: company/ABC001/crane/DM-abc/telemetry
Payload: $DMabc68e1d43820087#0506
```

**What happens:**
- DRM3400 device sends 20-byte packet to MQTT broker
- Topic includes company ID (`ABC001`) and device ID (`DM-abc`)

---

### Step 2: Backend Receives MQTT Message

**MQTT Client (`mqttClient.js`) receives:**
```javascript
Topic: "company/ABC001/crane/DM-abc/telemetry"
Payload: "$DMabc68e1d43820087#0506"
```

**System extracts:**
```javascript
// Topic parsing:
topicParts = ["company", "ABC001", "crane", "DM-abc", "telemetry"]
companyId = "ABC001"  // Extracted from topicParts[1]
craneId = "DM-abc"    // Extracted from topicParts[3]
```

**Console log shows:**
```
📦 Company: ABC001, Crane: DM-abc
Received MQTT message on company/ABC001/crane/DM-abc/telemetry: $DMabc68e1d43820087#0506
```

---

### Step 3: Parser Converts to JSON

**Parser (`parser.js`) processes payload:**
```javascript
Input: "$DMabc68e1d43820087#0506"

Parsed Output:
{
  "craneId": "DM-abc",
  "deviceId": "abc",
  "deviceType": "DM",
  "ts": "2090-01-22T15:20:00.000Z",
  "commandType": "event",
  "command": 104,
  "crc": "0506",
  "raw": "$DMabc68e1d43820087#0506",
  "util": 0,
  "ut": "OFF",
  "overload": false,
  "ls1": "OK",
  "ls2": "HIT",      // ← Limit Switch 2 is triggered
  "ls3": "OK",
  "ls4": "OK",
  "load": 0,
  "swl": 0,
  "companyId": "ABC001"  // ← Added from topic
}
```

---

### Step 4: Crane Discovery

**Crane Discovery (`craneDiscovery.js`) checks:**

```javascript
// Check if crane exists
crane = await Crane.findOne({ craneId: "DM-abc", isActive: true });

if (crane exists) {
  // Update existing crane
  return { crane, isNew: false };
} else {
  // Create pending crane entry
  pendingCrane = {
    craneId: "DM-abc",
    name: "Unknown Crane DM-abc",
    location: "Unknown Location",
    swl: 0,
    isActive: false,
    isPending: true,
    discoveredAt: new Date(),
    lastSeen: new Date(),
    companyId: "ABC001",  // ← Stored from topic
    telemetryCount: 1,
    lastTelemetryData: { ... }
  };
  
  return { crane: pendingCrane, isNew: true, isPending: true };
}
```

---

### Step 5: Store Telemetry in MongoDB

**Telemetry Document created:**
```javascript
{
  "_id": ObjectId("..."),
  "craneId": "DM-abc",
  "ts": ISODate("2090-01-22T15:20:00.000Z"),
  "load": 0,
  "swl": 0,
  "ls1": "OK",
  "ls2": "HIT",
  "ls3": "OK",
  "ls4": "OK",
  "util": 0,
  "ut": "OFF",
  "raw": "$DMabc68e1d43820087#0506",
  "createdAt": ISODate("2024-01-15T10:30:00.000Z"),
  "updatedAt": ISODate("2024-01-15T10:30:00.000Z")
}
```

**Stored in MongoDB collection:** `telemetries`

---

### Step 6: Update Crane Status

**Crane document updated:**
```javascript
await Crane.findOneAndUpdate(
  { craneId: "DM-abc" },
  {
    lastSeen: new Date(),
    online: true,
    lastStatusRaw: {
      ls1: "OK",
      ls2: "HIT",
      ls3: "OK",
      ls4: "OK",
      util: 0,
      ut: "OFF"
    }
  }
);
```

---

### Step 7: Frontend Fetches Data

**API Request:**
```javascript
GET /api/cranes/DM-abc/telemetry
Headers: {
  Authorization: "Bearer <token>",
  Cookie: "token=<session-token>"
}
```

**Backend Response:**
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

### Step 8: Frontend Displays Data

**React Component:**
```jsx
import { cranesAPI } from '../lib/api';

function CraneDashboard({ craneId }) {
  const [telemetry, setTelemetry] = useState(null);
  
  useEffect(() => {
    // Fetch telemetry data
    cranesAPI.getTelemetry(craneId)
      .then(response => {
        setTelemetry(response.data.telemetry[0]);
      });
  }, [craneId]);
  
  return (
    <div>
      <h2>Crane: {craneId}</h2>
      <div>
        <p>Load: {telemetry?.load} kg</p>
        <p>SWL: {telemetry?.swl} kg</p>
        <p>Utilization: {telemetry?.utilization}%</p>
        <div>
          <span>LS1: {telemetry?.limitSwitchStatus.ls1}</span>
          <span>LS2: {telemetry?.limitSwitchStatus.ls2}</span> {/* HIT */}
          <span>LS3: {telemetry?.limitSwitchStatus.ls3}</span>
          <span>LS4: {telemetry?.limitSwitchStatus.ls4}</span>
        </div>
      </div>
    </div>
  );
}
```

---

## Complete Data Flow Diagram

```
┌─────────────────┐
│  DRM3400 Device │
│  Device ID: abc │
└────────┬────────┘
         │
         │ MQTT Publish
         │ Topic: company/ABC001/crane/DM-abc/telemetry
         │ Payload: $DMabc68e1d43820087#0506
         ▼
┌─────────────────┐
│  MQTT Broker    │
│  (Mosquitto)    │
└────────┬────────┘
         │
         │ Subscribe: company/+/crane/+/telemetry
         ▼
┌─────────────────┐
│  Backend Server │
│  mqttClient.js  │
└────────┬────────┘
         │
         │ Extract: companyId="ABC001", craneId="DM-abc"
         ▼
┌─────────────────┐
│  Parser         │
│  parser.js      │
└────────┬────────┘
         │
         │ Parse: $DMabc68e1d43820087#0506
         │ → JSON with ls2="HIT"
         ▼
┌─────────────────┐
│  Crane Discovery│
│  craneDiscovery │
└────────┬────────┘
         │
         │ Check/Create crane with companyId="ABC001"
         ▼
┌─────────────────┐
│  MongoDB        │
│  - Telemetry    │
│  - Crane        │
└────────┬────────┘
         │
         │ API: GET /api/cranes/DM-abc/telemetry
         ▼
┌─────────────────┐
│  Frontend       │
│  React/Next.js  │
└─────────────────┘
```

---

## Real-World Example with Multiple Companies

### Company 1: ABC Construction
```bash
# Device publishes to:
Topic: company/ABC001/crane/DM-abc/telemetry
Payload: $DMabc68e1d43820087#0506

# System stores:
- Company: ABC001
- Crane: DM-abc
- Data: LS2=HIT
```

### Company 2: XYZ Builders
```bash
# Device publishes to:
Topic: company/XYZ002/crane/DM-xyz/telemetry
Payload: $DMxyz68e1d43820099#0607

# System stores:
- Company: XYZ002
- Crane: DM-xyz
- Data: LS1=HIT
```

### Backend Logs Show:
```
📦 Company: ABC001, Crane: DM-abc
Received MQTT message on company/ABC001/crane/DM-abc/telemetry: $DMabc68e1d43820087#0506
Processed telemetry for crane DM-abc

📦 Company: XYZ002, Crane: DM-xyz
Received MQTT message on company/XYZ002/crane/DM-xyz/telemetry: $DMxyz68e1d43820099#0607
Processed telemetry for crane DM-xyz
```

### Data Isolation:
- Company ABC001 users can only see DM-abc data
- Company XYZ002 users can only see DM-xyz data
- No cross-company data access

---

## Testing the Complete Flow

### 1. Start Backend
```bash
cd backend
npm start
```

### 2. Publish Test Message
```bash
# Using mosquitto_pub
mosquitto_pub -h localhost -t "company/ABC001/crane/DM-abc/telemetry" \
  -m "$DMabc68e1d43820087#0506"
```

### 3. Check Backend Logs
```
✅ Connected to MQTT broker successfully
Subscribed to company/+/crane/+/telemetry
📦 Company: ABC001, Crane: DM-abc
Received MQTT message on company/ABC001/crane/DM-abc/telemetry: $DMabc68e1d43820087#0506
✅ Parser succeeded!
Processed telemetry for crane DM-abc
```

### 4. Check MongoDB
```javascript
// Connect to MongoDB
use cranefleet

// Check telemetry
db.telemetries.find({ craneId: "DM-abc" }).sort({ ts: -1 }).limit(1)

// Result:
{
  "_id": ObjectId("..."),
  "craneId": "DM-abc",
  "ts": ISODate("2090-01-22T15:20:00.000Z"),
  "ls2": "HIT",
  ...
}
```

### 5. Test API Endpoint
```bash
curl -X GET http://localhost:3001/api/cranes/DM-abc/telemetry \
  -H "Authorization: Bearer <token>" \
  -H "Cookie: token=<session-token>"
```

### 6. Frontend Display
```jsx
// Component automatically fetches and displays:
Crane: DM-abc
Load: 0 kg
SWL: 0 kg
LS1: OK
LS2: HIT ⚠️
LS3: OK
LS4: OK
```

---

## Key Points

1. **Company ID comes from MQTT topic**, not from data packet
2. **Device ID comes from data packet** (`abc` in `$DMabc...`)
3. **Crane ID is auto-generated** (`DM-abc` from device ID)
4. **All data is company-isolated** via topic structure
5. **System handles both new and existing cranes**
6. **Frontend gets filtered data** based on user's company

---

## Troubleshooting

### Issue: Company ID not extracted
**Check:** Topic format
```bash
# ✅ Correct
company/ABC001/crane/DM-abc/telemetry

# ❌ Wrong
crane/DM-abc/telemetry  # No company ID
```

### Issue: Crane not found
**Check:** Crane exists in database
```javascript
// In MongoDB
db.cranes.find({ craneId: "DM-abc" })
```

### Issue: Data not appearing in frontend
**Check:** 
1. User has access to company ABC001
2. API endpoint returns data
3. Frontend is calling correct endpoint

---

This complete example shows the entire flow from device to frontend! 🚀













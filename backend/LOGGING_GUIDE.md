# Backend Logging Guide

## 📋 Current Logging Setup

Your backend uses **Winston** for structured logging with the following configuration:

### Log Files
- **`logs/error.log`** - Only error-level logs (max 5MB, keeps 5 files)
- **`logs/combined.log`** - All logs (max 5MB, keeps 5 files)
- **`logs/performance.log`** - Performance metrics (max 10MB, keeps 3 files)
- **Console** - Colorized output for development

### Log Levels
- `error` - Critical errors
- `warn` - Warnings
- `info` - Informational messages
- `debug` - Debug information (if enabled)

---

## 🔍 What You'll See When DM Packets Arrive

### 1. **MQTT Connection Logs** (Console)
```
✅ Connected to MQTT broker successfully
Subscribed to telemetry
Subscribed to crane/+/status
```

### 2. **When Packet `$DM123609f1bd5020000004C1` Arrives**

#### Console Output:
```
Received MQTT message on crane/123609/telemetry: $DM123609f1bd5020000004C1
📦 Company: null, Crane: 123609
Processed telemetry for crane 123609
```

#### If Company ID is Present:
```
Received MQTT message on company/ABC123/crane/123609/telemetry: $DM123609f1bd5020000004C1
📦 Company: ABC123, Crane: 123609
Processed telemetry for crane 123609
```

### 3. **Parsing Success Logs** (in `logs/combined.log`)
The parser will decode:
- Device ID: `123609`
- Timestamp: `f1bd5020` → Converted to ISO timestamp
- StatusWord: `0000` → Decoded to:
  - LS1: OK, LS2: OK, LS3: OK, LS4: OK
  - Overload: false
  - Utilization: false
  - Test Mode: false
- Load: `04C1` → 1217 (decimal)

### 4. **MongoDB Save Logs**
When telemetry is saved successfully:
- No explicit success log (silent success)
- If error occurs: `Error processing telemetry for crane 123609: [error details]`

### 5. **Error Scenarios**

#### Parse Failure:
```
Failed to parse telemetry for crane 123609: $DM123609f1bd5020000004C1
```

#### Invalid Data:
```
Invalid telemetry data for crane 123609: { craneId: undefined, ts: undefined }
```

#### Pending Crane:
```
⏳ Crane 123609 is pending approval, storing telemetry for later
```

#### Parser Error (in `logs/error.log`):
```
DRM3400 Compact format parsing error: [error message]
Payload: $DM123609f1bd5020000004C1
```

---

## 📊 Log File Structure

### JSON Format (in log files):
```json
{
  "timestamp": "2024-11-10T12:00:00.000Z",
  "level": "info",
  "message": "Processed telemetry for crane 123609",
  "service": "tower-dynamics-backend",
  "environment": "development"
}
```

### Console Format (colorized):
```
info: Processed telemetry for crane 123609
```

---

## 🔧 Current Logging Points

### MQTT Client (`mqttClient.js`)
- ✅ Connection status
- ✅ Message received (topic + payload)
- ✅ Company/Crane ID extraction
- ✅ Telemetry processing status
- ❌ Parse success details (not logged)
- ❌ MongoDB save confirmation (not logged)

### Parser (`parser.js`)
- ❌ Parse success (not logged)
- ✅ Parse errors only

### Routes (`routes/cranes.js`)
- ✅ HTTP requests (via `requestLogger` middleware)
- ✅ Errors with full context

---

## 💡 Recommended Improvements

### 1. Add Structured Logging for Telemetry Processing

**Current:** Only console.log for success
**Recommended:** Use Winston logger with structured data

Example improvement:
```javascript
// Instead of:
console.log(`Processed telemetry for crane ${craneId}`);

// Use:
logger.info('Telemetry processed successfully', {
  craneId,
  companyId,
  packetType: 'DM',
  statusWord: telemetryData.statusWord,
  load: telemetryData.load,
  parsed: true,
  saved: true
});
```

### 2. Add Parse Success Logging

Log when parser successfully decodes a packet:
```javascript
logger.debug('DM packet parsed', {
  craneId: telemetryData.craneId,
  format: 'DRM3400_Compact',
  statusWord: telemetryData.statusWord,
  decoded: {
    ls1: telemetryData.ls1,
    ls2: telemetryData.ls2,
    ls3: telemetryData.ls3,
    ls4: telemetryData.ls4,
    overload: telemetryData.overload,
    utilization: telemetryData.util
  }
});
```

### 3. Add MongoDB Save Confirmation

Log when telemetry is successfully saved:
```javascript
await telemetry.save();
logger.info('Telemetry saved to MongoDB', {
  craneId,
  telemetryId: telemetry._id,
  timestamp: telemetry.ts,
  load: telemetry.load
});
```

---

## 📁 Log File Locations

```
backend/
├── logs/
│   ├── error.log          # Errors only
│   ├── combined.log       # All logs
│   └── performance.log    # Performance metrics
```

---

## 🎯 Quick Reference: What Gets Logged

| Event | Console | File | Level |
|-------|---------|------|-------|
| MQTT Connected | ✅ | ✅ | info |
| Packet Received | ✅ | ❌ | console.log |
| Parse Success | ❌ | ❌ | - |
| Parse Error | ✅ | ✅ | error |
| Save Success | ❌ | ❌ | - |
| Save Error | ✅ | ✅ | error |
| HTTP Requests | ✅ | ✅ | info |
| HTTP Errors | ✅ | ✅ | error/warn |

---

## 🔍 How to View Logs

### Real-time Console:
```bash
# Just run your backend - logs appear in console
npm start
```

### View Log Files:
```bash
# All logs
tail -f logs/combined.log

# Errors only
tail -f logs/error.log

# Performance
tail -f logs/performance.log
```

### Filter Logs:
```bash
# Find telemetry processing
grep "telemetry" logs/combined.log

# Find errors for specific crane
grep "crane 123609" logs/error.log

# Find parse errors
grep "parsing error" logs/error.log
```

---

## ⚙️ Environment Variables

Control logging with:
```env
LOG_LEVEL=info          # Options: error, warn, info, debug
NODE_ENV=development     # Affects log format
```

---

## 📝 Summary

**Current State:**
- ✅ Winston logger configured
- ✅ Log files created automatically
- ✅ HTTP requests logged
- ⚠️ MQTT uses console.log (not structured)
- ⚠️ Parse/save success not logged (only errors)

**What You'll See:**
1. Console shows: MQTT messages received, processing status
2. Log files contain: Structured JSON logs for errors and HTTP requests
3. Parse errors: Logged to both console and error.log
4. Save errors: Logged to both console and error.log

**Next Steps:**
Consider upgrading MQTT client logging to use Winston logger for better structured logging and easier debugging.


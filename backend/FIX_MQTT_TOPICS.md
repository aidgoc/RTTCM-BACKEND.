# 🔧 Fix MQTT Topic Configuration

## ❌ Current Problem

Your `.env` file has **literal placeholders** instead of MQTT wildcards:

```env
# ❌ WRONG - These are literal strings, not wildcards!
TOPIC_TELEMETRY=company/{METROCON-2024}/crane/{craneId}/telemetry
```

This causes:
- Subscription to literal topic: `company/{METROCON-2024}/crane/{craneId}/telemetry`
- Extraction of literal values: `{METROCON-2024}` and `{craneId}` instead of real IDs

## ✅ Solution

### Option 1: Subscribe to ALL Companies/Cranes (Recommended)

In your `backend/.env` file, change to:

```env
# ✅ CORRECT - Use + wildcard for all companies/cranes
TOPIC_TELEMETRY=company/+/crane/+/telemetry
TOPIC_STATUS=company/+/crane/+/status
TOPIC_LOCATION=company/+/crane/+/location
TOPIC_TEST=company/+/crane/+/test
TOPIC_ALARM=company/+/crane/+/alarm
TOPIC_HEARTBEAT=company/+/crane/+/heartbeat
```

**What this does:**
- `+` = single-level wildcard (matches any value at that level)
- `company/+/crane/+/telemetry` matches:
  - `company/METROCON-2024/crane/TC-001/telemetry`
  - `company/COMPANY2/crane/TC-002/telemetry`
  - Any company, any crane

### Option 2: Subscribe to Specific Company Only

If you only want one company:

```env
# ✅ CORRECT - Specific company, all cranes
TOPIC_TELEMETRY=company/METROCON-2024/crane/+/telemetry
TOPIC_STATUS=company/METROCON-2024/crane/+/status
# ... etc
```

**What this does:**
- Only receives messages from `METROCON-2024` company
- `+` wildcard matches any crane ID

### Option 3: Legacy Format (No Company)

If you don't need company separation:

```env
# ✅ CORRECT - No company, all cranes
TOPIC_TELEMETRY=crane/+/telemetry
TOPIC_STATUS=crane/+/status
# ... etc
```

---

## 📝 Quick Fix Steps

1. **Open** `backend/.env` file
2. **Find** lines starting with `TOPIC_`
3. **Replace** `{METROCON-2024}` with `+` or `METROCON-2024` (no braces)
4. **Replace** `{craneId}` with `+` (wildcard)
5. **Save** the file
6. **Restart** your backend server

### Example Before/After:

**Before (❌ Wrong):**
```env
TOPIC_TELEMETRY=company/{METROCON-2024}/crane/{craneId}/telemetry
```

**After (✅ Correct):**
```env
TOPIC_TELEMETRY=company/+/crane/+/telemetry
```

---

## 🎯 Expected Logs After Fix

### Before Fix:
```
Subscribed to company/{METROCON-2024}/crane/{craneId}/telemetry
Received MQTT message on company/{METROCON-2024}/crane/{craneId}/telemetry: $DMabc68e1d43820087#0506
📦 Company: {METROCON-2024}, Crane: {craneId}
```

### After Fix:
```
Subscribed to company/+/crane/+/telemetry
Received MQTT message on company/METROCON-2024/crane/TC-001/telemetry: $DMabc68e1d43820087#0506
📦 Company: METROCON-2024, Crane: TC-001
Processed telemetry for crane TC-001
```

---

## 🔍 MQTT Wildcard Reference

| Wildcard | Meaning | Example |
|----------|---------|---------|
| `+` | Single-level wildcard | `company/+/crane/TC-001/telemetry` matches any company |
| `#` | Multi-level wildcard | `company/#` matches all topics under company |
| No wildcard | Exact match | `company/METROCON-2024/crane/TC-001/telemetry` matches only this exact topic |

**Important:** `+` and `#` are MQTT wildcards, not template placeholders!

---

## ✅ Verification

After fixing, you should see:
1. ✅ Topics subscribed with `+` wildcards
2. ✅ Real company IDs extracted (not `{METROCON-2024}`)
3. ✅ Real crane IDs extracted (not `{craneId}`)
4. ✅ Telemetry successfully parsed and saved










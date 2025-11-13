# Company-Based MQTT Topics Guide

## Overview

Since MQTT data packets don't contain company ID information, we use **company-based MQTT topics** to associate incoming data with the correct company. This ensures proper data isolation and access control in a multi-tenant environment.

## Topic Format Options

### Option 1: Full Format (Recommended)
```
company/{companyId}/crane/{craneId}/telemetry
company/{companyId}/crane/{craneId}/status
company/{companyId}/crane/{craneId}/location
company/{companyId}/crane/{craneId}/test
company/{companyId}/crane/{craneId}/alarm
company/{companyId}/crane/{craneId}/heartbeat
```

**Example:**
- `company/COMPANY1/crane/TC-001/telemetry`
- `company/COMPANY2/crane/TC-002/telemetry`

### Option 2: Simplified Format
```
{companyId}/crane/{craneId}/telemetry
{companyId}/crane/{craneId}/status
...
```

**Example:**
- `COMPANY1/crane/TC-001/telemetry`
- `COMPANY2/crane/TC-002/telemetry`

### Option 3: Legacy Format (No Company)
```
crane/{craneId}/telemetry
crane/{craneId}/status
...
```

**Note:** Legacy format doesn't provide company isolation. Use only if you have a single company.

## Configuration

### In `.env` file:

```bash
# Subscribe to all companies (recommended for multi-tenant)
TOPIC_TELEMETRY=company/+/crane/+/telemetry
TOPIC_STATUS=company/+/crane/+/status
TOPIC_LOCATION=company/+/crane/+/location
TOPIC_TEST=company/+/crane/+/test
TOPIC_ALARM=company/+/crane/+/alarm
TOPIC_HEARTBEAT=company/+/crane/+/heartbeat

# Or subscribe to specific company only
# TOPIC_TELEMETRY=company/COMPANY1/crane/+/telemetry
```

### Simplified format:
```bash
TOPIC_TELEMETRY=+/crane/+/telemetry
TOPIC_STATUS=+/crane/+/status
...
```

## How It Works

1. **MQTT Message Arrives**
   - Topic: `company/COMPANY1/crane/TC-001/telemetry`
   - Payload: `$DMabc68e1d43820087#0506`

2. **System Extracts:**
   - Company ID: `COMPANY1` (from topic)
   - Crane ID: `TC-001` (from topic)
   - Telemetry Data: Parsed from payload

3. **Crane Discovery:**
   - If crane exists: Updates with telemetry
   - If new crane: Creates pending entry with `companyId: "COMPANY1"`

4. **Data Storage:**
   - Telemetry stored with crane association
   - Company ID stored in pending crane entry
   - When crane is approved, company association is maintained

## Benefits

✅ **Data Isolation**: Each company's data is separated by topic  
✅ **Security**: Prevents cross-company data access  
✅ **Scalability**: Easy to add/remove companies  
✅ **Flexibility**: Can subscribe to all companies or specific ones  
✅ **Backward Compatible**: Legacy format still works  

## MQTT Broker Setup

### For Mosquitto:

1. **Create topic structure:**
   ```bash
   # Company 1 topics
   company/COMPANY1/crane/+/telemetry
   company/COMPANY1/crane/+/status
   
   # Company 2 topics
   company/COMPANY2/crane/+/telemetry
   company/COMPANY2/crane/+/status
   ```

2. **Access Control (ACL):**
   ```bash
   # In mosquitto.conf or acl file
   # Company 1 can only publish to their topics
   user company1_user
   topic write company/COMPANY1/crane/+/#
   topic read company/COMPANY1/crane/+/#
   
   # Company 2 can only publish to their topics
   user company2_user
   topic write company/COMPANY2/crane/+/#
   topic read company/COMPANY2/crane/+/#
   ```

## Device Configuration

When configuring your DRM3400 devices, set the MQTT topic to include the company ID:

```
Topic: company/{YOUR_COMPANY_ID}/crane/{DEVICE_ID}/telemetry
```

**Example:**
- Company ID: `COMPANY1`
- Device ID: `abc` (from packet: `$DMabc...`)
- Topic: `company/COMPANY1/crane/DM-abc/telemetry`

## Testing

### Test with MQTT Client:

```bash
# Publish test message for Company 1
mosquitto_pub -h localhost -t "company/COMPANY1/crane/TC-001/telemetry" \
  -m "$DMabc68e1d43820087#0506"

# Publish test message for Company 2
mosquitto_pub -h localhost -t "company/COMPANY2/crane/TC-002/telemetry" \
  -m "$DMdef68e1d43820087#0506"
```

### Verify in Backend Logs:

You should see:
```
📦 Company: COMPANY1, Crane: TC-001
Received MQTT message on company/COMPANY1/crane/TC-001/telemetry: $DMabc68e1d43820087#0506
```

## Migration from Legacy Format

If you're currently using `crane/+/telemetry`:

1. **Update `.env`** to use company-based topics
2. **Update device configurations** to publish to new topics
3. **System automatically handles both formats** during transition

## Troubleshooting

### Issue: Company ID not extracted
- **Check:** Topic format matches one of the supported patterns
- **Solution:** Verify topic structure in MQTT broker logs

### Issue: Crane not associated with company
- **Check:** Company ID is in the topic path
- **Solution:** Ensure topic follows format: `company/{companyId}/crane/{craneId}/...`

### Issue: Legacy format still needed
- **Solution:** System supports both formats. Legacy format works but doesn't provide company isolation.

## Best Practices

1. ✅ Use company-based topics for all new deployments
2. ✅ Use consistent company ID format (uppercase recommended)
3. ✅ Set up MQTT ACLs to prevent cross-company access
4. ✅ Monitor topic structure in logs
5. ✅ Document company ID mapping for your organization












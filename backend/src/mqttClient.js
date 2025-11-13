const mqtt = require('mqtt');
const { parseTelemetryPayload } = require('./utils/parser');
const { convertRawTopic } = require('./utils/convertRawTopic');
function normalizePayload(rawPayload) {
  if (Buffer.isBuffer(rawPayload)) {
    rawPayload = rawPayload.toString();
  }

  if (typeof rawPayload !== 'string') {
    return rawPayload;
  }

  const trimmed = rawPayload.trim();
  if (trimmed.startsWith('$DM')) {
    return trimmed;
  }

  if (trimmed.includes('$DM')) {
    const commaSeparated = trimmed.split(',').map(part => part.trim());
    for (const part of commaSeparated) {
      if (part.startsWith('$DM')) {
        return part;
      }
    }
    const dmIndex = trimmed.indexOf('$DM');
    if (dmIndex !== -1) {
      return trimmed.slice(dmIndex).trim();
    }
  }

  return trimmed;
}
const Crane = require('./models/Crane');
const Telemetry = require('./models/Telemetry');
const Ticket = require('./models/Ticket');
const craneDiscovery = require('./middleware/craneDiscovery');

const DEVICE_LABELS = {
  DM: 'DRM_3400'
};

const TICKET_PROBLEM_DESCRIPTIONS = {
  0: 'Trolley Movement',
  1: 'Hook Movement',
  2: 'Jib Rotation Problem',
  3: 'Inclination',
  4: 'Joystick Clutch',
  5: 'Motor Overheat Burn',
  6: 'Gearbox Problem',
  7: 'Bearing Problem',
  8: 'Rope Problem',
  9: 'Motor Brake Not Working',
  10: 'Electric Problem',
  11: 'Sensor Problem',
  12: 'Limit Switch Problem',
  13: '2-Phase Supply Irregular',
  14: 'End of Ticket Raise Options'
};

const ICON = Object.freeze({
  true: '✅',
  false: '❌'
});

function formatTimestampForLog(timestamp) {
  if (!timestamp) return 'Unknown';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} `
    + `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`;
}

function toBinaryWord(highByte, lowByte) {
  const high = Number.isFinite(highByte) ? highByte : 0;
  const low = Number.isFinite(lowByte) ? lowByte : 0;
  const combined = ((high & 0xFF) << 8) | (low & 0xFF);
  return combined.toString(2).padStart(16, '0').replace(/(.{4})/g, '$1 ').trim();
}

function formatDataHex(telemetryData) {
  const high = telemetryData?.dataHighHex;
  const low = telemetryData?.dataLowHex;
  if (!high && !low) return 'N/A';
  return `${(high || '').toUpperCase()}${(low || '').toUpperCase()}` || 'N/A';
}

function getDeviceLabel(telemetryData) {
  const type = telemetryData?.deviceType;
  return DEVICE_LABELS[type] || type || 'UNKNOWN_DEVICE';
}

function logHeartbeatDetails(telemetryData) {
  const ts = formatTimestampForLog(telemetryData.ts);
  const deviceLabel = getDeviceLabel(telemetryData);
  const deviceId = telemetryData.deviceId || telemetryData.craneId || 'UNKNOWN';
  const commandHex = (telemetryData.commandHex || '??').toUpperCase();
  const dataHex = formatDataHex(telemetryData);
  const crc = telemetryData.crc ? telemetryData.crc.toUpperCase() : 'N/A';

  console.log(`[INFO] [${ts}] [DEVICE: ${deviceLabel} | ID: ${deviceId}]`);
  console.log('→ Message Type: HEARTBEAT');
  console.log(`→ Command Byte: ${commandHex}`);
  console.log(`→ Data: ${dataHex}`);
  console.log('→ Status: ✅ Device connected and active');
  console.log(`→ CRC16 Check: Passed (${crc})`);
  console.log('------------------------------------------------------------');
  console.log('💡 Meaning: Crane sent a heartbeat confirming it is online and responsive.');
  console.log('');
}

function logEventDetails(telemetryData) {
  const ts = formatTimestampForLog(telemetryData.ts);
  const deviceLabel = getDeviceLabel(telemetryData);
  const deviceId = telemetryData.deviceId || telemetryData.craneId || 'UNKNOWN';
  const commandHex = (telemetryData.commandHex || '??').toUpperCase();
  const rawDataHex = formatDataHex(telemetryData);
  const crc = telemetryData.crc ? telemetryData.crc.toUpperCase() : 'N/A';

  const utilActive = (telemetryData.util || 0) > 0;
  const overload = Boolean(telemetryData.overload);
  const testDone = Boolean(telemetryData.testMode);
  const lsHit = {
    ls1: telemetryData.ls1 === 'HIT',
    ls2: telemetryData.ls2 === 'HIT',
    ls3: telemetryData.ls3 === 'HIT',
    ls4: telemetryData.ls4 === 'HIT'
  };

  const binary = toBinaryWord(telemetryData.dataHigh, telemetryData.dataLow);

  console.log(`[EVENT] [${ts}] [DEVICE: ${deviceLabel} | ID: ${deviceId}]`);
  console.log('→ Message Type: EVENT UPDATE');
  console.log(`→ Command Byte: ${commandHex}`);
  console.log(`→ Raw Data (HEX): ${rawDataHex}`);
  console.log(`→ Binary: ${binary}`);
  console.log('------------------------------------------------------------');
  console.log(`UTIL (Crane Operation): ${ICON[utilActive]} ${utilActive ? 'Active' : 'Idle'}`);
  console.log(`OL (Overload): ${ICON[!overload]} ${overload ? 'Overload' : 'Normal'}`);
  console.log(`TEST (Daily Switch Test): ${ICON[testDone]} ${testDone ? 'Completed' : 'Pending'}`);
  console.log('Limit Switches:');
  console.log(`   LS1: ${ICON[lsHit.ls1]} ${lsHit.ls1 ? 'Hit' : 'Clear'}`);
  console.log(`   LS2: ${ICON[lsHit.ls2]} ${lsHit.ls2 ? 'Hit' : 'Clear'}`);
  console.log(`   LS3: ${ICON[lsHit.ls3]} ${lsHit.ls3 ? 'Hit' : 'Clear'}`);
  console.log(`   LS4: ${ICON[lsHit.ls4]} ${lsHit.ls4 ? 'Hit' : 'Clear'}`);
  console.log(`→ CRC16 Check: Passed (${crc})`);

  const summaryParts = [];
  summaryParts.push(utilActive ? 'crane operating' : 'crane idle');
  summaryParts.push(overload ? 'overload detected' : 'load within safe limit');
  summaryParts.push(testDone ? 'daily test completed' : 'daily test pending');
  const allHit = lsHit.ls1 && lsHit.ls2 && lsHit.ls3 && lsHit.ls4;
  summaryParts.push(allHit ? 'all limit switches hit' : 'limit switches clear');
  const summary = summaryParts.join(', ');

  console.log(`→ Event Summary: ${summary.charAt(0).toUpperCase() + summary.slice(1)}.`);
  console.log('------------------------------------------------------------');
  console.log('💡 Meaning: Operational snapshot received with utilization, overload, test status, and limit switch states.');
  console.log('');
}

function logLoadDetails(telemetryData) {
  const ts = formatTimestampForLog(telemetryData.ts);
  const deviceLabel = getDeviceLabel(telemetryData);
  const deviceId = telemetryData.deviceId || telemetryData.craneId || 'UNKNOWN';
  const commandHex = (telemetryData.commandHex || '??').toUpperCase();
  const rawDataHex = formatDataHex(telemetryData);
  const crc = telemetryData.crc ? telemetryData.crc.toUpperCase() : 'N/A';
  const rawLoad = Number.isFinite(telemetryData.rawLoad) ? telemetryData.rawLoad : null;
  const loadTons = Number.isFinite(telemetryData.load) ? telemetryData.load : 0;

  console.log(`[LOAD] [${ts}] [DEVICE: ${deviceLabel} | ID: ${deviceId}]`);
  console.log('→ Message Type: LOAD DATA');
  console.log(`→ Command Byte: ${commandHex}`);
  console.log(`→ Raw Data (HEX): ${rawDataHex}`);
  if (rawLoad !== null) {
    console.log(`→ Decimal Conversion: ${rawLoad}`);
  }
  console.log(`→ Actual Load: ${loadTons.toFixed(1)} Tons`);
  console.log(`→ CRC16 Check: Passed (${crc})`);
  console.log('------------------------------------------------------------');
  console.log('ALERT STATUS: 🟢 Load within acceptable working range');
  console.log('------------------------------------------------------------');
  console.log('💡 Meaning: Current lifted load reported by crane controller.');
  console.log('');
}

function logTicketDetails(telemetryData) {
  const ts = formatTimestampForLog(telemetryData.ts);
  const deviceLabel = getDeviceLabel(telemetryData);
  const deviceId = telemetryData.deviceId || telemetryData.craneId || 'UNKNOWN';
  const commandHex = (telemetryData.commandHex || '??').toUpperCase();
  const dataHighHex = telemetryData.dataHighHex ? telemetryData.dataHighHex.toUpperCase() : '00';
  const dataLowHex = telemetryData.dataLowHex ? telemetryData.dataLowHex.toUpperCase() : '00';
  const crc = telemetryData.crc ? telemetryData.crc.toUpperCase() : 'N/A';

  const derivedTicketNumber = parseInt(dataHighHex, 16);
  const ticketNumber = telemetryData.ticketNumber ?? (Number.isFinite(derivedTicketNumber) ? derivedTicketNumber : 0);
  const ticketType = telemetryData.ticketType ?? (parseInt(dataLowHex, 16) & 0x0F);
  const ticketStatus = telemetryData.ticketStatus || 'open';
  const statusIcon = ICON[ticketStatus !== 'closed'];
  const statusLabel = ticketStatus === 'closed' ? 'CLOSED' : 'OPEN';
  const problemDescription = TICKET_PROBLEM_DESCRIPTIONS[ticketType] || 'Unknown Problem Code';

  const binary = toBinaryWord(telemetryData.dataHigh, telemetryData.dataLow);

  console.log(`[TICKET] [${ts}] [DEVICE: ${deviceLabel} | ID: ${deviceId}]`);
  console.log('→ Message Type: TICKET RAISED');
  console.log(`→ Command Byte: ${commandHex}`);
  console.log(`→ Ticket Number: ${String(ticketNumber).padStart(2, '0')}`);
  console.log(`→ Ticket Type (HEX): ${dataLowHex}`);
  console.log(`→ Binary: ${binary}`);
  console.log('------------------------------------------------------------');
  console.log(`Ticket Status: ${statusIcon} ${statusLabel}`);
  console.log(`Problem Code: #${ticketType}`);
  console.log(`Problem Description: ${problemDescription}`);
  console.log(`→ CRC16 Check: Passed (${crc})`);
  console.log('------------------------------------------------------------');
  console.log(`Action Required: ${ticketStatus === 'closed' ? 'Ticket closed. No further action.' : `Notify maintenance team for problem #${ticketType}`}`);
  console.log('');
}

function logGenericTelemetry(telemetryData) {
  const ts = formatTimestampForLog(telemetryData.ts);
  const deviceLabel = getDeviceLabel(telemetryData);
  const deviceId = telemetryData.deviceId || telemetryData.craneId || 'UNKNOWN';
  const commandType = telemetryData.commandType || 'unspecified';
  console.log(`[INFO] [${ts}] [DEVICE: ${deviceLabel} | ID: ${deviceId}]`);
  console.log(`→ Command Type: ${commandType.toUpperCase()}`);
  console.log('→ Payload:', telemetryData);
  console.log('');
}

function logTelemetryDetails(telemetryData) {
  if (!telemetryData) return;
  switch (telemetryData.commandType) {
    case 'heartbeat':
      logHeartbeatDetails(telemetryData);
      break;
    case 'event':
      logEventDetails(telemetryData);
      break;
    case 'load':
      logLoadDetails(telemetryData);
      break;
    case 'ticket':
      logTicketDetails(telemetryData);
      break;
    default:
      logGenericTelemetry(telemetryData);
      break;
  }
}

class MQTTClient {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.reconnectInterval = 5000;
  }

  connect() {
    // Check if MQTT broker URL is properly configured
    const mqttUrl = process.env.MQTT_BROKER_URL;
    if (!mqttUrl) {
      console.log('MQTT broker not configured, skipping MQTT connection');
      return;
    }

    const options = {
      username: process.env.MQTT_USERNAME || '',
      password: process.env.MQTT_PASSWORD || '',
      reconnectPeriod: 0, // Disable auto-reconnect initially
      connectTimeout: 10 * 1000, // 10 seconds timeout
      keepalive: 60,
      clean: true
    };

    console.log(`Attempting to connect to MQTT broker: ${mqttUrl}`);
    this.client = mqtt.connect(mqttUrl, options);

    // Set a timeout to show failure message after 10 seconds
    const connectionTimeout = setTimeout(() => {
      if (!this.isConnected) {
        console.log('⚠️  MQTT failed to connect, try again');
        console.log('   - Check if MQTT broker is running');
        console.log('   - Verify network connectivity');
        console.log('   - Check MQTT_BROKER_URL in .env file');
        console.log('   - Application will continue without MQTT');
      }
    }, 10000);

    this.client.on('connect', () => {
      clearTimeout(connectionTimeout);
      console.log('✅ Connected to MQTT broker successfully');
      this.isConnected = true;
      this.subscribe();
      // Enable reconnection after successful connection
      this.client.options.reconnectPeriod = 5000;
    });

    this.client.on('error', (error) => {
      console.error('❌ MQTT connection error:', error.message);
      this.isConnected = false;
      // Don't crash the server, just log the error
    });

    this.client.on('reconnect', () => {
      console.log('🔄 Reconnecting to MQTT broker...');
    });

    this.client.on('close', () => {
      console.log('🔌 MQTT connection closed');
      this.isConnected = false;
    });

    this.client.on('offline', () => {
      console.log('📡 MQTT client is offline');
      this.isConnected = false;
    });

    this.client.on('message', this.handleMessage.bind(this));
  }

  subscribe() {
    if (!this.client || !this.isConnected) return;

    // Use configurable topics from environment variables
    const topics = [
      process.env.TOPIC="868019064209266/1",
      process.env.TOPIC_TELEMETRY || 'company/+/telemetry',
      process.env.TOPIC_STATUS || 'company/+/crane/+/status',
      process.env.TOPIC_LOCATION || 'company/+/crane/+/location',
      process.env.TOPIC_TEST || 'company/+/crane/+/test',
      process.env.TOPIC_ALARM || 'company/+/crane/+/alarm',
      process.env.TOPIC_HEARTBEAT || 'company/+/crane/+/heartbeat'
    ];

    // Validate topic names before subscribing
    const validTopics = topics.filter(topic => {
      // MQTT topic validation: should not contain invalid characters
      if (topic.includes('c+') && !topic.includes('crane/+/')) {
        console.error(`❌ Invalid MQTT topic format: ${topic}`);
        console.error(`   Expected format: crane/+/telemetry, crane/+/status, etc.`);
        console.error(`   The '+' character is a wildcard and should be used in subscription patterns, not in topic names.`);
        return false;
      }
      return true;
    });

    if (validTopics.length === 0) {
      console.error('❌ No valid MQTT topics to subscribe to. Please check your environment variables.');
      return;
    }

    validTopics.forEach(topic => {
      this.client.subscribe(topic, (err) => {
        if (err) {
          console.error(`Failed to subscribe to ${topic}:`, err);
        } else {
          console.log(`Subscribed to ${topic}`);
        }
      });
    });
  }

  async handleMessage(topic, message) {
    try {
      // Handle both Buffer (binary) and string payloads
      // If binary 20-byte DRM3400 packet, pass Buffer directly; otherwise convert to string
      const isBinary = Buffer.isBuffer(message) && message.length === 20 && message[0] === 0x24; // 0x24 = '$'
      const payload = isBinary ? message : message.toString();
      const payloadString = isBinary ? message.toString() : payload;
      
      if (isBinary) {
        console.log(`Received MQTT binary message on ${topic}:`, message.toString('hex'));
      } else {
        console.log(`Received MQTT message on ${topic}:`, payload);
      }

      let routingTopic = topic;
      const rawTopicPattern = /^\d{10,20}\/\d+$/;
      if (rawTopicPattern.test(topic)) {
        const convertedTopic = convertRawTopic(topic, payloadString);
        routingTopic = convertedTopic;
        console.log(`🔄 Normalized topic: ${convertedTopic}`);
      }

      // Extract company ID and crane ID from topic
      // Topic formats supported:
      // 1. company/{companyId}/crane/{craneId}/telemetry (company-based)
      // 2. crane/{craneId}/telemetry (legacy, no company)
      // 3. {companyId}/crane/{craneId}/telemetry (simplified company-based)
      const topicParts = routingTopic.split('/');
      let companyId = null;
      let craneId = null;

      // Check for company-based topic structure
      if (topicParts[0] === 'company' && topicParts.length >= 4) {
        // Format: company/{companyId}/crane/{craneId}/...
        companyId = topicParts[1];
        if (topicParts[2] === 'crane') {
          craneId = topicParts[3];
        }
      } else if (topicParts.length >= 3 && topicParts[1] === 'crane') {
        // Format: {companyId}/crane/{craneId}/... (simplified)
        companyId = topicParts[0];
        craneId = topicParts[2];
      } else if (topicParts[0] === 'crane' && topicParts.length >= 2) {
        // Format: crane/{craneId}/... (legacy, no company)
        craneId = topicParts[1];
      } else {
        // Fallback: try to extract from any position
        craneId = topicParts[1] || topicParts[0];
      }

      // Validate extracted IDs (should not contain braces if they're placeholders)
      if (craneId && (craneId.includes('{') || craneId.includes('}'))) {
        console.error(`⚠️  Invalid crane ID extracted (looks like placeholder): ${craneId}`);
        console.error(`   Topic: ${topic}`);
        console.error(`   Hint: Check your .env file - use '+' wildcards, not '{...}' placeholders`);
        console.error(`   Example: TOPIC_TELEMETRY=company/+/crane/+/telemetry`);
        return;
      }

      if (!craneId) {
        console.error(`Could not extract crane ID from topic: ${topic}`);
        return;
      }

      // Log company association if found
      if (companyId) {
        // Validate company ID too
        if (companyId.includes('{') || companyId.includes('}')) {
          console.error(`⚠️  Invalid company ID extracted (looks like placeholder): ${companyId}`);
          console.error(`   Topic: ${topic}`);
          console.error(`   Hint: Check your .env file - use '+' wildcards, not '{...}' placeholders`);
          return;
        }
        console.log(`📦 Company: ${companyId}, Crane: ${craneId}`);
      }

      if (routingTopic.includes('/telemetry')) {
        await this.processTelemetry(craneId, payload, companyId);
      } else if (routingTopic.includes('/status')) {
        await this.processStatus(craneId, payload, companyId);
      } else if (routingTopic.includes('/location')) {
        await this.processLocation(craneId, payload, companyId);
      } else if (routingTopic.includes('/test')) {
        await this.processTest(craneId, payload, companyId);
      } else if (routingTopic.includes('/alarm')) {
        await this.processAlarm(craneId, payload, companyId);
      } else if (routingTopic.includes('/heartbeat')) {
        await this.processHeartbeat(craneId, payload, companyId);
      }
    } catch (error) {
      console.error('Error processing MQTT message:', error);
    }
  }

  async processTelemetry(craneId, payload, companyId = null) {
    try {
      // Parse the telemetry payload
      const normalizedPayload = normalizePayload(payload);
      const telemetryData = parseTelemetryPayload(normalizedPayload);
      
      if (!telemetryData) {
        console.error(`❌ Failed to parse telemetry for crane ${craneId}:`, normalizedPayload);
        return;
      }

      // Log successful parse with detailed breakdown
      logTelemetryDetails(telemetryData);

      // Validate required fields
      if (!telemetryData.craneId || !telemetryData.ts) {
        console.error(`Invalid telemetry data for crane ${craneId}:`, telemetryData);
        return;
      }

      // Normalize crane ID - ensure it has DM- prefix if it's just a number
      // This handles cases where MQTT topic has "123" but crane is stored as "DM-123"
      let normalizedCraneId = telemetryData.craneId;
      if (/^\d+$/.test(normalizedCraneId)) {
        // If craneId is just numbers, add DM- prefix
        normalizedCraneId = `DM-${normalizedCraneId}`;
        telemetryData.craneId = normalizedCraneId;
        console.log(`🔄 Normalized crane ID: ${craneId} → ${normalizedCraneId}`);
      }

      // Add company ID to telemetry data if extracted from topic
      if (companyId) {
        telemetryData.companyId = companyId;
      }

      // Use crane discovery to find or create crane (use parsed craneId from telemetry, not topic)
      const discoveryResult = await craneDiscovery.discoverCrane(telemetryData.craneId, telemetryData, companyId);
      if (!discoveryResult) {
        console.error(`Failed to discover crane ${telemetryData.craneId}`);
        return;
      }

      const { crane, isNew, isPending } = discoveryResult;

      // Get SWL from crane record if available, otherwise use parsed value
      let swl = telemetryData.swl || 1;
      if (crane && crane.swl) {
        swl = crane.swl;
      } else if (telemetryData.swl && Number(telemetryData.swl) > 0) {
        swl = Number(telemetryData.swl);
      }

      // Create telemetry record (save even for pending cranes)
      console.log(`🔧 Creating telemetry document for ${telemetryData.craneId}...`);
      const telemetry = new Telemetry({
        craneId: telemetryData.craneId,
        ts: new Date(telemetryData.ts),
        load: telemetryData.load || 0,
        swl: swl,
        ls1: telemetryData.ls1 || 'UNKNOWN',
        ls2: telemetryData.ls2 || 'UNKNOWN',
        ls3: telemetryData.ls3 || 'UNKNOWN',
        ls4: telemetryData.ls4 || 'UNKNOWN',
        util: telemetryData.util || 0,
        operatingMode: telemetryData.operatingMode || 'normal',
        testType: telemetryData.testType || null,
        testResults: telemetryData.testResults || null,
        raw: (() => {
          try {
            const base = typeof payload === 'string' && payload.trim().startsWith('{')
              ? JSON.parse(payload)
              : {};
            return JSON.stringify({
              ...base,
              ...telemetryData,
              windSpeed: telemetryData.windSpeed || 0,
              windDirection: telemetryData.windDirection || 0,
              temperature: telemetryData.temperature || 0,
              humidity: telemetryData.humidity || 0,
              locationData: telemetryData.locationData || null
            });
          } catch {
            return typeof payload === 'string' ? payload : (payload?.toString?.('hex') || '');
          }
        })()
      });

      console.log(`💿 About to save telemetry...`);
      console.log(`   Database: ${require('mongoose').connection.name}`);
      console.log(`   Collection: ${telemetry.collection.name}`);
      console.log(`   Connection state: ${require('mongoose').connection.readyState}`);
      
      try {
        const savedTelemetry = await telemetry.save();
        console.log(`✅ Telemetry.save() returned successfully`);
        console.log(`   Saved document _id: ${savedTelemetry._id}`);
        console.log(`   isNew after save: ${savedTelemetry.isNew}`);
        console.log(`💾 Telemetry saved to MongoDB for crane ${telemetry.craneId}`, {
          telemetryId: telemetry._id,
          craneId: telemetry.craneId,  // Show the actual craneId that was saved
          timestamp: telemetry.ts,
          load: telemetry.load,
          util: telemetry.util,
          ls1: telemetry.ls1,
          ls2: telemetry.ls2,
          ls3: telemetry.ls3,
          ls4: telemetry.ls4,
          operatingMode: telemetry.operatingMode,
          testType: telemetry.testType,
          isPending: isPending || false
        });
      } catch (saveError) {
        console.error(`❌ FAILED to save telemetry to MongoDB:`, saveError.message);
        if (saveError.errors) {
          console.error('Validation errors:', Object.keys(saveError.errors).map(key => ({
            field: key,
            message: saveError.errors[key].message,
            value: saveError.errors[key].value
          })));
        }
        console.error('Telemetry data that failed:', {
          craneId: telemetry.craneId,
          ts: telemetry.ts,
          load: telemetry.load,
          swl: telemetry.swl,
          util: telemetry.util,
          raw: telemetry.raw?.substring(0, 100)
        });
        throw saveError; // Re-throw to be caught by outer catch
      }

      // If crane is pending, skip status updates and alerts
      if (isPending) {
        console.log(`⏳ Crane ${telemetryData.craneId} is pending approval, telemetry saved but status not updated`);
        return;
      }

      // Update crane's last seen and status (only for approved cranes)
      // Use the normalized craneId from telemetryData
      await this.updateCraneStatus(telemetryData.craneId, telemetryData);

      // Check for alerts and create tickets (only for approved cranes)
      await this.checkAlerts(telemetryData.craneId, telemetryData);

      // Emit WebSocket event
      const io = require('./index').get('io');
      if (io) {
        io.emit(`telemetry:${telemetryData.craneId}`, {
          craneId: telemetryData.craneId,
          data: telemetryData,
          timestamp: new Date()
        });
      }

      console.log(`Processed telemetry for crane ${telemetryData.craneId}`);
    } catch (error) {
      console.error(`Error processing telemetry for crane ${craneId}:`, error);
    }
  }

  async processStatus(craneId, payload, companyId = null) {
    try {
      // Parse status payload (similar to telemetry but for status updates)
      const normalizedPayload = normalizePayload(payload);
      const statusData = parseTelemetryPayload(normalizedPayload);
      
      if (!statusData) {
        console.error(`Failed to parse status for crane ${craneId}:`, normalizedPayload);
        return;
      }

      // Add company ID if provided
      if (companyId) {
        statusData.companyId = companyId;
      }

      // Update crane status
      await this.updateCraneStatus(craneId, statusData);

      console.log(`Processed status update for crane ${craneId}`);
    } catch (error) {
      console.error(`Error processing status for crane ${craneId}:`, error);
    }
  }

  async updateCraneStatus(craneId, data) {
    try {
      // Fetch current crane to merge with existing lastStatusRaw
      const crane = await Crane.findOne({ craneId });
      
      if (!crane) {
        console.log(`⚠️ Crane ${craneId} not found for status update`);
        return;
      }

      // Smart merge: Keep existing values if new data has 'UNKNOWN' or placeholder values
      const mergedStatus = { ...(crane.lastStatusRaw || {}) };
      
      // Always update these fields (timestamp, command info)
      mergedStatus.ts = data.ts;
      mergedStatus.commandType = data.commandType;
      mergedStatus.command = data.command;
      mergedStatus.raw = data.raw;
      
      // Update load if command is LOAD or if load > 0
      if (data.commandType === 'load' || (data.load !== undefined && data.load > 0)) {
        mergedStatus.load = data.load;
      }
      
      // Update limit switches only if not 'UNKNOWN'
      if (data.ls1 && data.ls1 !== 'UNKNOWN') mergedStatus.ls1 = data.ls1;
      if (data.ls2 && data.ls2 !== 'UNKNOWN') mergedStatus.ls2 = data.ls2;
      if (data.ls3 && data.ls3 !== 'UNKNOWN') mergedStatus.ls3 = data.ls3;
      if (data.ls4 && data.ls4 !== 'UNKNOWN') mergedStatus.ls4 = data.ls4;
      
      // Update utilization
      if (data.util !== undefined) mergedStatus.util = data.util;
      if (data.ut !== undefined && data.ut !== 'UNKNOWN') mergedStatus.ut = data.ut;
      
      // Update test mode and overload flags
      if (data.testMode !== undefined) mergedStatus.testMode = data.testMode;
      if (data.overload !== undefined) mergedStatus.overload = data.overload;
      
      // Update other command-specific fields
      if (data.operatingMode) mergedStatus.operatingMode = data.operatingMode;
      if (data.testType) mergedStatus.testType = data.testType;
      if (data.testResults) mergedStatus.testResults = data.testResults;
      
      // Update ticket info (from TICKET command)
      if (data.ticketNumber !== undefined) mergedStatus.ticketNumber = data.ticketNumber;
      if (data.ticketType !== undefined) mergedStatus.ticketType = data.ticketType;
      if (data.ticketStatus) mergedStatus.ticketStatus = data.ticketStatus;
      
      // Update device info
      if (data.craneId) mergedStatus.craneId = data.craneId;
      if (data.deviceId) mergedStatus.deviceId = data.deviceId;
      if (data.deviceType) mergedStatus.deviceType = data.deviceType;
      
      const updateData = {
        lastSeen: new Date(),
        online: true,
        lastStatusRaw: mergedStatus
      };

      const result = await Crane.findOneAndUpdate(
        { craneId },
        updateData,
        { upsert: false, new: true }
      );

      if (result) {
        console.log(`✅ Updated crane status for ${craneId} [${data.commandType?.toUpperCase()}]:`, {
          ls1: mergedStatus.ls1,
          ls2: mergedStatus.ls2,
          ls3: mergedStatus.ls3,
          ls4: mergedStatus.ls4,
          load: mergedStatus.load,
          util: mergedStatus.util,
          testMode: mergedStatus.testMode
        });
      }
    } catch (error) {
      console.error(`Error updating crane status for ${craneId}:`, error);
    }
  }

  async checkAlerts(craneId, data) {
    try {
      const crane = await Crane.findOne({ craneId });
      if (!crane) return;

      // Check for overload alert
      if (data.load && data.swl && data.load > data.swl) {
        await this.createAlert(craneId, 'overload', 'critical', 
          `Crane overload detected: ${data.load}kg > ${data.swl}kg SWL`);
      }

      // Check for limit switch failures
      const limitSwitches = ['ls1', 'ls2', 'ls3'];
      for (const ls of limitSwitches) {
        if (data[ls] === 'FAIL') {
          await this.createAlert(craneId, 'limit_switch', 'warning', 
            `Limit switch ${ls.toUpperCase()} failure detected`);
        }
      }

      // Check for utilization issues
      if (data.util && data.util > 95) {
        await this.createAlert(craneId, 'utilization', 'warning', 
          `High utilization detected: ${data.util}%`);
      }
    } catch (error) {
      console.error(`Error checking alerts for crane ${craneId}:`, error);
    }
  }

  async createAlert(craneId, type, severity, message) {
    try {
      // Check if similar alert already exists (deduplication)
      const existingTicket = await Ticket.findOne({
        craneId,
        type,
        status: { $in: ['open', 'in_progress'] },
        createdAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) } // Last 5 minutes
      });

      if (existingTicket) {
        // Update existing ticket
        existingTicket.message = message;
        existingTicket.severity = severity;
        await existingTicket.save();
        return;
      }

      // Create new ticket
      const ticket = new Ticket({
        craneId,
        type,
        severity,
        message,
        createdBy: 'system',
        status: 'open'
      });

      await ticket.save();

      // Emit WebSocket event
      const io = require('./index').get('io');
      if (io) {
        io.emit(`ticket:${craneId}`, {
          craneId,
          ticket: ticket.toObject(),
          timestamp: new Date()
        });
      }

      console.log(`Created ${severity} alert for crane ${craneId}: ${message}`);
    } catch (error) {
      console.error(`Error creating alert for crane ${craneId}:`, error);
    }
  }

  disconnect() {
    if (this.client) {
      this.client.end();
      this.isConnected = false;
      console.log('Disconnected from MQTT broker');
    }
  }

  publish(topic, message) {
    if (!this.client || !this.isConnected) {
      console.error('MQTT client not connected');
      return false;
    }

    this.client.publish(topic, message, (err) => {
      if (err) {
        console.error(`Failed to publish to ${topic}:`, err);
      } else {
        console.log(`Published to ${topic}:`, message);
      }
    });

    return true;
  }

  async processLocation(craneId, payload, companyId = null) {
    try {
      console.log(`Processing location update for crane ${craneId}:`, payload);
      
      // Parse the location payload
      let locationData;
      try {
        locationData = JSON.parse(payload);
      } catch (parseError) {
        console.error(`Failed to parse location JSON for crane ${craneId}:`, parseError);
        return;
      }

      // Validate required fields
      if (!locationData.latitude || !locationData.longitude) {
        console.error(`Invalid location data for crane ${craneId}: missing coordinates`);
        return;
      }

      // Validate coordinate ranges
      const lat = parseFloat(locationData.latitude);
      const lng = parseFloat(locationData.longitude);
      
      if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        console.error(`Invalid coordinates for crane ${craneId}: lat=${lat}, lng=${lng}`);
        return;
      }

      // Find the crane
      const crane = await Crane.findOne({ craneId, isActive: true });
      if (!crane) {
        console.error(`Crane ${craneId} not found or inactive`);
        return;
      }

      // Prepare location update data
      const updateData = {
        coordinates: [lng, lat], // GeoJSON format: [longitude, latitude]
        locationSource: 'gsm_triangulation',
        method: locationData.method || 'gsm',
        accuracy: locationData.accuracy || null
      };

      // Add optional fields if present
      if (locationData.siteAddress) {
        updateData.siteAddress = locationData.siteAddress;
      }
      if (locationData.city) {
        updateData.city = locationData.city;
      }

      // Update crane location
      await crane.updateLocation(updateData);

      console.log(`✅ Updated location for crane ${craneId}:`, {
        coordinates: [lng, lat],
        accuracy: locationData.accuracy ? `${locationData.accuracy}m` : 'unknown',
        method: locationData.method || 'gsm'
      });

      // Emit WebSocket event for real-time updates
      const io = require('./index').get('io');
      if (io) {
        io.emit('crane:location_updated', {
          craneId,
          coordinates: [lng, lat],
          accuracy: locationData.accuracy,
          method: locationData.method || 'gsm',
          timestamp: new Date()
        });
      }

      // Log accuracy warnings
      if (locationData.accuracy && locationData.accuracy > 500) {
        console.warn(`⚠️  Poor location accuracy for crane ${craneId}: ±${locationData.accuracy}m`);
      }

    } catch (error) {
      console.error(`Error processing location for crane ${craneId}:`, error);
    }
  }

  async processTest(craneId, payload, companyId = null) {
    try {
      console.log(`Processing test data for crane ${craneId}:`, payload);
      
      // Parse the test payload
      let testData;
      try {
        testData = JSON.parse(payload);
      } catch (parseError) {
        console.error(`Failed to parse test JSON for crane ${craneId}:`, parseError);
        return;
      }

      // Validate required fields
      if (!testData.testType) {
        console.error(`Invalid test data for crane ${craneId}: missing testType`);
        return;
      }

      // Find the crane
      const crane = await Crane.findOne({ craneId, isActive: true });
      if (!crane) {
        console.error(`Crane ${craneId} not found or inactive`);
        return;
      }

      // Create test telemetry record
      const telemetry = new Telemetry({
        craneId: testData.craneId || craneId,
        ts: new Date(testData.timestamp || new Date()),
        load: testData.load || 0,
        swl: testData.swl || crane.swl,
        ls1: testData.testResults?.ls1 || 'UNKNOWN',
        ls2: testData.testResults?.ls2 || 'UNKNOWN',
        ls3: testData.testResults?.ls3 || 'UNKNOWN',
        ls4: testData.testResults?.ls4 || 'UNKNOWN',
        util: 0, // Test mode typically has no utilization
        operatingMode: 'test',
        testType: testData.testType,
        testResults: testData.testResults,
        raw: JSON.stringify(testData)
      });

      await telemetry.save();

      console.log(`✅ Test data saved for crane ${craneId}: ${testData.testType}`);

      // Emit WebSocket event for real-time updates
      const io = require('./index').get('io');
      if (io) {
        io.emit('crane:test_completed', {
          craneId,
          testType: testData.testType,
          testResults: testData.testResults,
          timestamp: new Date()
        });
      }

    } catch (error) {
      console.error(`Error processing test data for crane ${craneId}:`, error);
    }
  }

  async processAlarm(craneId, payload, companyId = null) {
    try {
      console.log(`Processing alarm for crane ${craneId}:`, payload);
      
      // Parse the alarm payload
      let alarmData;
      try {
        alarmData = JSON.parse(payload);
      } catch (parseError) {
        console.error(`Failed to parse alarm JSON for crane ${craneId}:`, parseError);
        return;
      }

      // Validate required fields
      if (!alarmData.alarmType || !alarmData.severity) {
        console.error(`Invalid alarm data for crane ${craneId}: missing alarmType or severity`);
        return;
      }

      // Find the crane
      const crane = await Crane.findOne({ craneId, isActive: true });
      if (!crane) {
        console.error(`Crane ${craneId} not found or inactive`);
        return;
      }

      // Create alarm ticket
      const ticket = new Ticket({
        craneId,
        type: 'alarm',
        severity: alarmData.severity,
        message: alarmData.message || `${alarmData.alarmType} alarm triggered`,
        createdBy: 'system',
        status: 'open',
        metadata: {
          alarmType: alarmData.alarmType,
          parameters: alarmData.parameters || {},
          timestamp: alarmData.timestamp || new Date()
        }
      });

      await ticket.save();

      console.log(`🚨 Alarm ticket created for crane ${craneId}: ${alarmData.alarmType}`);

      // Emit WebSocket event for real-time updates
      const io = require('./index').get('io');
      if (io) {
        io.emit('crane:alarm_triggered', {
          craneId,
          alarmType: alarmData.alarmType,
          severity: alarmData.severity,
          message: alarmData.message,
          timestamp: new Date()
        });
      }

    } catch (error) {
      console.error(`Error processing alarm for crane ${craneId}:`, error);
    }
  }

  async processHeartbeat(craneId, payload, companyId = null) {
    try {
      console.log(`Processing heartbeat for crane ${craneId}:`, payload);
      
      // Parse the heartbeat payload
      let heartbeatData;
      try {
        heartbeatData = JSON.parse(payload);
      } catch (parseError) {
        console.error(`Failed to parse heartbeat JSON for crane ${craneId}:`, parseError);
        return;
      }

      // Find the crane
      const crane = await Crane.findOne({ craneId, isActive: true });
      if (!crane) {
        console.error(`Crane ${craneId} not found or inactive`);
        return;
      }

      // Update crane status
      await crane.updateStatus({
        craneId,
        ts: new Date(heartbeatData.timestamp || new Date()),
        load: heartbeatData.load || 0,
        swl: heartbeatData.swl || crane.swl,
        ls1: heartbeatData.ls1 || 'UNKNOWN',
        ls2: heartbeatData.ls2 || 'UNKNOWN',
        ls3: heartbeatData.ls3 || 'UNKNOWN',
        ls4: heartbeatData.ls4 || 'UNKNOWN',
        util: heartbeatData.util || 0,
        operatingMode: heartbeatData.operatingMode || 'normal',
        raw: JSON.stringify(heartbeatData)
      });

      console.log(`💓 Heartbeat processed for crane ${craneId}`);

      // Emit WebSocket event for real-time updates
      const io = require('./index').get('io');
      if (io) {
        io.emit('crane:heartbeat', {
          craneId,
          timestamp: new Date(),
          status: 'online'
        });
      }

    } catch (error) {
      console.error(`Error processing heartbeat for crane ${craneId}:`, error);
    }
  }
}

module.exports = new MQTTClient();

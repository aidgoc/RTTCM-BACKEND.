const mqtt = require('mqtt');
const { parseTelemetryPayload } = require('./utils/parser');
const { convertRawTopic } = require('./utils/convertRawTopic');

/**
 * Calculate CRC16-CCITT checksum
 * @param {string|Buffer} data - Data to calculate CRC for
 * @returns {string} - CRC16 as 4-character hex string (e.g., "12D7")
 */
function calculateCRC16(data) {
  let crc = 0xFFFF;
  const polynomial = 0x1021;
  
  // Convert string to buffer if needed
  let buffer;
  if (typeof data === 'string') {
    buffer = Buffer.from(data, 'utf8');
  } else {
    buffer = data;
  }
  
  for (let i = 0; i < buffer.length; i++) {
    crc ^= (buffer[i] << 8);
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ polynomial;
      } else {
        crc = crc << 1;
      }
      crc &= 0xFFFF;
    }
  }
  
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Validate CRC16 for DRM3400 message format
 * @param {string} message - Full message (e.g., "$DM1236915CDC403028012D7#")
 * @param {string} receivedCRC - CRC from message (e.g., "12D7")
 * @returns {number} - 1 if valid, 0 if invalid
 */
function validateCRC16(message, receivedCRC) {
  if (!message || !receivedCRC || receivedCRC === 'N/A') {
    return 0; // Invalid if CRC is missing
  }
  
  try {
    // Extract data portion (between $DM and #)
    const hashIndex = message.indexOf('#');
    if (hashIndex === -1) return 0;
    
    // Data to validate: everything from $DM to # (excluding #)
    const dataToValidate = message.substring(0, hashIndex);
    
    // Calculate CRC
    const calculatedCRC = calculateCRC16(dataToValidate);
    const receivedCRCUpper = receivedCRC.toUpperCase().trim();
    
    // Compare (case-insensitive)
    return calculatedCRC === receivedCRCUpper ? 1 : 0;
  } catch (error) {
    console.error('CRC validation error:', error);
    return 0;
  }
}

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
  
  // Validate CRC
  const rawMessage = telemetryData.raw || '';
  const crcValid = validateCRC16(rawMessage, crc);

  console.log(`[INFO] [${ts}] [DEVICE: ${deviceLabel} | ID: ${deviceId}]`);
  console.log('→ Message Type: HEARTBEAT');
  console.log(`→ Command Byte: ${commandHex}`);
  console.log(`→ Data: ${dataHex}`);
  console.log('→ Status: ✅ Device connected and active');
  console.log(`→ CRC16 Check: ${crcValid === 1 ? '✅ Valid' : '❌ Invalid'} (${crcValid})`);
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
  
  // Validate CRC
  const rawMessage = telemetryData.raw || '';
  const crcValid = validateCRC16(rawMessage, crc);

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
  console.log(`→ CRC16 Check: ${crcValid === 1 ? '✅ Valid' : '❌ Invalid'} (${crcValid})`);

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
  
  // Validate CRC
  const rawMessage = telemetryData.raw || '';
  const crcValid = validateCRC16(rawMessage, crc);
  
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
  console.log(`→ CRC16 Check: ${crcValid === 1 ? '✅ Valid' : '❌ Invalid'} (${crcValid})`);
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
  
  // Validate CRC
  const rawMessage = telemetryData.raw || '';
  const crcValid = validateCRC16(rawMessage, crc);

  const derivedTicketNumber = parseInt(dataHighHex, 16);
  const ticketNumber = telemetryData.ticketNumber ?? (Number.isFinite(derivedTicketNumber) ? derivedTicketNumber : 0);
  const ticketType = telemetryData.ticketType ?? (parseInt(dataLowHex, 16) & 0x0F);
  const ticketStatus = telemetryData.ticketStatus || 'open';
  const statusIcon = ICON[ticketStatus !== 'closed'];
  const statusLabel = ticketStatus === 'closed' ? 'CLOSED' : 'OPEN';
  
  // Use ticketTypeInfo from parsed data if available, otherwise fallback to hardcoded mapping
  const ticketTypeInfo = telemetryData.ticketTypeInfo;
  const problemDescription = ticketTypeInfo?.problem || TICKET_PROBLEM_DESCRIPTIONS[ticketType] || 'Unknown Problem Code';
  const problemDescriptionFull = ticketTypeInfo?.description || problemDescription;

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
  if (ticketTypeInfo) {
    console.log(`→ Full Description: ${problemDescriptionFull}`);
    console.log(`→ Severity: ${ticketTypeInfo.severity || 'N/A'}`);
  }
  console.log(`→ CRC16 Check: ${crcValid === 1 ? '✅ Valid' : '❌ Invalid'} (${crcValid})`);
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
        overload: telemetryData.overload || false,
        testMode: telemetryData.testMode || false,
        // Ticket information (if present)
        ticketNumber: telemetryData.ticketNumber !== undefined ? telemetryData.ticketNumber : null,
        ticketType: telemetryData.ticketType !== undefined ? telemetryData.ticketType : null,
        ticketStatus: telemetryData.ticketStatus || null,
        isTicketOpen: telemetryData.isTicketOpen !== undefined ? telemetryData.isTicketOpen : null,
        ticketTypeInfo: telemetryData.ticketTypeInfo || null,
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
          craneId: telemetry.craneId,
        timestamp: telemetry.ts,
        load: telemetry.load,
          util: telemetry.util,
          ls1: telemetry.ls1,
          ls2: telemetry.ls2,
          ls3: telemetry.ls3,
          ls4: telemetry.ls4,
          operatingMode: telemetry.operatingMode,
          testType: telemetry.testType,
          ticketNumber: telemetry.ticketNumber,
          ticketType: telemetry.ticketType,
          ticketStatus: telemetry.ticketStatus,
          isTicketOpen: telemetry.isTicketOpen,
          ticketTypeInfo: telemetry.ticketTypeInfo,
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

      // Handle TICKET commands - create/update Ticket documents
      if (telemetryData.commandType === 'ticket' && telemetryData.ticketNumber !== undefined) {
        await this.handleTicketCommand(telemetryData.craneId, telemetryData);
      }

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
      
      // Initialize hit tracking if not exists
      if (!mergedStatus.ls1HitCount) mergedStatus.ls1HitCount = 0;
      if (!mergedStatus.ls2HitCount) mergedStatus.ls2HitCount = 0;
      if (!mergedStatus.ls3HitCount) mergedStatus.ls3HitCount = 0;
      if (!mergedStatus.ls4HitCount) mergedStatus.ls4HitCount = 0;
      
      // Track previous states to detect transitions
      const prevLs1 = mergedStatus.ls1;
      const prevLs2 = mergedStatus.ls2;
      const prevLs3 = mergedStatus.ls3;
      const prevLs4 = mergedStatus.ls4;
      
      // Track which switches have been tested today (separate from current protocol state)
      if (!mergedStatus.ls1TestedToday) mergedStatus.ls1TestedToday = false;
      if (!mergedStatus.ls2TestedToday) mergedStatus.ls2TestedToday = false;
      if (!mergedStatus.ls3TestedToday) mergedStatus.ls3TestedToday = false;
      if (!mergedStatus.ls4TestedToday) mergedStatus.ls4TestedToday = false;
      
      // Update current protocol states (what's actually HIT now - protocol sends sequential hits)
      // Protocol behavior: Only ONE switch shows HIT at a time, previous ones reset to OK
      if (data.ls1 && data.ls1 !== 'UNKNOWN') {
        mergedStatus.ls1 = data.ls1; // Update to current protocol state
        // Track if this switch has been tested today (mark as tested if it's HIT and wasn't HIT before)
        if (data.ls1 === 'HIT' && prevLs1 !== 'HIT' && !mergedStatus.ls1TestedToday && !mergedStatus.testMode) {
          mergedStatus.ls1TestedToday = true;
          mergedStatus.ls1HitCount = (mergedStatus.ls1HitCount || 0) + 1;
          console.log(`✅ LS1 tested today (count: ${mergedStatus.ls1HitCount})`);
        }
      }
      
      if (data.ls2 && data.ls2 !== 'UNKNOWN') {
        mergedStatus.ls2 = data.ls2; // Update to current protocol state
        if (data.ls2 === 'HIT' && prevLs2 !== 'HIT' && !mergedStatus.ls2TestedToday && !mergedStatus.testMode) {
          mergedStatus.ls2TestedToday = true;
          mergedStatus.ls2HitCount = (mergedStatus.ls2HitCount || 0) + 1;
          console.log(`✅ LS2 tested today (count: ${mergedStatus.ls2HitCount})`);
        }
      }
      
      if (data.ls3 && data.ls3 !== 'UNKNOWN') {
        mergedStatus.ls3 = data.ls3; // Update to current protocol state
        if (data.ls3 === 'HIT' && prevLs3 !== 'HIT' && !mergedStatus.ls3TestedToday && !mergedStatus.testMode) {
          mergedStatus.ls3TestedToday = true;
          mergedStatus.ls3HitCount = (mergedStatus.ls3HitCount || 0) + 1;
          console.log(`✅ LS3 tested today (count: ${mergedStatus.ls3HitCount})`);
        }
      }
      
      if (data.ls4 && data.ls4 !== 'UNKNOWN') {
        mergedStatus.ls4 = data.ls4; // Update to current protocol state
        if (data.ls4 === 'HIT' && prevLs4 !== 'HIT' && !mergedStatus.ls4TestedToday && !mergedStatus.testMode) {
          mergedStatus.ls4TestedToday = true;
          mergedStatus.ls4HitCount = (mergedStatus.ls4HitCount || 0) + 1;
          console.log(`✅ LS4 tested today (count: ${mergedStatus.ls4HitCount})`);
        }
      }
      
      // NEW LOGIC: Check TEST bit from protocol (bit 4)
      // TEST=1 means "Test Mode Activated" (ready to test)
      // All 4 switches tested = "Test Completed"
      const now = new Date(); // Define now before using it
      
      // Track test mode activation from protocol TEST bit
      if (data.testMode !== undefined) {
        if (data.testMode === true && !mergedStatus.testModeActivated) {
          // Test mode just activated
          mergedStatus.testModeActivated = true;
          mergedStatus.testActivatedAt = now.toISOString();
          console.log(`🔧 Test Mode ACTIVATED for ${craneId} at ${now.toLocaleString()}`);
        } else if (data.testMode === false && mergedStatus.testModeActivated) {
          // Test mode deactivated (operator finished or cancelled)
          mergedStatus.testModeActivated = false;
          console.log(`⏸️ Test Mode DEACTIVATED for ${craneId}`);
        }
      }
      
      // Check if all 4 limit switches have been tested
      const allSwitchesTested = mergedStatus.ls1TestedToday && 
                                mergedStatus.ls2TestedToday && 
                                mergedStatus.ls3TestedToday && 
                                mergedStatus.ls4TestedToday;
      
      // Check if test was already completed today
      const testDoneAt = mergedStatus.testDoneAt ? new Date(mergedStatus.testDoneAt) : null;
      const hoursSinceTest = testDoneAt ? (now - testDoneAt) / (1000 * 60 * 60) : 24;
      
      // If 24 hours have passed since last test, reset test status
      if (testDoneAt && hoursSinceTest >= 24) {
        mergedStatus.testModeCompleted = false;
        mergedStatus.testModeActivated = false;
        mergedStatus.testDoneAt = null;
        // Reset test tracking for new cycle
        mergedStatus.ls1TestedToday = false;
        mergedStatus.ls2TestedToday = false;
        mergedStatus.ls3TestedToday = false;
        mergedStatus.ls4TestedToday = false;
        console.log(`⏰ 24 hours passed - Resetting Test status for ${craneId}. Ready for new test.`);
      }
      
      // If all 4 switches have been tested and test not already completed, mark test as completed
      if (allSwitchesTested && !mergedStatus.testModeCompleted) {
        mergedStatus.testModeCompleted = true;
        mergedStatus.testModeActivated = false; // Deactivate once completed
        mergedStatus.testDoneAt = now.toISOString();
        
        console.log(`🎉 All 4 limit switches tested - Test COMPLETED for ${craneId} at ${now.toLocaleString()}`);
      }
      
      // Maintain backward compatibility with old testMode field
      mergedStatus.testMode = mergedStatus.testModeCompleted;
      
      // After test is done, still count hits if switches are hit again (for statistics)
      // But don't mark them as tested (already tested today)
      if (mergedStatus.testMode) {
        if (data.ls1 === 'HIT' && prevLs1 !== 'HIT') {
          mergedStatus.ls1HitCount = (mergedStatus.ls1HitCount || 0) + 1;
          console.log(`📊 LS1 hit again after test done (total count: ${mergedStatus.ls1HitCount})`);
        }
        if (data.ls2 === 'HIT' && prevLs2 !== 'HIT') {
          mergedStatus.ls2HitCount = (mergedStatus.ls2HitCount || 0) + 1;
          console.log(`📊 LS2 hit again after test done (total count: ${mergedStatus.ls2HitCount})`);
        }
        if (data.ls3 === 'HIT' && prevLs3 !== 'HIT') {
          mergedStatus.ls3HitCount = (mergedStatus.ls3HitCount || 0) + 1;
          console.log(`📊 LS3 hit again after test done (total count: ${mergedStatus.ls3HitCount})`);
        }
        if (data.ls4 === 'HIT' && prevLs4 !== 'HIT') {
          mergedStatus.ls4HitCount = (mergedStatus.ls4HitCount || 0) + 1;
          console.log(`📊 LS4 hit again after test done (total count: ${mergedStatus.ls4HitCount})`);
        }
      }
      
      // Calculate utilization from binary flag (UTIL bit)
      // Protocol: 0 = IDLE, 1 = WORKING
      // Track working sessions and calculate daily utilization hours
      if (data.util !== undefined) {
        const prevUtilState = mergedStatus.utilState || 'IDLE'; // 'WORKING' or 'IDLE'
        const prevUtilTimestamp = mergedStatus.utilTimestamp || now.toISOString();
        const todayWorkingHours = mergedStatus.todayWorkingHours || 0;
        const todayStartDate = mergedStatus.todayStartDate || now.toISOString().split('T')[0]; // YYYY-MM-DD
        
        const currentUtilState = data.util > 0 ? 'WORKING' : 'IDLE';
        const currentDate = now.toISOString().split('T')[0];
        
        // Check if it's a new day - reset daily tracking
        if (currentDate !== todayStartDate) {
          console.log(`📅 New day detected for ${craneId}. Resetting daily utilization.`);
          mergedStatus.todayWorkingHours = 0;
          mergedStatus.todayStartDate = currentDate;
          mergedStatus.utilTimestamp = now.toISOString();
          mergedStatus.utilState = currentUtilState;
          mergedStatus.currentSessionStart = currentUtilState === 'WORKING' ? now.toISOString() : null;
        } else {
          // Same day - track state changes
          const prevTime = new Date(prevUtilTimestamp);
          const timeDiffHours = (now - prevTime) / (1000 * 60 * 60); // Convert to hours
          
          if (prevUtilState !== currentUtilState) {
            // State changed
            if (prevUtilState === 'WORKING' && timeDiffHours > 0) {
              // Was working, now idle - add working time to today's total
              mergedStatus.todayWorkingHours = (todayWorkingHours || 0) + timeDiffHours;
              console.log(`⏱️  Crane ${craneId} stopped working. Session: ${timeDiffHours.toFixed(2)}h. Today total: ${mergedStatus.todayWorkingHours.toFixed(2)}h`);
            }
            
            // Update state and timestamp
            mergedStatus.utilState = currentUtilState;
            mergedStatus.utilTimestamp = now.toISOString();
            mergedStatus.currentSessionStart = currentUtilState === 'WORKING' ? now.toISOString() : null;
            
            if (currentUtilState === 'WORKING') {
              console.log(`🟢 Crane ${craneId} started working`);
            } else {
              console.log(`🔴 Crane ${craneId} stopped working`);
            }
          } else if (currentUtilState === 'WORKING') {
            // Still working - update timestamp for next calculation
            mergedStatus.utilTimestamp = now.toISOString();
          }
        }
        
        // Calculate current metrics using standard formulas
        // Formula: Total Available Hours = (Current Time - Start of Day) / (1000 × 60 × 60)
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);
        const totalDayHours = (now - startOfDay) / (1000 * 60 * 60); // Milliseconds to hours
        
        // Formula: Current Session Hours = (Current Time - Session Start Time) / (1000 × 60 × 60)
        let currentSessionHours = 0;
        if (currentUtilState === 'WORKING' && mergedStatus.currentSessionStart) {
          const sessionStart = new Date(mergedStatus.currentSessionStart);
          const sessionDurationMs = now - sessionStart;
          currentSessionHours = sessionDurationMs / (1000 * 60 * 60); // Convert milliseconds to hours
        }
        
        // Total working hours today (including current session)
        // Formula: Total Working Hours = Completed Sessions + Current Session Hours
        const totalWorkingHoursToday = (mergedStatus.todayWorkingHours || 0) + currentSessionHours;
        
        // Formula: Utilization % = (Total Working Hours / Total Available Hours) × 100
        // Round to 2 decimal places: Math.round(value * 100) / 100
        const utilizationPercentage = totalDayHours > 0 
          ? Math.round((totalWorkingHoursToday / totalDayHours) * 100 * 100) / 100 
          : 0;
        
        // Store metrics
        mergedStatus.util = data.util; // Binary flag (0 or 1)
        mergedStatus.utilization = Math.round(totalWorkingHoursToday * 60); // Total minutes for display (backward compatibility)
        mergedStatus.utilizationHours = Math.round(totalWorkingHoursToday * 100) / 100; // Total hours (2 decimal places)
        mergedStatus.utilizationPercentage = utilizationPercentage; // Percentage
        mergedStatus.currentSessionHours = Math.round(currentSessionHours * 100) / 100; // Current session hours
        mergedStatus.totalDayHours = Math.round(totalDayHours * 100) / 100; // Total hours since start of day
      }
      
      if (data.ut !== undefined && data.ut !== 'UNKNOWN') mergedStatus.ut = data.ut;
      
      // Track overload condition from protocol (OVERLOAD bit: 0 = normal, 1 = overload)
      // Protocol only provides overload status, not actual load values
      if (data.overload !== undefined) {
        const prevOverloadState = mergedStatus.overloadState || 'NORMAL'; // 'NORMAL' or 'OVERLOAD'
        const prevOverloadTimestamp = mergedStatus.overloadTimestamp || now.toISOString();
        const todayOverloadEvents = mergedStatus.todayOverloadEvents || 0;
        const todayOverloadMinutes = mergedStatus.todayOverloadMinutes || 0;
        const todayStartDate = mergedStatus.todayStartDate || now.toISOString().split('T')[0];
        
        const currentOverloadState = data.overload ? 'OVERLOAD' : 'NORMAL';
        const currentDate = now.toISOString().split('T')[0];
        
        // Check if it's a new day - reset daily tracking
        if (currentDate !== todayStartDate) {
          console.log(`📅 New day detected for ${craneId}. Resetting daily overload tracking.`);
          mergedStatus.todayOverloadEvents = 0;
          mergedStatus.todayOverloadMinutes = 0;
          mergedStatus.todayStartDate = currentDate;
          mergedStatus.overloadTimestamp = now.toISOString();
          mergedStatus.overloadState = currentOverloadState;
          mergedStatus.currentOverloadStart = currentOverloadState === 'OVERLOAD' ? now.toISOString() : null;
        } else {
          // Same day - track state changes
          const prevTime = new Date(prevOverloadTimestamp);
          const timeDiffMinutes = (now - prevTime) / (1000 * 60); // Convert to minutes
          
          if (prevOverloadState !== currentOverloadState) {
            // State changed
            if (prevOverloadState === 'OVERLOAD' && timeDiffMinutes > 0) {
              // Overload ended - add duration to today's total
              mergedStatus.todayOverloadMinutes = (todayOverloadMinutes || 0) + timeDiffMinutes;
              mergedStatus.totalOverloadEvents = (mergedStatus.totalOverloadEvents || 0) + 1;
              console.log(`✅ Crane ${craneId} overload cleared. Duration: ${timeDiffMinutes.toFixed(2)} min. Today total: ${mergedStatus.todayOverloadMinutes.toFixed(2)} min`);
            }
            
            if (currentOverloadState === 'OVERLOAD') {
              // Overload started
              mergedStatus.todayOverloadEvents = (todayOverloadEvents || 0) + 1;
              mergedStatus.currentOverloadStart = now.toISOString();
              console.log(`🚨 OVERLOAD DETECTED for crane ${craneId}! Event #${mergedStatus.todayOverloadEvents} today.`);
              
              // Generate overload alert
              await this.checkOverloadAlerts(craneId, mergedStatus);
            }
            
            // Update state and timestamp
            mergedStatus.overloadState = currentOverloadState;
            mergedStatus.overloadTimestamp = now.toISOString();
          } else if (currentOverloadState === 'OVERLOAD') {
            // Still overloaded - update timestamp for next calculation
            mergedStatus.overloadTimestamp = now.toISOString();
          }
        }
        
        // Calculate current overload metrics
        let currentOverloadMinutes = 0;
        if (currentOverloadState === 'OVERLOAD' && mergedStatus.currentOverloadStart) {
          const overloadStart = new Date(mergedStatus.currentOverloadStart);
          const overloadDurationMs = now - overloadStart;
          currentOverloadMinutes = overloadDurationMs / (1000 * 60);
        }
        
        // Total overload minutes today (including current overload)
        const totalOverloadMinutesToday = (mergedStatus.todayOverloadMinutes || 0) + currentOverloadMinutes;
        
        // Calculate overload percentage of operating time
        // Formula: Overload % = (Overload Time / Operating Time) × 100
        const todayOperatingHours = mergedStatus.utilizationHours || 0;
        const todayOperatingMinutes = todayOperatingHours * 60;
        const overloadPercentage = todayOperatingMinutes > 0
          ? Math.round((totalOverloadMinutesToday / todayOperatingMinutes) * 100 * 100) / 100
          : 0;
        
        // Calculate risk level
        // Formula: Risk based on overloads per day
        const overloadsPerDay = mergedStatus.todayOverloadEvents || 0;
        let riskLevel = 'MINIMAL';
        if (overloadsPerDay > 5) riskLevel = 'HIGH';
        else if (overloadsPerDay > 2) riskLevel = 'MEDIUM';
        else if (overloadsPerDay > 0) riskLevel = 'LOW';
        
        // Store metrics
        mergedStatus.overload = data.overload; // Binary flag (0 or 1)
        mergedStatus.overloadState = currentOverloadState;
        mergedStatus.totalOverloadMinutes = Math.round(totalOverloadMinutesToday * 100) / 100;
        mergedStatus.overloadPercentage = overloadPercentage;
        mergedStatus.currentOverloadMinutes = Math.round(currentOverloadMinutes * 100) / 100;
        mergedStatus.riskLevel = riskLevel;
      }
      
      // Update other command-specific fields
      if (data.operatingMode) mergedStatus.operatingMode = data.operatingMode;
      if (data.testType) mergedStatus.testType = data.testType;
      if (data.testResults) mergedStatus.testResults = data.testResults;
      
      // Update ticket info with "sticky open" logic:
      // Once a ticket is open, it stays open until explicitly closed by a TICKET command
      // Only update ticket data if:
      // 1. New data is from a TICKET command (has ticketNumber/ticketType), OR
      // 2. New data explicitly closes the ticket (isTicketOpen = false from TICKET command)
      if (data.commandType === 'ticket') {
        // This is a TICKET command - update all ticket fields
        if (data.ticketNumber !== undefined) mergedStatus.ticketNumber = data.ticketNumber;
        if (data.ticketType !== undefined) mergedStatus.ticketType = data.ticketType;
        if (data.ticketStatus) mergedStatus.ticketStatus = data.ticketStatus;
        if (data.isTicketOpen !== undefined) mergedStatus.isTicketOpen = data.isTicketOpen;
        if (data.ticketTypeInfo) mergedStatus.ticketTypeInfo = data.ticketTypeInfo;
      } else {
        // This is NOT a TICKET command (heartbeat, event, load, etc.)
        // Preserve existing ticket status - don't overwrite with undefined/null
        // Only clear ticket if explicitly closed (shouldn't happen from non-ticket commands, but be safe)
        if (mergedStatus.isTicketOpen === true) {
          // Ticket is open - keep it open, don't overwrite
          // Don't update ticket fields from non-ticket commands
        } else if (data.isTicketOpen === false) {
          // Explicitly closed (shouldn't happen from non-ticket commands, but handle it)
          mergedStatus.isTicketOpen = false;
        }
        // If ticket was never set, leave it as is (undefined/null)
      }
      
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
        const allSwitchesCurrentlyHit = mergedStatus.ls1 === 'HIT' && mergedStatus.ls2 === 'HIT' && 
                                       mergedStatus.ls3 === 'HIT' && mergedStatus.ls4 === 'HIT';
        const allSwitchesTestedToday = mergedStatus.ls1TestedToday && mergedStatus.ls2TestedToday && 
                                      mergedStatus.ls3TestedToday && mergedStatus.ls4TestedToday;
        console.log(`✅ Updated crane status for ${craneId} [${data.commandType?.toUpperCase()}]:`, {
          // Current protocol states (what's HIT now)
          ls1: mergedStatus.ls1,
          ls2: mergedStatus.ls2,
          ls3: mergedStatus.ls3,
          ls4: mergedStatus.ls4,
          // Test progress tracking
          ls1TestedToday: mergedStatus.ls1TestedToday ? '✅' : '❌',
          ls2TestedToday: mergedStatus.ls2TestedToday ? '✅' : '❌',
          ls3TestedToday: mergedStatus.ls3TestedToday ? '✅' : '❌',
          ls4TestedToday: mergedStatus.ls4TestedToday ? '✅' : '❌',
          // Hit counts for statistics
          ls1Hits: mergedStatus.ls1HitCount || 0,
          ls2Hits: mergedStatus.ls2HitCount || 0,
          ls3Hits: mergedStatus.ls3HitCount || 0,
          ls4Hits: mergedStatus.ls4HitCount || 0,
          allSwitchesTestedToday: allSwitchesTestedToday ? '✅ YES' : '❌ NO',
          allSwitchesCurrentlyHit: allSwitchesCurrentlyHit ? '✅ YES' : '❌ NO',
          load: mergedStatus.load,
          util: mergedStatus.util,
          // Utilization metrics
          utilState: mergedStatus.utilState || 'IDLE',
          utilizationHours: mergedStatus.utilizationHours || 0,
          utilizationPercentage: mergedStatus.utilizationPercentage || 0,
          currentSessionHours: mergedStatus.currentSessionHours || 0,
          todayWorkingHours: mergedStatus.todayWorkingHours || 0,
          // Overload metrics
          overloadState: mergedStatus.overloadState || 'NORMAL',
          overload: mergedStatus.overload || false,
          todayOverloadEvents: mergedStatus.todayOverloadEvents || 0,
          todayOverloadMinutes: mergedStatus.todayOverloadMinutes || 0,
          currentOverloadMinutes: mergedStatus.currentOverloadMinutes || 0,
          overloadPercentage: mergedStatus.overloadPercentage || 0,
          riskLevel: mergedStatus.riskLevel || 'MINIMAL',
          testModeActivated: mergedStatus.testModeActivated ? '🔧 ACTIVATED' : '⏸️ Not Activated',
          testModeCompleted: mergedStatus.testModeCompleted ? '✅ COMPLETED' : '❌ Not Completed',
          testMode: mergedStatus.testMode ? '✅ Test Done' : '❌ Test Not Done',
          testDoneAt: mergedStatus.testDoneAt ? new Date(mergedStatus.testDoneAt).toLocaleString() : 'N/A',
          isTicketOpen: mergedStatus.isTicketOpen,
          ticketNumber: mergedStatus.ticketNumber,
          ticketType: mergedStatus.ticketType,
          ticketTypeInfo: mergedStatus.ticketTypeInfo
        });
      }
    } catch (error) {
      console.error(`Error updating crane status for ${craneId}:`, error);
    }
  }

  async handleTicketCommand(craneId, ticketData) {
    try {
      console.log(`🎫 handleTicketCommand called for crane ${craneId}:`, {
        ticketNumber: ticketData.ticketNumber,
        ticketType: ticketData.ticketType,
        ticketTypeInfo: ticketData.ticketTypeInfo,
        isTicketOpen: ticketData.isTicketOpen
      });

      const crane = await Crane.findOne({ craneId });
      if (!crane) {
        console.log(`⚠️ Crane ${craneId} not found for ticket handling`);
        return;
      }

      const ticketNumber = ticketData.ticketNumber;
      const isOpen = ticketData.isTicketOpen === true;
      const ticketType = ticketData.ticketType || 0;
      const ticketTypeInfo = ticketData.ticketTypeInfo || { problem: 'Unknown Issue', description: 'No description', severity: 'warning' };
      
      console.log(`🎫 Processing ticket:`, {
        ticketNumber,
        isOpen,
        ticketType,
        ticketTypeInfo
      });

      // Find existing ticket for this crane with matching MQTT ticket number
      // We store the MQTT ticket number in tags for lookup
      const existingTicket = await Ticket.findOne({
        craneId,
        tags: { $in: [`mqtt-ticket-${ticketNumber}`] }
      });

      if (isOpen) {
        // Ticket is OPEN - create or update ticket
        if (existingTicket) {
          // Update existing ticket if it was closed
          if (existingTicket.status === 'closed' || existingTicket.status === 'resolved') {
            existingTicket.status = 'open';
            existingTicket.severity = ticketTypeInfo.severity === 'critical' ? 'critical' : 
                                     ticketTypeInfo.severity === 'warning' ? 'high' : 'medium';
            await existingTicket.save();
            console.log(`✅ Reopened ticket #${ticketNumber} for crane ${craneId}`);
          }
        } else {
          // Create new ticket
          const User = require('./models/User');
          // Try to find any operator, manager, or admin to use as createdBy
          let systemUser = await User.findOne({ role: { $in: ['operator', 'manager', 'admin'] } }).limit(1);
          
          if (!systemUser) {
            // If no user found, try to find any user at all
            systemUser = await User.findOne().limit(1);
          }
          
          if (!systemUser) {
            console.log(`⚠️ No user found in database, cannot create ticket for crane ${craneId}`);
            console.log(`⚠️ Please create at least one user in the system`);
            return;
          }

          console.log(`👤 Using user ${systemUser.email} (${systemUser.role}) as ticket creator`);

          const ticket = new Ticket({
            craneId,
            title: ticketTypeInfo.problem || 'Crane Issue',
            description: `Ticket #${ticketNumber}: ${ticketTypeInfo.description || ticketTypeInfo.problem}`,
            type: ticketTypeInfo.severity === 'critical' ? 'safety' : 'operational',
            severity: ticketTypeInfo.severity === 'critical' ? 'critical' : 
                     ticketTypeInfo.severity === 'warning' ? 'high' : 'medium',
            priority: ticketTypeInfo.severity === 'critical' ? 'urgent' : 'normal',
            createdBy: systemUser._id,
            status: 'open',
            tags: [`mqtt-ticket-${ticketNumber}`, `type-${ticketType}`] // Store MQTT ticket number in tags for lookup
          });

          try {
            await ticket.save();
            
            // Add ticket to crane's tickets array
            await Crane.findByIdAndUpdate(crane._id, {
              $addToSet: { tickets: ticket._id }
            });

            console.log(`✅ Created ticket #${ticketNumber} (${ticket.ticketId}) for crane ${craneId}:`, {
              title: ticket.title,
              description: ticket.description,
              type: ticket.type,
              severity: ticket.severity,
              priority: ticket.priority,
              ticketTypeInfo: ticketTypeInfo,
              craneId: ticket.craneId
            });
          } catch (saveError) {
            console.error(`❌ Failed to save ticket for crane ${craneId}:`, saveError.message);
            if (saveError.errors) {
              console.error('Validation errors:', Object.keys(saveError.errors).map(key => ({
                field: key,
                message: saveError.errors[key].message
              })));
            }
          }
        }
      } else {
        // Ticket is CLOSED - close existing ticket
        if (existingTicket && (existingTicket.status === 'open' || existingTicket.status === 'in_progress')) {
          existingTicket.status = 'closed';
          existingTicket.resolvedAt = new Date();
          await existingTicket.save();
          console.log(`✅ Closed ticket #${ticketNumber} for crane ${craneId}`);
        }
      }
    } catch (error) {
      console.error(`Error handling ticket command for crane ${craneId}:`, error);
    }
  }

  async checkOverloadAlerts(craneId, mergedStatus) {
    try {
      const crane = await Crane.findOne({ craneId });
      if (!crane) return;

      const todayOverloadEvents = mergedStatus.todayOverloadEvents || 0;
      const currentOverloadMinutes = mergedStatus.currentOverloadMinutes || 0;
      
      // Check for extended overload (more than 5 minutes)
      if (currentOverloadMinutes > 5) {
        await this.createAlert(craneId, 'overload', 'critical', 
          `Extended overload condition detected: ${currentOverloadMinutes.toFixed(1)} minutes - immediate intervention required`);
      } else {
        // Standard overload alert
        await this.createAlert(craneId, 'overload', 'high', 
          `Crane overload condition detected (OVERLOAD bit = 1)`);
      }
      
      // Check for frequent overloads (more than 3 in last 10 minutes)
      // This would require tracking recent overload events, simplified here
      if (todayOverloadEvents > 3) {
        await this.createAlert(craneId, 'overload', 'critical', 
          `Multiple overload events detected today (${todayOverloadEvents} events) - check load management`);
      }
    } catch (error) {
      console.error(`Error checking overload alerts for crane ${craneId}:`, error);
    }
  }

  async checkAlerts(craneId, data) {
    try {
      const crane = await Crane.findOne({ craneId });
      if (!crane) return;

      // Note: Protocol only provides OVERLOAD bit (0 or 1), not actual load values
      // Overload alerts are handled in checkOverloadAlerts() when overload state changes
      
      // Check for limit switch failures
      const limitSwitches = ['ls1', 'ls2', 'ls3', 'ls4'];
      for (const ls of limitSwitches) {
        if (data[ls] === 'FAIL') {
          await this.createAlert(craneId, 'limit_switch', 'high', 
            `Limit switch ${ls.toUpperCase()} failure detected`);
        }
      }

      // Check for utilization issues (if using percentage)
      if (data.utilizationPercentage && data.utilizationPercentage > 95) {
        await this.createAlert(craneId, 'utilization', 'medium', 
          `High utilization detected: ${data.utilizationPercentage.toFixed(2)}%`);
      }
    } catch (error) {
      console.error(`Error checking alerts for crane ${craneId}:`, error);
    }
  }

  async createAlert(craneId, alertType, alertSeverity, message) {
    try {
      // Map alert types to valid Ticket types
      const typeMap = {
        'overload': 'safety',
        'limit_switch': 'safety',
        'utilization': 'operational',
        'offline': 'operational'
      };
      
      // Map alert severity to valid Ticket severity
      const severityMap = {
        'critical': 'critical',
        'warning': 'high',
        'high': 'high',
        'medium': 'medium',
        'low': 'low'
      };

      const ticketType = typeMap[alertType] || 'operational';
      const ticketSeverity = severityMap[alertSeverity] || 'medium';

      // Find a system operator user for system-generated tickets
      // If no operator exists, skip ticket creation and just log the alert
      const User = require('./models/User');
      const systemOperator = await User.findOne({ role: 'operator' }).limit(1);
      
      if (!systemOperator) {
        // No operator exists, just log the alert without creating a ticket
        console.log(`⚠️ Alert for crane ${craneId} [${ticketType}/${ticketSeverity}]: ${message}`);
        return;
      }

      // Create title and description from message
      const title = message.length > 200 ? message.substring(0, 197) + '...' : message;
      const description = message;

      // Check if similar alert already exists (deduplication)
      const existingTicket = await Ticket.findOne({
        craneId,
        type: ticketType,
        status: { $in: ['open', 'in_progress'] },
        createdAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) } // Last 5 minutes
      });

      if (existingTicket) {
        // Update existing ticket description if it's different
        if (existingTicket.description !== description) {
          existingTicket.description = description;
          existingTicket.severity = ticketSeverity;
        await existingTicket.save();
        }
        return;
      }

      // Create new ticket with proper schema fields
      const ticket = new Ticket({
        craneId,
        title,
        description,
        type: ticketType,
        severity: ticketSeverity,
        priority: ticketSeverity === 'critical' ? 'urgent' : ticketSeverity === 'high' ? 'high' : 'normal',
        createdBy: systemOperator._id,
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

      console.log(`✅ Created ${ticketSeverity} alert ticket for crane ${craneId}: ${title}`);
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

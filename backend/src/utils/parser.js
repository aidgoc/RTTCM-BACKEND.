/**
 * Robust MQTT payload parser for crane telemetry data
 * Supports: DM, ET, HT, DRM3300, DRM3400 (20-byte), DRM3400 (compact), GSM, GPS, and legacy formats
 */

function parseTelemetryPayload(payload) {
  if (!payload || typeof payload !== 'string') return null;
  const trimmedPayload = payload.trim();

  // --- DRM3400 Compact format: $DM + 6-char DID + 8-char TS + 4-char STATUS + 4-char DATA (no # separator) ---
  // Format: $DM123609f1bd5020000004C1
  // Structure: $DM + DID(6 hex) + TS(8 hex) + STATUS(4 hex) + DATA(4 hex)
  if (trimmedPayload.startsWith('$DM') && !trimmedPayload.includes('#') && !trimmedPayload.includes('|')) {
    // Check if it matches the compact format (typically 24-26 chars: $DM(3) + DID(6) + TS(8) + STATUS(4) + DATA(4) = 25)
    if (trimmedPayload.length >= 20 && trimmedPayload.length <= 30) {
      const parsedCompact = parseDRM3400_CompactFormat(trimmedPayload);
      if (parsedCompact) {
        return parsedCompact;
      }
    }
  }

  // --- DRM3400 20-byte binary format: $DM + 3-byte DID + 1-byte CMD + 4-byte TS + 2-byte DATA + # + 2-byte CRC ---
  // Format: $DMabc68e1d43820087#0506
  // Try 20-byte format first (no pipe delimiters, contains # separator)
  if (trimmedPayload.startsWith('$DM') && trimmedPayload.includes('#') && !trimmedPayload.includes('|')) {
    const parsed20Byte = parseDRM3400_20ByteFormat(trimmedPayload);
    if (parsed20Byte) {
      return parsed20Byte;
    }
    // If 20-byte parser returns null, it means the format didn't match, continue to other parsers
  }

  // --- DRM3400 6-field DM ASCII format ---
  if (trimmedPayload.startsWith('$DM') && trimmedPayload.endsWith('#')) {
    const parsedDM6 = parseDM6Format(trimmedPayload);
    if (parsedDM6) return parsedDM6;
    return parseDMFormat(trimmedPayload);
  }

  // --- HT Format ---
  if (trimmedPayload.startsWith('$HT|') && trimmedPayload.endsWith('#')) {
    return parseHTFormat(trimmedPayload);
  }

  // --- ET Format ---
  if (trimmedPayload.startsWith('$ET|') && trimmedPayload.endsWith('#')) {
    return parseETFormat(trimmedPayload);
  }

  // --- DRM3300 Format ---
  if (trimmedPayload.startsWith('$DRM|') && trimmedPayload.endsWith('#')) {
    return parseDRM3300Format(trimmedPayload);
  }

  // --- GSM Location Format ---
  if (trimmedPayload.startsWith('$GSM|') && trimmedPayload.endsWith('#')) {
    return parseGSMFormat(trimmedPayload);
  }

  // --- GPS Location Format ---
  if (trimmedPayload.startsWith('$GPS|') && trimmedPayload.endsWith('#')) {
    return parseGPSFormat(trimmedPayload);
  }

  // --- JSON Payload ---
  if (trimmedPayload.startsWith('{') && trimmedPayload.endsWith('}')) {
    return parseJSONPayload(trimmedPayload);
  }

  // --- Semicolon-delimited ---
  if (trimmedPayload.includes(';')) {
    return parseSemicolonPayload(trimmedPayload);
  }

  // --- Pipe-delimited ---
  if (trimmedPayload.includes('|')) {
    return parsePipePayload(trimmedPayload);
  }

  console.error('Unknown payload format:', payload);
  return null;
}

/**
 * Parse DM legacy format: $DM|deviceId|epochTime|switchStatus|load#
 */
function parseDMFormat(payload) {
  try {
    const cleanPayload = payload.slice(1, -1);
    const parts = cleanPayload.split('|');
    if (parts.length !== 5) throw new Error('Invalid DM format - expected 5 parts');

    const [deviceType, deviceId, epochTime, switchStatus, load] = parts;
    const switchStatusInt = parseInt(switchStatus, 16);
    const switches = parseSwitchStatus(switchStatusInt);

    return {
      craneId: `DM-${deviceId}`,
      deviceType,
      deviceId,
      ts: new Date(parseInt(epochTime) * 1000).toISOString(),
      load: parseFloat(load) || 0,
      swl: 100,
      ls1: switches.ls1,
      ls2: switches.ls2,
      ls3: switches.ls3,
      ls4: switches.ls4,
      ut: switches.utilization ? 'ON' : 'OFF',
      util: switches.utilization ? 100 : 0,
      testMode: switches.testMode,
      overload: switches.overload,
      power: switches.power,
      ticket: switches.ticket,
      heartbeat: switches.heartbeat
    };
  } catch (error) {
    console.error('DM parsing error:', error);
    return null;
  }
}

/**
 * Parse ET format: $ET|deviceId|epochTime|eventStatus|load#
 */
function parseETFormat(payload) {
  try {
    const cleanPayload = payload.slice(1, -1);
    const parts = cleanPayload.split('|');
    if (parts.length !== 5) throw new Error('Invalid ET format - expected 5 parts');

    const [deviceType, deviceId, epochTime, eventStatus, load] = parts;
    return {
      craneId: `ET-${deviceId}`,
      deviceType,
      deviceId,
      ts: new Date(parseInt(epochTime) * 1000).toISOString(),
      load: parseFloat(load) || 0,
      swl: 100,
      eventStatus: parseInt(eventStatus),
      eventType: getEventType(parseInt(eventStatus)),
      ls1: 'UNKNOWN',
      ls2: 'UNKNOWN',
      ls3: 'UNKNOWN',
      ut: 'UNKNOWN',
      util: 0
    };
  } catch (error) {
    console.error('ET parsing error:', error);
    return null;
  }
}

/**
 * Parse HT format: $HT|deviceId|epochTime|eventStatus|load#
 */
function parseHTFormat(payload) {
  try {
    const cleanPayload = payload.slice(1, -1);
    const parts = cleanPayload.split('|');
    if (parts.length !== 5) throw new Error('Invalid HT format - expected 5 parts');

    const [deviceType, deviceId, epochTime, eventStatus, load] = parts;
    return {
      craneId: `HT-${deviceId}`,
      deviceType,
      deviceId,
      ts: new Date(parseInt(epochTime) * 1000).toISOString(),
      load: parseFloat(load) || 0,
      swl: 100,
      eventStatus: parseInt(eventStatus),
      eventType: getHoistEventType(parseInt(eventStatus)),
      ls1: 'UNKNOWN',
      ls2: 'UNKNOWN',
      ls3: 'UNKNOWN',
      ut: 'UNKNOWN',
      util: 0
    };
  } catch (error) {
    console.error('HT parsing error:', error);
    return null;
  }
}

/**
 * Parse switch status bitmask
 */
function parseSwitchStatus(status) {
  return {
    power: (status & 0x80) !== 0,
    ticket: (status & 0x40) !== 0,
    testMode: (status & 0x20) !== 0,
    overload: (status & 0x10) !== 0,
    ls1: (status & 0x08) !== 0 ? 'HIT' : 'OK',
    ls2: (status & 0x04) !== 0 ? 'HIT' : 'OK',
    ls3: (status & 0x02) !== 0 ? 'HIT' : 'OK',
    ls4: (status & 0x01) !== 0 ? 'HIT' : 'OK',
    utilization: (status & 0x01) !== 0,
    heartbeat: status === 0xE0
  };
}

/** Event Type Maps */
function getEventType(status) {
  const eventTypes = { 1: 'LT_ON', 2: 'LT_OFF', 3: 'CT_ON', 4: 'CT_OFF', 5: 'LOAD' };
  return eventTypes[status] || 'UNKNOWN';
}
function getHoistEventType(status) {
  const eventTypes = { 1: 'SW1_ON', 2: 'SW1_OFF', 3: 'SW2_ON', 4: 'SW2_OFF', 5: 'LOAD' };
  return eventTypes[status] || 'UNKNOWN';
}

/** JSON format parser */
function parseJSONPayload(payload) {
  try {
    const data = JSON.parse(payload);
    return {
      craneId: data.id || data.craneId,
      ts: data.ts || data.timestamp,
      load: parseFloat(data.load) || 0,
      // SWL removed - device does not send SWL
      ls1: data.ls1 || 'UNKNOWN',
      ls2: data.ls2 || 'UNKNOWN',
      ls3: data.ls3 || 'UNKNOWN',
      ut: data.ut || data.utility || 'UNKNOWN',
      util: parseFloat(data.util) || 0
    };
  } catch (error) {
    console.error('JSON parsing error:', error);
    return null;
  }
}

/** Semicolon format parser */
function parseSemicolonPayload(payload) {
  try {
    const pairs = payload.split(';');
    const data = {};
    pairs.forEach(pair => {
      const [key, value] = pair.split('=');
      if (key && value !== undefined) data[key.trim()] = value.trim();
    });
    return {
      craneId: data.ID,
      ts: data.TS,
      load: parseFloat(data.LOAD) || 0,
      // SWL removed - device does not send SWL
      ls1: data.LS1 || 'UNKNOWN',
      ls2: data.LS2 || 'UNKNOWN',
      ls3: data.LS3 || 'UNKNOWN',
      ut: data.UT || 'UNKNOWN',
      util: parseFloat(data.UTIL) || 0
    };
  } catch (error) {
    console.error('Semicolon parsing error:', error);
    return null;
  }
}

/** Pipe format parser */
function parsePipePayload(payload) {
  try {
    const parts = payload.split('|');
    if (parts.length < 2) throw new Error('Invalid pipe-delimited format');

    const data = { craneId: parts[0].trim(), ts: parts[1].trim() };
    for (let i = 2; i < parts.length; i++) {
      const [key, value] = parts[i].split(':');
      if (key && value !== undefined) data[key.trim()] = value.trim();
    }
    return {
      craneId: data.craneId,
      ts: data.ts,
      load: parseFloat(data.LOAD) || 0,
      swl: parseFloat(data.SWL) || 0,
      ls1: data.LS1 || 'UNKNOWN',
      ls2: data.LS2 || 'UNKNOWN',
      ls3: data.LS3 || 'UNKNOWN',
      ut: data.UT || 'UNKNOWN',
      util: parseFloat(data.UTIL) || 0
    };
  } catch (error) {
    console.error('Pipe parsing error:', error);
    return null;
  }
}

/** Validate parsed telemetry */
function validateTelemetryData(data) {
  if (!data || !data.craneId || !data.ts) return false;

  const timestamp = new Date(data.ts);
  if (isNaN(timestamp.getTime())) return false;
  if (typeof data.load !== 'number' || data.load < 0) return false;
  if (typeof data.swl !== 'number' || data.swl <= 0) return false;
  if (typeof data.util !== 'number' || data.util < 0 || data.util > 100) return false;

  const validStatuses = ['OK', 'FAIL', 'UNKNOWN', 'HIT', 'ON', 'OFF'];
  for (const key of ['ls1', 'ls2', 'ls3', 'ut']) {
    if (data[key] && !validStatuses.includes(data[key])) return false;
  }
 
  return true;
}

/** Placeholder for DRM3400 ASCII DM 6-field parser */
function parseDM6Format(payload) {
  try {
    // Accept formats like:
    // $DM|C123|1730792400|02|C2|00#  (deviceId, epoch, command, dataHigh, dataLow)
    // or legacy variant: $DM|FLAGS|TIMESTAMP|MODE|DATA_HIGH|DATA_LOW#
    const content = payload.slice(1, -1); // remove $ and #
    const parts = content.split('|');
    if (parts.length !== 6 || parts[0] !== 'DM') return null;

    const field2 = parts[1];
    const epochStr = parts[2]; 
    const cmdStr = parts[3];
    const dhStr = parts[4];
    const dlStr = parts[5];

    const craneId = field2.trim();
    const ts = new Date(parseInt(epochStr, 10) * 1000).toISOString();

    // Helper to parse number that may be hex or decimal
    const parseNum = (s) => {
      const ss = s.trim();
      const isHex = /^([0-9a-fA-F]{1,2})$/.test(ss);
      return parseInt(ss, isHex ? 16 : 10);
    };

    const command = parseNum(cmdStr);
    const dataHigh = parseNum(dhStr);
    const dataLow = parseNum(dlStr);

    // Heartbeat
    if (command === 0x01 || (dataHigh === 0 && dataLow === 0)) {
      return {
        craneId,
        ts,
        commandType: 'heartbeat',
        util: 0,
        ut: 'OFF',
        ls1: 'OK', ls2: 'OK', ls3: 'OK', ls4: 'OK'
      };
    }

    // Event (0x02) – decode bits from dataHigh, low often 0
    if (command === 0x02) {
      // According to documentation:
      // UTIL bit: 0 = crane not under operation, 1 = crane under operation (FLAG, not percentage)
      const utilBit = (dataHigh & 0x80) !== 0; // bit7
      const overloadBit = (dataHigh & 0x40) !== 0; // bit6
      const limitSwitchTestBit = (dataHigh & 0x20) !== 0; // bit5 (repurposed)
      const ls1Hit = (dataHigh & 0x08) !== 0; // bit3
      const ls2Hit = (dataHigh & 0x04) !== 0; // bit2
      const ls3Hit = (dataHigh & 0x02) !== 0; // bit1
      const ls4Hit = (dataHigh & 0x01) !== 0; // bit0

      // Extract load from dataLow if present
      const load = dataLow > 0 ? dataLow / 10 : 0;

      return {
        craneId,
        ts,
        commandType: 'event',
        operatingMode: limitSwitchTestBit ? 'test' : 'normal',
        limitSwitchTestMode: limitSwitchTestBit,
        testType: limitSwitchTestBit ? 'limit_switch_test' : null,
        testResults: limitSwitchTestBit ? {
          ls1: ls1Hit ? 'HIT' : 'OK',
          ls2: ls2Hit ? 'HIT' : 'OK',
          ls3: ls3Hit ? 'HIT' : 'OK',
          ls4: ls4Hit ? 'HIT' : 'OK',
          testPassed: true
        } : null,
        load: load,
        swl: 100, // Default, will be updated from crane config
        // UTIL is a flag: 0 = idle, 1 = operating (not a percentage)
        util: utilBit ? 1 : 0,
        ut: utilBit ? 'ON' : 'OFF',
        overload: overloadBit,
        ls1: ls1Hit ? 'HIT' : 'OK',
        ls2: ls2Hit ? 'HIT' : 'OK',
        ls3: ls3Hit ? 'HIT' : 'OK',
        ls4: ls4Hit ? 'HIT' : 'OK'
      };
    }

    // Ticket (0x03)
    if (command === 0x03) {
      const ticketNumber = dataHigh & 0xFF;
      const ticketType = dataLow & 0x0F;
      const ticketClosed = (dataLow & 0x10) !== 0;
      return {
        craneId,
        ts,
        commandType: 'ticket',
        ticketNumber,
        ticketType,
        ticketStatus: ticketClosed ? 'closed' : 'open'
      };
    }

    // Load (0x04)
    if (command === 0x04) {
      const rawLoad = ((dataHigh & 0xFF) << 8) | (dataLow & 0xFF);
      const load = rawLoad / 10;
      return {
        craneId,
        ts,
        commandType: 'load',
        load,
        rawLoad
      };
    }

    // Unknown command – return basic envelope
    return { craneId, ts, commandType: `unknown_${command}` };
  } catch (e) {
    console.error('DM6 parsing error:', e);
    return null;
  }
}

/** Optional: normalize data (currently passthrough) */
function normalizeTelemetryData(data) {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const round = (value, decimals = 2) => {
    if (!Number.isFinite(value)) return value;
    const factor = 10 ** decimals;
    return Math.round(value * factor) / factor;
  };

  const normalizeStatus = (value, defaultValue = 'UNKNOWN') => {
    if (value === undefined || value === null || value === '') {
      return defaultValue;
    }
    return String(value).trim().toUpperCase();
  };

  const toNumber = (value, defaultValue = 0, decimals = 2) => {
    const num = Number.parseFloat(value);
    if (!Number.isFinite(num)) return defaultValue;
    return round(num, decimals);
  };

  const normalized = {
    craneId: data.craneId ? String(data.craneId).trim().toUpperCase() : data.craneId,
    ts: data.ts ? String(data.ts).trim() : data.ts,
    load: toNumber(data.load, 0, 2),
    // SWL removed - device does not send SWL
    ls1: normalizeStatus(data.ls1),
    ls2: normalizeStatus(data.ls2),
    ls3: normalizeStatus(data.ls3),
    ut: normalizeStatus(data.ut),
    util: (() => {
      const utilValue = Number.parseFloat(data.util);
      if (!Number.isFinite(utilValue)) return 0;
      const clamped = Math.max(0, Math.min(100, utilValue));
      return round(clamped, 2);
    })()
  };

  return normalized;
}

/**
 * Parse DRM3400 ASCII packet: $DM + DID(3) + TS(4 bytes) + CMD(1 byte) + DH(1) + DL(1) + # + CRC(2)
 * Example: $DMabc68e1d43820087#0506
 *
 * Canonical byte positions (0-based):
 *   0        -> '$'
 *   1..2     -> Device type ('DM')
 *   3..5     -> Device ID (3 characters)
 *   6..9     -> Timestamp (4 raw bytes represented as hex pairs)
 *   10       -> Command byte (01=heartbeat, 02=event, 03=ticket, 04=load)
 *   11       -> Data high byte (command-specific meaning)
 *   12       -> Data low byte  (command-specific meaning)
 *   13       -> '#'
 *   14..15   -> CRC (2 bytes, typically shown as 4 hex characters)
 *
 * Some firmware revisions drop leading zeroes when rendering individual bytes
 * as ASCII hex, so we normalise the CMD/DH/DL region before decoding.
 */
function parseDRM3400_20ByteFormat(payload) {
  try {
    if (typeof payload !== 'string' || !payload.startsWith('$DM')) {
      return null;
    }

    const hashIndex = payload.indexOf('#');
    if (hashIndex === -1) return null;

    const dataSection = payload.slice(1, hashIndex); // between $ and #
    const crcSection = payload.slice(hashIndex + 1).trim(); // bytes after #

    if (dataSection.length < 13) return null;

    const deviceType = dataSection.slice(0, 2);
    if (deviceType !== 'DM') return null;

    const deviceId = dataSection.slice(2, 5);
    if (!deviceId) return null;

    const remainder = dataSection.slice(5);
    if (remainder.length < 8) return null;

    const timestampHex = remainder.slice(0, 8);
    if (!/^[0-9a-fA-F]{8}$/.test(timestampHex)) return null;

    let commandAndDataHex = remainder.slice(8);
    if (commandAndDataHex.length === 0) return null;
    if (!/^[0-9a-fA-F]+$/.test(commandAndDataHex)) return null;

    if (commandAndDataHex.length % 2 !== 0) {
      commandAndDataHex = `0${commandAndDataHex}`;
    }

    const byteBuffer = Buffer.from(commandAndDataHex, 'hex');
    if (byteBuffer.length === 0) return null;

    const command = byteBuffer[0];
    const dataHigh = byteBuffer.length > 1 ? byteBuffer[1] : 0;
    const dataLow = byteBuffer.length > 2 ? byteBuffer[2] : 0;
    const extraBytes = byteBuffer.length > 3 ? byteBuffer.slice(3) : null;

    const timestamp = parseInt(timestampHex, 16);
    if (Number.isNaN(timestamp)) return null;
    const ts = new Date(timestamp * 1000).toISOString();

    const extraDataHex = extraBytes && extraBytes.length
      ? extraBytes.toString('hex')
      : undefined;

    const baseData = {
      craneId: `DM-${deviceId}`,
      deviceId,
      deviceType: 'DM',
      ts,
      commandType: getCommandType(command),
      command,
      commandHex: command.toString(16).padStart(2, '0'),
      dataHigh,
      dataLow,
      dataHighHex: dataHigh.toString(16).padStart(2, '0'),
      dataLowHex: dataLow.toString(16).padStart(2, '0'),
      crc: crcSection,
      extraDataHex,
      raw: payload
    };

    switch (command) {
      case 0x01: // Heartbeat
        return {
          ...baseData,
          commandType: 'heartbeat',
          util: 0,
          ut: 'OFF',
          ls1: 'OK',
          ls2: 'OK',
          ls3: 'OK',
          ls4: 'OK',
          load: 0,
          swl: 0
        };

      case 0x02: { // Event
        // According to documentation:
        // Bit 7 (UTIL): 0 = crane not under operation, 1 = crane under operation
        // This is a FLAG, not a percentage value
        const utilBit = (dataLow & 0x80) !== 0; // Bit 7
        const overloadBit = (dataLow & 0x40) !== 0; // Bit 6
        const blankBit = (dataLow & 0x20) !== 0; // Bit 5 (don't care)
        const testBit = (dataLow & 0x10) !== 0; // Bit 4
        const ls4Hit = (dataLow & 0x08) !== 0; // Bit 3
        const ls3Hit = (dataLow & 0x04) !== 0; // Bit 2
        const ls2Hit = (dataLow & 0x02) !== 0; // Bit 1
        const ls1Hit = (dataLow & 0x01) !== 0; // Bit 0

        return {
          ...baseData,
          commandType: 'event',
          // UTIL is a flag: 0 = idle, 1 = operating (not a percentage)
          util: utilBit ? 1 : 0,
          ut: utilBit ? 'ON' : 'OFF',
          overload: overloadBit,
          testMode: testBit,
          blankBit,
          ls1: ls1Hit ? 'HIT' : 'OK',
          ls2: ls2Hit ? 'HIT' : 'OK',
          ls3: ls3Hit ? 'HIT' : 'OK',
          ls4: ls4Hit ? 'HIT' : 'OK',
          load: 0,
          swl: 0
        };
      }

      case 0x03: { // Ticket
        const { parseTicketDataByte } = require('./ticketTypes');
        
        const ticketNumber = dataHigh & 0xFF;
        const ticketData = parseTicketDataByte(dataLow);
        
        return {
          ...baseData,
          commandType: 'ticket',
          ticketNumber,
          ticketType: ticketData.typeCode,
          ticketTypeInfo: ticketData.typeInfo,
          ticketStatus: ticketData.status,
          isTicketOpen: ticketData.isOpen,
          load: 0,
          swl: 0,
          ls1: 'UNKNOWN',
          ls2: 'UNKNOWN',
          ls3: 'UNKNOWN',
          ls4: 'UNKNOWN',
          util: 0,
          ut: 'UNKNOWN'
        };
      }

      case 0x04: { // Load
        const rawLoad = ((dataHigh & 0xFF) << 8) | (dataLow & 0xFF);
        const load = rawLoad / 10;
        return {
          ...baseData,
          commandType: 'load',
          load,
          rawLoad,
          swl: 0,
          ls1: 'UNKNOWN',
          ls2: 'UNKNOWN',
          ls3: 'UNKNOWN',
          ls4: 'UNKNOWN',
          util: 0,
          ut: 'UNKNOWN'
        };
      }

      default:
        return {
          ...baseData,
          commandType: `unknown_0x${command.toString(16).padStart(2, '0')}`,
          load: 0,
          swl: 0,
          ls1: 'UNKNOWN',
          ls2: 'UNKNOWN',
          ls3: 'UNKNOWN',
          ls4: 'UNKNOWN',
          util: 0,
          ut: 'UNKNOWN'
        };
    }
  } catch (error) {
    console.error('DRM3400 20-byte parsing error:', error.message);
    console.error('Payload:', payload);
    console.error('Stack:', error.stack);
    return null;
  }
}

/**
 * Parse DRM3400 Compact format: $DM + DID(6) + TS(8) + STATUS(4) + DATA(4)
 * Example: $DM123609f1bd5020000004C1
 * 
 * Packet Structure:
 * Byte 1-3:    $DM (Start of String + Device Type)
 * Bytes 4-9:   DID (Device ID - 6 hex chars)
 * Bytes 10-17: Timestamp (8 hex chars = 4 bytes, epoch time)
 * Bytes 18-21: StatusWord (4 hex chars = 2 bytes, bitmask)
 * Bytes 22-25: Data (4 hex chars = 2 bytes, load or additional data)
 * 
 * StatusWord bit mapping (from user explanation):
 * - Bit 0-3: LS4, LS3, LS2, LS1 (limit switches)
 * - Bit 4-5: Reserved
 * - Bit 6: OL (Overload)
 * - Bit 7: UTL (Utilization)
 * - Bit 8-15: Additional flags (TEST, BLK2, etc.)
 */
function parseDRM3400_CompactFormat(payload) {
  try {
    // Format: $DM123609f1bd5020000004C1
    // Minimum length: $DM(3) + DID(6) + TS(8) + STATUS(4) = 21 chars
    // Typical length: $DM(3) + DID(6) + TS(8) + STATUS(4) + DATA(4) = 25 chars
    
    if (!payload.startsWith('$DM')) {
      return null;
    }

    // Remove $DM prefix
    const dataSection = payload.substring(3); // Everything after $DM
    
    if (dataSection.length < 18) {
      return null; // Too short, not this format
    }

    // Extract components
    const deviceId = dataSection.substring(0, 6); // "123609" (6 hex chars)
    
    const timestampHex = dataSection.substring(6, 14); // "f1bd5020" (8 hex chars = 4 bytes)
    const timestamp = parseInt(timestampHex, 16);
    
    const statusWordHex = dataSection.substring(14, 18); // "0000" (4 hex chars = 2 bytes)
    const statusWord = parseInt(statusWordHex, 16);
    
    // Parse additional data if present (4 hex chars = 2 bytes)
    let dataHex = '';
    let rawLoad = null;
    let load = 0;
    if (dataSection.length >= 22) {
      dataHex = dataSection.substring(18, 22); // "04C1" (4 hex chars)
      rawLoad = parseInt(dataHex, 16);
      if (!Number.isNaN(rawLoad)) {
        load = rawLoad / 10;
      }
    }

    // Convert timestamp to ISO string
    const ts = new Date(timestamp * 1000).toISOString();

    // Decode StatusWord bits (2 bytes = 16 bits)
    // Based on user explanation: StatusWord 0x0000 means all OK
    // Bit mapping (LSB to MSB):
    // Bits 0-3: LS1, LS2, LS3, LS4 (limit switches, 0 = OK/RELEASED, 1 = HIT)
    // Bits 4-5: Reserved
    // Bit 6: OL (Overload, 0 = normal, 1 = overload)
    // Bit 7: UTL (Utilization, 0 = idle, 1 = working)
    // Bits 8-15: Additional flags (TEST, BLK2, etc.)
    
    const ls4Hit = (statusWord & 0x08) !== 0; // Bit 3
    const ls3Hit = (statusWord & 0x04) !== 0; // Bit 2
    const ls2Hit = (statusWord & 0x02) !== 0; // Bit 1
    const ls1Hit = (statusWord & 0x01) !== 0; // Bit 0
    const overloadBit = (statusWord & 0x40) !== 0; // Bit 6
    const utilBit = (statusWord & 0x80) !== 0; // Bit 7
    const testBit = (statusWord & 0x100) !== 0; // Bit 8 (TEST flag)
    const blk2Bit = (statusWord & 0x200) !== 0; // Bit 9 (BLK2 flag)

    return {
      craneId: `DM-${deviceId}`,
      deviceId,
      deviceType: 'DM',
      ts,
      commandType: 'telemetry',
      statusWord: `0x${statusWordHex.toUpperCase()}`,
      load: load || 0,
      rawLoad,
      swl: 100, // Default, will be updated from crane config
      ls1: ls1Hit ? 'HIT' : 'OK',
      ls2: ls2Hit ? 'HIT' : 'OK',
      ls3: ls3Hit ? 'HIT' : 'OK',
      ls4: ls4Hit ? 'HIT' : 'OK',
      // UTIL is a flag: 0 = idle, 1 = operating (not a percentage)
      util: utilBit ? 1 : 0,
      ut: utilBit ? 'ON' : 'OFF',
      overload: overloadBit,
      testMode: testBit,
      operatingMode: testBit ? 'test' : 'normal',
      blk2: blk2Bit,
      raw: payload
    };
  } catch (error) {
    console.error('DRM3400 Compact format parsing error:', error.message);
    console.error('Payload:', payload);
    return null;
  }
}

/**
 * Get human-readable command type
 */
function getCommandType(command) {
  const types = {
    0x01: 'heartbeat',
    0x02: 'event',
    0x03: 'ticket',
    0x04: 'load'
  };
  return types[command] || `unknown_0x${command.toString(16).padStart(2, '0')}`;
}

/** DRM3300 format parser: $DRM|deviceId|epochTime|mode|ls1|ls2|ls3|ls4|load|swl|util|trolleyPos|hookHeight|windSpeed|windDirection# */
function parseDRM3300Format(payload) {
  try {
    const content = payload.slice(5, -1); // remove "$DRM|" and trailing "#"
    const parts = content.split('|');
    if (parts.length < 11) {
      console.error('DRM3300 format: insufficient parts:', parts.length);
      return null;
    }

    const [
      deviceId,
      epochTime,
      mode,
      ls1,
      ls2,
      ls3,
      ls4,
      load,
      swl,
      util,
      trolleyPos,
      hookHeight,
      windSpeed,
      windDirection
    ] = parts;

    const ts = new Date(parseInt(epochTime, 10) * 1000).toISOString();

    return {
      craneId: deviceId.trim(),
      ts,
      load: parseFloat(load) || 0,
      swl: parseFloat(swl) || 0,
      ls1: ls1?.toUpperCase() || 'UNKNOWN',
      ls2: ls2?.toUpperCase() || 'UNKNOWN',
      ls3: ls3?.toUpperCase() || 'UNKNOWN',
      ls4: ls4?.toUpperCase() || 'UNKNOWN',
      util: parseFloat(util) || 0,
      operatingMode: mode === 'T' ? 'test' : mode === 'C' ? 'calibration' : 'normal',
      trolleyPos: trolleyPos != null ? parseFloat(trolleyPos) : undefined,
      hookHeight: hookHeight != null ? parseFloat(hookHeight) : undefined,
      windSpeed: windSpeed != null ? parseFloat(windSpeed) : undefined,
      windDirection: windDirection != null ? parseFloat(windDirection) : undefined,
      raw: payload
    };
  } catch (error) {
    console.error('Error parsing DRM3300 format:', error);
    return null;
  }
}

module.exports = {
  parseTelemetryPayload,
  validateTelemetryData,
  normalizeTelemetryData,
  parseDRM3300Format
};

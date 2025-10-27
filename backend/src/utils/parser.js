/**
 * Robust MQTT payload parser for crane telemetry data
 * Supports: DM, ET, HT formats and legacy formats
 */

/**
 * Parse telemetry payload from various formats
 * @param {string} payload - Raw MQTT payload string
 * @returns {Object|null} Parsed telemetry data or null if parsing fails
 */
function parseTelemetryPayload(payload) {
  if (!payload || typeof payload !== 'string') {
    return null;
  }

  const trimmedPayload = payload.trim();
  
  // Try DM format: $DM|deviceId|epochTime|switchStatus|load#
  if (trimmedPayload.startsWith('$DM|') && trimmedPayload.endsWith('#')) {
    return parseDMFormat(trimmedPayload);
  }
  
  // Try ET format: $ET|deviceId|epochTime|eventStatus|load#
  if (trimmedPayload.startsWith('$ET|') && trimmedPayload.endsWith('#')) {
    return parseETFormat(trimmedPayload);
  }
  
  // Try HT format: $HT|deviceId|epochTime|eventStatus|load#
  if (trimmedPayload.startsWith('$HT|') && trimmedPayload.endsWith('#')) {
    return parseHTFormat(trimmedPayload);
  }
  
  // Try JSON format
  if (trimmedPayload.startsWith('{') && trimmedPayload.endsWith('}')) {
    return parseJSONPayload(trimmedPayload);
  }
  
  // Try semicolon-delimited format
  if (trimmedPayload.includes(';')) {
    return parseSemicolonPayload(trimmedPayload);
  }
  
  // Try pipe-delimited format
  if (trimmedPayload.includes('|')) {
    return parsePipePayload(trimmedPayload);
  }
  
  // Try DRM3300 format: $DRM|deviceId|epochTime|mode|ls1|ls2|ls3|ls4|load|swl|util|trolleyPos|hookHeight|windSpeed|windDirection#
  if (trimmedPayload.startsWith('$DRM|') && trimmedPayload.endsWith('#')) {
    return parseDRM3300Format(trimmedPayload);
  }
  
  // Try GSM location format: $GSM|deviceId|epochTime|lat|lon|accuracy|ls1|ls2|ls3|ls4|load|swl|util#
  if (trimmedPayload.startsWith('$GSM|') && trimmedPayload.endsWith('#')) {
    return parseGSMFormat(trimmedPayload);
  }
  
  // Try GPS location format: $GPS|deviceId|epochTime|lat|lon|accuracy|ls1|ls2|ls3|ls4|load|swl|util#
  if (trimmedPayload.startsWith('$GPS|') && trimmedPayload.endsWith('#')) {
    return parseGPSFormat(trimmedPayload);
  }
  
  console.error('Unknown payload format:', payload);
  return null;
}

/**
 * Parse DM format: $DM|deviceId|epochTime|switchStatus|load#
 * @param {string} payload - DM format string
 * @returns {Object|null} Parsed data or null
 */
function parseDMFormat(payload) {
  try {
    // Remove $ and # delimiters
    const cleanPayload = payload.slice(1, -1);
    const parts = cleanPayload.split('|');
    
    if (parts.length !== 5) {
      throw new Error('Invalid DM format - expected 5 parts');
    }
    
    const [deviceType, deviceId, epochTime, switchStatus, load] = parts;
    
    // Parse switch status (hex value) to individual switches
    const switchStatusInt = parseInt(switchStatus, 16);
    const switches = parseSwitchStatus(switchStatusInt);
    
    return {
      craneId: `DM-${deviceId}`,
      deviceType: 'DM',
      deviceId: deviceId,
      ts: new Date(parseInt(epochTime) * 1000).toISOString(),
      load: parseFloat(load) || 0,
      swl: 100, // Default SWL, should be configured per crane
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
 * @param {string} payload - ET format string
 * @returns {Object|null} Parsed data or null
 */
function parseETFormat(payload) {
  try {
    const cleanPayload = payload.slice(1, -1);
    const parts = cleanPayload.split('|');
    
    if (parts.length !== 5) {
      throw new Error('Invalid ET format - expected 5 parts');
    }
    
    const [deviceType, deviceId, epochTime, eventStatus, load] = parts;
    
    return {
      craneId: `ET-${deviceId}`,
      deviceType: 'ET',
      deviceId: deviceId,
      ts: new Date(parseInt(epochTime) * 1000).toISOString(),
      load: parseFloat(load) || 0,
      swl: 100, // Default SWL
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
 * @param {string} payload - HT format string
 * @returns {Object|null} Parsed data or null
 */
function parseHTFormat(payload) {
  try {
    const cleanPayload = payload.slice(1, -1);
    const parts = cleanPayload.split('|');
    
    if (parts.length !== 5) {
      throw new Error('Invalid HT format - expected 5 parts');
    }
    
    const [deviceType, deviceId, epochTime, eventStatus, load] = parts;
    
    return {
      craneId: `HT-${deviceId}`,
      deviceType: 'HT',
      deviceId: deviceId,
      ts: new Date(parseInt(epochTime) * 1000).toISOString(),
      load: parseFloat(load) || 0,
      swl: 100, // Default SWL
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
 * Parse switch status from hex value
 * @param {number} status - Hex status value
 * @returns {Object} Parsed switch states
 */
function parseSwitchStatus(status) {
  return {
    power: (status & 0x80) !== 0,           // Bit 7
    ticket: (status & 0x40) !== 0,          // Bit 6  
    testMode: (status & 0x20) !== 0,        // Bit 5
    overload: (status & 0x10) !== 0,        // Bit 4
    ls1: (status & 0x08) !== 0 ? 'HIT' : 'OK',  // Bit 3
    ls2: (status & 0x04) !== 0 ? 'HIT' : 'OK',  // Bit 2
    ls3: (status & 0x02) !== 0 ? 'HIT' : 'OK',  // Bit 1
    ls4: (status & 0x01) !== 0 ? 'HIT' : 'OK',  // Bit 0
    utilization: (status & 0x01) !== 0,     // Bit 0
    heartbeat: status === 0xE0              // Special heartbeat value
  };
}

/**
 * Get event type from ET event status
 * @param {number} status - Event status value
 * @returns {string} Event type description
 */
function getEventType(status) {
  const eventTypes = {
    1: 'LT_ON',
    2: 'LT_OFF', 
    3: 'CT_ON',
    4: 'CT_OFF',
    5: 'LOAD'
  };
  return eventTypes[status] || 'UNKNOWN';
}

/**
 * Get hoist event type from HT event status
 * @param {number} status - Event status value
 * @returns {string} Event type description
 */
function getHoistEventType(status) {
  const eventTypes = {
    1: 'SW1_ON',
    2: 'SW1_OFF',
    3: 'SW2_ON', 
    4: 'SW2_OFF',
    5: 'LOAD'
  };
  return eventTypes[status] || 'UNKNOWN';
}

/**
 * Parse JSON format payload
 * @param {string} payload - JSON string
 * @returns {Object|null} Parsed data or null
 */
function parseJSONPayload(payload) {
  try {
    const data = JSON.parse(payload);
    
    return {
      craneId: data.id || data.craneId,
      ts: data.ts || data.timestamp,
      load: parseFloat(data.load) || 0,
      swl: parseFloat(data.swl) || 0,
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

/**
 * Parse semicolon-delimited format: TS=...;ID=...;LOAD=...;etc
 * @param {string} payload - Semicolon-delimited string
 * @returns {Object|null} Parsed data or null
 */
function parseSemicolonPayload(payload) {
  try {
    const pairs = payload.split(';');
    const data = {};
    
    pairs.forEach(pair => {
      const [key, value] = pair.split('=');
      if (key && value !== undefined) {
        data[key.trim()] = value.trim();
      }
    });
    
    return {
      craneId: data.ID,
      ts: data.TS,
      load: parseFloat(data.LOAD) || 0,
      swl: parseFloat(data.SWL) || 0,
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

/**
 * Parse pipe-delimited format: ID|TS|LOAD:value|SWL:value|etc
 * @param {string} payload - Pipe-delimited string
 * @returns {Object|null} Parsed data or null
 */
function parsePipePayload(payload) {
  try {
    const parts = payload.split('|');
    if (parts.length < 2) {
      throw new Error('Invalid pipe-delimited format');
    }
    
    const data = {
      craneId: parts[0].trim(),
      ts: parts[1].trim()
    };
    
    // Parse key:value pairs
    for (let i = 2; i < parts.length; i++) {
      const [key, value] = parts[i].split(':');
      if (key && value !== undefined) {
        data[key.trim()] = value.trim();
      }
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

/**
 * Validate parsed telemetry data
 * @param {Object} data - Parsed telemetry data
 * @returns {boolean} True if valid
 */
function validateTelemetryData(data) {
  if (!data || !data.craneId || !data.ts) {
    return false;
  }
  
  // Validate timestamp
  const timestamp = new Date(data.ts);
  if (isNaN(timestamp.getTime())) {
    return false;
  }
  
  // Validate numeric fields
  if (typeof data.load !== 'number' || data.load < 0) {
    return false;
  }
  
  if (typeof data.swl !== 'number' || data.swl <= 0) {
    return false;
  }
  
  if (typeof data.util !== 'number' || data.util < 0 || data.util > 100) {
    return false;
  }
  
  // Validate status fields - updated for new format
  const validStatuses = ['OK', 'FAIL', 'UNKNOWN', 'HIT', 'ON', 'OFF'];
  if (data.ls1 && !validStatuses.includes(data.ls1)) {
    return false;
  }
  if (data.ls2 && !validStatuses.includes(data.ls2)) {
    return false;
  }
  if (data.ls3 && !validStatuses.includes(data.ls3)) {
    return false;
  }
  if (data.ut && !validStatuses.includes(data.ut)) {
    return false;
  }
  
  return true;
}

/**
 * Parse DRM3300 format: $DRM|deviceId|epochTime|mode|ls1|ls2|ls3|ls4|load|swl|util|trolleyPos|hookHeight|windSpeed|windDirection#
 * @param {string} payload - DRM3300 format string
 * @returns {Object|null} Parsed data or null if invalid
 */
function parseDRM3300Format(payload) {
  try {
    // Remove $DRM and # wrapper
    const content = payload.slice(5, -1);
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
    
    // Convert epoch time to ISO string
    const timestamp = new Date(parseInt(epochTime) * 1000).toISOString();
    
    // Parse numeric values
    const parsedLoad = parseFloat(load) || 0;
    const parsedSwl = parseFloat(swl) || 0;
    const parsedUtil = parseFloat(util) || 0;
    const parsedTrolleyPos = parseFloat(trolleyPos) || 0;
    const parsedHookHeight = parseFloat(hookHeight) || 0;
    const parsedWindSpeed = parseFloat(windSpeed) || 0;
    const parsedWindDirection = parseFloat(windDirection) || 0;
    
    // Map mode to operating mode
    const operatingMode = mode === 'T' ? 'test' : mode === 'C' ? 'calibration' : 'normal';
    
    return {
      craneId: deviceId.trim(),
      ts: timestamp,
      load: parsedLoad,
      swl: parsedSwl,
      ls1: ls1?.toUpperCase() || 'UNKNOWN',
      ls2: ls2?.toUpperCase() || 'UNKNOWN',
      ls3: ls3?.toUpperCase() || 'UNKNOWN',
      ls4: ls4?.toUpperCase() || 'UNKNOWN',
      util: parsedUtil,
      operatingMode: operatingMode,
      trolleyPos: parsedTrolleyPos,
      hookHeight: parsedHookHeight,
      windSpeed: parsedWindSpeed,
      windDirection: parsedWindDirection,
      raw: payload
    };
    
  } catch (error) {
    console.error('Error parsing DRM3300 format:', error);
    return null;
  }
}

/**
 * Parse GSM location format: $GSM|deviceId|epochTime|lat|lon|accuracy|ls1|ls2|ls3|ls4|load|swl|util#
 * @param {string} payload - GSM format string
 * @returns {Object|null} Parsed data or null if invalid
 */
function parseGSMFormat(payload) {
  try {
    // Remove $GSM and # wrapper
    const content = payload.slice(5, -1);
    const parts = content.split('|');
    
    if (parts.length < 13) {
      console.error('GSM format: insufficient parts:', parts.length);
      return null;
    }
    
    const [
      deviceId,
      epochTime,
      lat,
      lon,
      accuracy,
      ls1,
      ls2,
      ls3,
      ls4,
      load,
      swl,
      util,
      windSpeed,
      windDirection
    ] = parts;
    
    // Convert epoch time to ISO string
    const timestamp = new Date(parseInt(epochTime) * 1000).toISOString();
    
    // Parse numeric values
    const parsedLat = parseFloat(lat);
    const parsedLon = parseFloat(lon);
    const parsedAccuracy = parseFloat(accuracy) || 100; // Default 100m accuracy for GSM
    const parsedLoad = parseFloat(load) || 0;
    const parsedSwl = parseFloat(swl) || 0;
    const parsedUtil = parseFloat(util) || 0;
    const parsedWindSpeed = parseFloat(windSpeed) || 0;
    const parsedWindDirection = parseFloat(windDirection) || 0;
    
    // Validate coordinates
    if (isNaN(parsedLat) || isNaN(parsedLon) || 
        parsedLat < -90 || parsedLat > 90 || 
        parsedLon < -180 || parsedLon > 180) {
      console.error('GSM format: invalid coordinates:', lat, lon);
      return null;
    }
    
    return {
      craneId: deviceId.trim(),
      ts: timestamp,
      load: parsedLoad,
      swl: parsedSwl,
      ls1: ls1?.toUpperCase() || 'UNKNOWN',
      ls2: ls2?.toUpperCase() || 'UNKNOWN',
      ls3: ls3?.toUpperCase() || 'UNKNOWN',
      ls4: ls4?.toUpperCase() || 'UNKNOWN',
      util: parsedUtil,
      windSpeed: parsedWindSpeed,
      windDirection: parsedWindDirection,
      // Location data
      locationData: {
        coordinates: [parsedLon, parsedLat], // GeoJSON format: [longitude, latitude]
        locationSource: 'gsm_triangulation',
        locationMethod: 'gsm',
        locationAccuracy: parsedAccuracy,
        city: null // Will be populated later if needed
      },
      raw: payload
    };
    
  } catch (error) {
    console.error('Error parsing GSM format:', error);
    return null;
  }
}

/**
 * Parse GPS location format: $GPS|deviceId|epochTime|lat|lon|accuracy|ls1|ls2|ls3|ls4|load|swl|util#
 * @param {string} payload - GPS format string
 * @returns {Object|null} Parsed data or null if invalid
 */
function parseGPSFormat(payload) {
  try {
    // Remove $GPS and # wrapper
    const content = payload.slice(5, -1);
    const parts = content.split('|');
    
    if (parts.length < 13) {
      console.error('GPS format: insufficient parts:', parts.length);
      return null;
    }
    
    const [
      deviceId,
      epochTime,
      lat,
      lon,
      accuracy,
      ls1,
      ls2,
      ls3,
      ls4,
      load,
      swl,
      util,
      windSpeed,
      windDirection
    ] = parts;
    
    // Convert epoch time to ISO string
    const timestamp = new Date(parseInt(epochTime) * 1000).toISOString();
    
    // Parse numeric values
    const parsedLat = parseFloat(lat);
    const parsedLon = parseFloat(lon);
    const parsedAccuracy = parseFloat(accuracy) || 5; // Default 5m accuracy for GPS
    const parsedLoad = parseFloat(load) || 0;
    const parsedSwl = parseFloat(swl) || 0;
    const parsedUtil = parseFloat(util) || 0;
    const parsedWindSpeed = parseFloat(windSpeed) || 0;
    const parsedWindDirection = parseFloat(windDirection) || 0;
    
    // Validate coordinates
    if (isNaN(parsedLat) || isNaN(parsedLon) || 
        parsedLat < -90 || parsedLat > 90 || 
        parsedLon < -180 || parsedLon > 180) {
      console.error('GPS format: invalid coordinates:', lat, lon);
      return null;
    }
    
    return {
      craneId: deviceId.trim(),
      ts: timestamp,
      load: parsedLoad,
      swl: parsedSwl,
      ls1: ls1?.toUpperCase() || 'UNKNOWN',
      ls2: ls2?.toUpperCase() || 'UNKNOWN',
      ls3: ls3?.toUpperCase() || 'UNKNOWN',
      ls4: ls4?.toUpperCase() || 'UNKNOWN',
      util: parsedUtil,
      windSpeed: parsedWindSpeed,
      windDirection: parsedWindDirection,
      // Location data
      locationData: {
        coordinates: [parsedLon, parsedLat], // GeoJSON format: [longitude, latitude]
        locationSource: 'gps_hardware',
        locationMethod: 'gps',
        locationAccuracy: parsedAccuracy,
        city: null // Will be populated later if needed
      },
      raw: payload
    };
    
  } catch (error) {
    console.error('Error parsing GPS format:', error);
    return null;
  }
}

/**
 * Normalize telemetry data to ensure consistent format
 * @param {Object} data - Parsed telemetry data
 * @returns {Object} Normalized data
 */
function normalizeTelemetryData(data) {
  return {
    craneId: data.craneId?.toString().trim().toUpperCase() || 'UNKNOWN',
    ts: data.ts?.toString().trim(),
    load: data.load != null ? Math.max(0, Math.round(data.load * 100) / 100) : 0,
    swl: data.swl != null ? Math.max(0, Math.round(data.swl * 100) / 100) : 0,
    ls1: data.ls1?.toString().toUpperCase() || 'UNKNOWN',
    ls2: data.ls2?.toString().toUpperCase() || 'UNKNOWN',
    ls3: data.ls3?.toString().toUpperCase() || 'UNKNOWN',
    ut: data.ut?.toString().toUpperCase() || 'UNKNOWN',
    util: data.util != null ? Math.max(0, Math.min(100, Math.round(data.util * 100) / 100)) : 0
  };
}

module.exports = {
  parseTelemetryPayload,
  validateTelemetryData,
  normalizeTelemetryData,
  parseDRM3300Format
};

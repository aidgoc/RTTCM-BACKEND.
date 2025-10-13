const mqtt = require('mqtt');
const { parseTelemetryPayload } = require('./utils/parser');
const Crane = require('./models/Crane');
const Telemetry = require('./models/Telemetry');
const Ticket = require('./models/Ticket');
const craneDiscovery = require('./middleware/craneDiscovery');

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
      process.env.TOPIC_TELEMETRY || 'crane/+/telemetry',
      process.env.TOPIC_STATUS || 'crane/+/status',
      process.env.TOPIC_LOCATION || 'crane/+/location',
      process.env.TOPIC_TEST || 'crane/+/test',
      process.env.TOPIC_ALARM || 'crane/+/alarm',
      process.env.TOPIC_HEARTBEAT || 'crane/+/heartbeat'
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
      const payload = message.toString();
      console.log(`Received MQTT message on ${topic}:`, payload);

      // Extract crane ID from topic
      const topicParts = topic.split('/');
      const craneId = topicParts[1];

      if (topic.includes('/telemetry')) {
        await this.processTelemetry(craneId, payload);
      } else if (topic.includes('/status')) {
        await this.processStatus(craneId, payload);
      } else if (topic.includes('/location')) {
        await this.processLocation(craneId, payload);
      } else if (topic.includes('/test')) {
        await this.processTest(craneId, payload);
      } else if (topic.includes('/alarm')) {
        await this.processAlarm(craneId, payload);
      } else if (topic.includes('/heartbeat')) {
        await this.processHeartbeat(craneId, payload);
      }
    } catch (error) {
      console.error('Error processing MQTT message:', error);
    }
  }

  async processTelemetry(craneId, payload) {
    try {
      // Parse the telemetry payload
      const telemetryData = parseTelemetryPayload(payload);
      
      if (!telemetryData) {
        console.error(`Failed to parse telemetry for crane ${craneId}:`, payload);
        return;
      }

      // Validate required fields
      if (!telemetryData.craneId || !telemetryData.ts) {
        console.error(`Invalid telemetry data for crane ${craneId}:`, telemetryData);
        return;
      }

      // Use crane discovery to find or create crane
      const discoveryResult = await craneDiscovery.discoverCrane(craneId, telemetryData);
      if (!discoveryResult) {
        console.error(`Failed to discover crane ${craneId}`);
        return;
      }

      const { crane, isNew, isPending } = discoveryResult;

      // If crane is pending, don't process telemetry yet
      if (isPending) {
        console.log(`⏳ Crane ${craneId} is pending approval, storing telemetry for later`);
        return;
      }

      // Create telemetry record
      const telemetry = new Telemetry({
        craneId: telemetryData.craneId,
        ts: new Date(telemetryData.ts),
        load: telemetryData.load || 0,
        swl: telemetryData.swl || 0,
        ls1: telemetryData.ls1 || 'UNKNOWN',
        ls2: telemetryData.ls2 || 'UNKNOWN',
        ls3: telemetryData.ls3 || 'UNKNOWN',
        ut: telemetryData.ut || 'UNKNOWN',
        util: telemetryData.util || 0,
        raw: JSON.stringify({
          ...JSON.parse(payload || '{}'),
          windSpeed: telemetryData.windSpeed || 0,
          windDirection: telemetryData.windDirection || 0,
          temperature: telemetryData.temperature || 0,
          humidity: telemetryData.humidity || 0,
          locationData: telemetryData.locationData || null
        })
      });

      await telemetry.save();

      // Update crane's last seen and status
      await this.updateCraneStatus(craneId, telemetryData);

      // Check for alerts and create tickets
      await this.checkAlerts(craneId, telemetryData);

      // Emit WebSocket event
      const io = require('./index').get('io');
      if (io) {
        io.emit(`telemetry:${craneId}`, {
          craneId,
          data: telemetryData,
          timestamp: new Date()
        });
      }

      console.log(`Processed telemetry for crane ${craneId}`);
    } catch (error) {
      console.error(`Error processing telemetry for crane ${craneId}:`, error);
    }
  }

  async processStatus(craneId, payload) {
    try {
      // Parse status payload (similar to telemetry but for status updates)
      const statusData = parseTelemetryPayload(payload);
      
      if (!statusData) {
        console.error(`Failed to parse status for crane ${craneId}:`, payload);
        return;
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
      const updateData = {
        lastSeen: new Date(),
        online: true,
        lastStatusRaw: data
      };

      await Crane.findOneAndUpdate(
        { craneId },
        updateData,
        { upsert: false }
      );
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

  async processLocation(craneId, payload) {
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

  async processTest(craneId, payload) {
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

  async processAlarm(craneId, payload) {
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

  async processHeartbeat(craneId, payload) {
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

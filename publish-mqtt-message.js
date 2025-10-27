/**
 * Direct MQTT Message Publisher
 * 
 * This script publishes messages directly to the MQTT broker
 * without going through the API.
 * 
 * Usage:
 * node publish-mqtt-message.js [craneId] [messageType] [message]
 * 
 * Examples:
 * node publish-mqtt-message.js TC101 command '{"action":"start_test"}'
 * node publish-mqtt-message.js TC102 settings '{"swl":5000}'
 */

require('dotenv').config();
const mqtt = require('mqtt');

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Get command line arguments
const args = process.argv.slice(2);

if (args.length < 3) {
  console.log('\n📚 Usage:');
  console.log('  node publish-mqtt-message.js [craneId] [messageType] [message]');
  console.log('\n📝 Examples:');
  console.log('  node publish-mqtt-message.js TC101 command \'{"action":"start_test"}\'');
  console.log('  node publish-mqtt-message.js TC102 settings \'{"swl":5000}\'');
  console.log('  node publish-mqtt-message.js TC101 alarm \'{"type":"overload","severity":"critical"}\'');
  console.log('\n💡 Common message types:');
  console.log('  - command   : Send commands to the crane');
  console.log('  - settings  : Update crane settings');
  console.log('  - alarm     : Trigger alarms');
  console.log('  - config    : Update configuration');
  console.log('  - reset     : Reset commands');
  process.exit(1);
}

const [craneId, messageType, messageContent] = args;

// Parse message content (try JSON first, fallback to string)
let message;
try {
  message = JSON.parse(messageContent);
} catch (e) {
  message = messageContent;
}

// Construct topic
const topic = `crane/${craneId}/${messageType}`;

// Prepare payload
const payload = typeof message === 'string' ? message : JSON.stringify(message);

log('\n═══════════════════════════════════════', 'cyan');
log('  📤 MQTT Message Publisher', 'cyan');
log('═══════════════════════════════════════', 'cyan');

log(`\n📍 Broker: ${process.env.MQTT_BROKER_URL || 'Not configured'}`, 'blue');
log(`📋 Topic:  ${topic}`, 'blue');
log(`📦 Message:`, 'blue');
console.log(typeof message === 'object' ? JSON.stringify(message, null, 2) : message);

// Connect to MQTT broker
const mqttUrl = process.env.MQTT_BROKER_URL;

if (!mqttUrl) {
  log('\n❌ Error: MQTT_BROKER_URL not configured in .env file', 'red');
  process.exit(1);
}

const options = {
  username: process.env.MQTT_USERNAME || '',
  password: process.env.MQTT_PASSWORD || '',
  reconnectPeriod: 0,
  connectTimeout: 10000,
  keepalive: 60,
  clean: true
};

log('\n🔌 Connecting to MQTT broker...', 'yellow');

const client = mqtt.connect(mqttUrl, options);

let connectionTimeout = setTimeout(() => {
  log('❌ Connection timeout - could not connect to MQTT broker', 'red');
  log('   Check your MQTT broker configuration and network', 'red');
  client.end();
  process.exit(1);
}, 10000);

client.on('connect', () => {
  clearTimeout(connectionTimeout);
  log('✅ Connected to MQTT broker', 'green');
  
  log('\n📤 Publishing message...', 'yellow');
  
  client.publish(topic, payload, { qos: 0, retain: false }, (err) => {
    if (err) {
      log(`❌ Publish failed: ${err.message}`, 'red');
      client.end();
      process.exit(1);
    } else {
      log('✅ Message published successfully!', 'green');
      
      log('\n💡 To monitor this topic:', 'cyan');
      log(`   mosquitto_sub -h localhost -t "${topic}"`, 'blue');
      
      // Close connection after publishing
      setTimeout(() => {
        client.end();
        process.exit(0);
      }, 500);
    }
  });
});

client.on('error', (error) => {
  clearTimeout(connectionTimeout);
  log(`❌ MQTT Error: ${error.message}`, 'red');
  client.end();
  process.exit(1);
});

// Common message templates
const TEMPLATES = {
  startTest: {
    action: 'start_test',
    testType: 'limit_switch',
    parameters: {
      ls1: true,
      ls2: true,
      ls3: true,
      ls4: true
    }
  },
  
  emergencyStop: {
    action: 'emergency_stop',
    reason: 'Manual override',
    timestamp: new Date().toISOString()
  },
  
  updateSettings: {
    reportingInterval: 5000,
    windSpeedThreshold: 50,
    autoShutdownEnabled: true
  },
  
  requestStatus: {
    action: 'request_status',
    includeDetails: true
  }
};


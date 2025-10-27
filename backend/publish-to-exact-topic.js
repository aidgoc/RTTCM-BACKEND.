/**
 * Publish to Exact MQTT Topic
 * 
 * This script publishes to the EXACT topic you specify.
 * Use this to send data back to the same topics your crane is subscribed to.
 * 
 * Usage:
 * node publish-to-exact-topic.js [exact-topic] [message]
 * 
 * Examples:
 * node publish-to-exact-topic.js "crane/TC101/command" '{"action":"start_test"}'
 * node publish-to-exact-topic.js "crane/TC101/settings" '{"swl":5000}'
 * node publish-to-exact-topic.js "your/custom/topic" '{"data":"anything"}'
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

if (args.length < 2) {
  console.log('\n📚 Usage:');
  console.log('  node publish-to-exact-topic.js [exact-topic] [message]');
  console.log('\n📝 Examples:');
  console.log('  node publish-to-exact-topic.js "crane/TC101/command" \'{"action":"start_test"}\'');
  console.log('  node publish-to-exact-topic.js "crane/TC101/settings" \'{"swl":5000}\'');
  console.log('  node publish-to-exact-topic.js "device/TC101/cmd" \'{"cmd":"reset"}\'');
  console.log('\n💡 Common topics your crane might be subscribed to:');
  console.log('  - crane/TC101/command');
  console.log('  - crane/TC101/settings');
  console.log('  - crane/TC101/config');
  console.log('  - crane/TC101/cmd');
  console.log('  - device/TC101/downlink');
  process.exit(1);
}

const [exactTopic, messageContent] = args;

// Parse message content (try JSON first, fallback to string)
let message;
try {
  message = JSON.parse(messageContent);
} catch (e) {
  message = messageContent;
}

// Prepare payload
const payload = typeof message === 'string' ? message : JSON.stringify(message);

log('\n═══════════════════════════════════════', 'cyan');
log('  📤 Publish to Exact Topic', 'cyan');
log('═══════════════════════════════════════', 'cyan');

log(`\n📍 Broker: ${process.env.MQTT_BROKER_URL || 'Not configured'}`, 'blue');
log(`📋 Exact Topic: ${exactTopic}`, 'green');
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
  
  client.publish(exactTopic, payload, { qos: 0, retain: false }, (err) => {
    if (err) {
      log(`❌ Publish failed: ${err.message}`, 'red');
      client.end();
      process.exit(1);
    } else {
      log('✅ Message published successfully!', 'green');
      log(`✅ Published to: ${exactTopic}`, 'cyan');
      
      log('\n💡 To monitor this exact topic:', 'cyan');
      log(`   mosquitto_sub -h localhost -t "${exactTopic}"`, 'blue');
      
      log('\n💡 To monitor if crane received it:', 'cyan');
      log('   Check your crane/device logs or use MQTT Explorer', 'blue');
      
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


/**
 * MQTT Command Monitor
 * 
 * This script monitors command topics on the MQTT broker
 * to see messages being published to cranes.
 * 
 * Usage:
 * node monitor-mqtt-commands.js [craneId]
 * 
 * Examples:
 * node monitor-mqtt-commands.js           # Monitor all cranes
 * node monitor-mqtt-commands.js TC101     # Monitor only TC101
 */

require('dotenv').config();
const mqtt = require('mqtt');

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function formatTimestamp() {
  return new Date().toLocaleTimeString();
}

// Get crane ID from command line (optional)
const args = process.argv.slice(2);
const specificCraneId = args[0];

// Construct topic pattern
const commandTopics = specificCraneId 
  ? [
      `crane/${specificCraneId}/command`,
      `crane/${specificCraneId}/settings`,
      `crane/${specificCraneId}/config`,
      `crane/${specificCraneId}/reset`,
      `crane/${specificCraneId}/alarm`
    ]
  : [
      'crane/+/command',
      'crane/+/settings',
      'crane/+/config',
      'crane/+/reset',
      'crane/+/alarm',
      'crane/all/+' // Broadcast messages
    ];

log('\n═══════════════════════════════════════', 'cyan');
log('  📡 MQTT Command Monitor', 'cyan');
log('═══════════════════════════════════════', 'cyan');

log(`\n📍 Broker: ${process.env.MQTT_BROKER_URL || 'Not configured'}`, 'blue');
log(`🎯 Monitoring: ${specificCraneId || 'All cranes'}`, 'blue');
log('\n📋 Subscribed topics:', 'blue');
commandTopics.forEach(topic => log(`   - ${topic}`, 'cyan'));

// Connect to MQTT broker
const mqttUrl = process.env.MQTT_BROKER_URL;

if (!mqttUrl) {
  log('\n❌ Error: MQTT_BROKER_URL not configured in .env file', 'red');
  log('   Add MQTT_BROKER_URL to your .env file', 'yellow');
  process.exit(1);
}

const options = {
  username: process.env.MQTT_USERNAME || '',
  password: process.env.MQTT_PASSWORD || '',
  reconnectPeriod: 5000,
  connectTimeout: 10000,
  keepalive: 60,
  clean: true
};

log('\n🔌 Connecting to MQTT broker...', 'yellow');

const client = mqtt.connect(mqttUrl, options);

let messageCount = 0;

client.on('connect', () => {
  log('✅ Connected to MQTT broker', 'green');
  
  // Subscribe to command topics
  commandTopics.forEach(topic => {
    client.subscribe(topic, (err) => {
      if (err) {
        log(`❌ Failed to subscribe to ${topic}`, 'red');
      } else {
        log(`📥 Subscribed to ${topic}`, 'green');
      }
    });
  });
  
  log('\n👂 Listening for messages... (Press Ctrl+C to stop)', 'bright');
  log('═══════════════════════════════════════\n', 'cyan');
});

client.on('message', (topic, message) => {
  messageCount++;
  
  const timestamp = formatTimestamp();
  const payload = message.toString();
  
  // Extract crane ID and message type from topic
  const topicParts = topic.split('/');
  const craneId = topicParts[1];
  const messageType = topicParts[2];
  
  // Parse message if it's JSON
  let parsedMessage;
  try {
    parsedMessage = JSON.parse(payload);
  } catch (e) {
    parsedMessage = payload;
  }
  
  // Display message with colors
  log(`\n📨 Message #${messageCount} [${timestamp}]`, 'bright');
  log(`   🏗️  Crane:   ${craneId}`, 'cyan');
  log(`   📋 Type:    ${messageType}`, 'yellow');
  log(`   📦 Payload:`, 'blue');
  
  if (typeof parsedMessage === 'object') {
    console.log(JSON.stringify(parsedMessage, null, 2));
  } else {
    console.log(`   ${parsedMessage}`);
  }
  
  log('─────────────────────────────────────', 'cyan');
});

client.on('error', (error) => {
  log(`❌ MQTT Error: ${error.message}`, 'red');
});

client.on('close', () => {
  log('\n🔌 Connection closed', 'yellow');
});

client.on('reconnect', () => {
  log('\n🔄 Reconnecting to MQTT broker...', 'yellow');
});

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  log('\n\n📊 Summary:', 'bright');
  log(`   Total messages received: ${messageCount}`, 'green');
  log('\n👋 Disconnecting...', 'yellow');
  
  client.end();
  process.exit(0);
});

// Display tips after 2 seconds
setTimeout(() => {
  if (messageCount === 0) {
    log('\n💡 Tip: No messages received yet.', 'cyan');
    log('   Try publishing a message using:', 'cyan');
    log(`   node publish-mqtt-message.js ${specificCraneId || 'TC101'} command '{"action":"test"}'`, 'blue');
  }
}, 2000);


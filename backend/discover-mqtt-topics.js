/**
 * MQTT Topic Discovery
 * 
 * This script helps you discover what topics are active in your MQTT broker.
 * Run this to see what topics your crane might be publishing/subscribing to.
 * 
 * Usage:
 * node discover-mqtt-topics.js
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

log('\n═══════════════════════════════════════', 'cyan');
log('  🔍 MQTT Topic Discovery', 'cyan');
log('═══════════════════════════════════════', 'cyan');

log(`\n📍 Broker: ${process.env.MQTT_BROKER_URL || 'Not configured'}`, 'blue');

// Connect to MQTT broker
const mqttUrl = process.env.MQTT_BROKER_URL;

if (!mqttUrl) {
  log('\n❌ Error: MQTT_BROKER_URL not configured in .env file', 'red');
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

const discoveredTopics = new Map();
let messageCount = 0;

client.on('connect', () => {
  log('✅ Connected to MQTT broker', 'green');
  
  // Subscribe to ALL topics using the wildcard
  client.subscribe('#', (err) => {
    if (err) {
      log('❌ Failed to subscribe to all topics', 'red');
      process.exit(1);
    } else {
      log('📥 Subscribed to ALL topics (#)', 'green');
      log('\n👂 Listening for all messages... (Press Ctrl+C to stop)', 'bright');
      log('═══════════════════════════════════════\n', 'cyan');
    }
  });
});

client.on('message', (topic, message) => {
  messageCount++;
  
  const timestamp = formatTimestamp();
  const payload = message.toString();
  
  // Track discovered topics
  if (!discoveredTopics.has(topic)) {
    discoveredTopics.set(topic, {
      firstSeen: new Date(),
      count: 0,
      lastMessage: null
    });
    
    log(`🆕 NEW TOPIC DISCOVERED: ${topic}`, 'green');
  }
  
  const topicInfo = discoveredTopics.get(topic);
  topicInfo.count++;
  topicInfo.lastMessage = payload.substring(0, 100); // First 100 chars
  
  // Parse message if it's JSON
  let parsedMessage;
  try {
    parsedMessage = JSON.parse(payload);
  } catch (e) {
    parsedMessage = payload;
  }
  
  // Display message
  log(`\n📨 Message #${messageCount} [${timestamp}]`, 'bright');
  log(`   📋 Topic: ${topic}`, 'cyan');
  log(`   📦 Payload (preview):`, 'blue');
  
  if (typeof parsedMessage === 'object') {
    const preview = JSON.stringify(parsedMessage, null, 2);
    console.log(preview.substring(0, 200) + (preview.length > 200 ? '...' : ''));
  } else {
    console.log(`   ${payload.substring(0, 100)}${payload.length > 100 ? '...' : ''}`);
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
  log('\n\n═══════════════════════════════════════', 'bright');
  log('  📊 Discovery Summary', 'bright');
  log('═══════════════════════════════════════', 'bright');
  
  log(`\n✅ Total messages received: ${messageCount}`, 'green');
  log(`✅ Unique topics discovered: ${discoveredTopics.size}`, 'green');
  
  if (discoveredTopics.size > 0) {
    log('\n📋 All Discovered Topics:', 'cyan');
    
    const sortedTopics = Array.from(discoveredTopics.entries())
      .sort((a, b) => b[1].count - a[1].count);
    
    sortedTopics.forEach(([topic, info], index) => {
      log(`\n${index + 1}. ${topic}`, 'yellow');
      log(`   Messages: ${info.count}`, 'blue');
      log(`   First seen: ${info.firstSeen.toLocaleTimeString()}`, 'blue');
      if (info.lastMessage) {
        log(`   Last message: ${info.lastMessage.substring(0, 60)}...`, 'blue');
      }
    });
    
    log('\n\n💡 To publish to these topics:', 'cyan');
    log('   node publish-to-exact-topic.js "TOPIC_NAME" \'{"your":"message"}\'', 'blue');
    
    log('\n💡 Example:', 'cyan');
    if (sortedTopics.length > 0) {
      const exampleTopic = sortedTopics[0][0];
      log(`   node publish-to-exact-topic.js "${exampleTopic}" '{"action":"test"}'`, 'green');
    }
  } else {
    log('\n⚠️  No topics discovered yet', 'yellow');
    log('   Make sure your crane/device is publishing data', 'yellow');
  }
  
  log('\n👋 Disconnecting...', 'yellow');
  client.end();
  process.exit(0);
});

// Display tips after 5 seconds
setTimeout(() => {
  if (discoveredTopics.size === 0) {
    log('\n💡 Tip: No messages received yet.', 'cyan');
    log('   Make sure your crane/device is connected and publishing data.', 'cyan');
    log('   You can also test by publishing a message in another terminal:', 'cyan');
    log('   mosquitto_pub -h localhost -t "test/topic" -m "hello"', 'blue');
  }
}, 5000);


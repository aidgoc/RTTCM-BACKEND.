#!/usr/bin/env node
/**
 * Comprehensive MQTT Diagnostic Tool
 * 
 * This script checks for common issues preventing MQTT message reception:
 * 1. Connection status
 * 2. Subscription verification
 * 3. Topic pattern matching
 * 4. Network connectivity
 * 5. Authentication issues
 * 6. Broker ACL restrictions
 */

require('dotenv').config();
const mqtt = require('mqtt');

console.log('🔍 MQTT Diagnostic Tool - Checking for Common Issues\n');
console.log('═'.repeat(60));

// Configuration from environment
const MQTT_BROKER_URL = process.env.MQTT_BROKER_URL;
const MQTT_USERNAME = process.env.MQTT_USERNAME || '';
const MQTT_PASSWORD = process.env.MQTT_PASSWORD || '';

// Topics from environment (matching your app's subscriptions)
const topics = [
  process.env.TOPIC || "868019064209266/1",
  process.env.TOPIC_TELEMETRY || 'company/+/crane/+/telemetry',
  process.env.TOPIC_STATUS || 'company/+/crane/+/status',
  process.env.TOPIC_LOCATION || 'company/+/crane/+/location',
  process.env.TOPIC_TEST || 'company/+/crane/+/test',
  process.env.TOPIC_ALARM || 'company/+/crane/+/alarm',
  process.env.TOPIC_HEARTBEAT || 'company/+/crane/+/heartbeat'
];

// Diagnostic results
const diagnostics = {
  connection: false,
  subscriptions: [],
  messages: [],
  errors: [],
  warnings: []
};

let messageCount = 0;
let startTime = Date.now();
let subscribedTopics = [];

// Step 1: Check Configuration
console.log('\n📋 Step 1: Checking Configuration...');
if (!MQTT_BROKER_URL) {
  diagnostics.errors.push('MQTT_BROKER_URL not configured in .env file');
  console.log('❌ MQTT_BROKER_URL: Not configured');
} else {
  console.log(`✅ MQTT_BROKER_URL: ${MQTT_BROKER_URL}`);
}

if (MQTT_USERNAME) {
  console.log(`✅ MQTT_USERNAME: ${MQTT_USERNAME} (configured)`);
} else {
  console.log(`⚠️  MQTT_USERNAME: Not configured (using anonymous)`);
  diagnostics.warnings.push('Using anonymous connection - may not have topic access');
}

console.log(`✅ Topics to subscribe: ${topics.length}`);
topics.forEach(t => console.log(`   - ${t}`));

// Step 2: Connect to Broker
console.log('\n🔌 Step 2: Connecting to Broker...');
const clientId = `diagnostic-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
console.log(`   Client ID: ${clientId}`);

const options = {
  clientId,
  username: MQTT_USERNAME || undefined,
  password: MQTT_PASSWORD || undefined,
  clean: true,
  connectTimeout: 10000,
  keepalive: 60,
  reconnectPeriod: 0 // Disable auto-reconnect for diagnostics
};

// Remove undefined auth
if (!MQTT_USERNAME) {
  delete options.username;
  delete options.password;
}

const client = mqtt.connect(MQTT_BROKER_URL, options);

// Connection timeout
const connectionTimeout = setTimeout(() => {
  if (!diagnostics.connection) {
    diagnostics.errors.push('Connection timeout - broker not responding');
    console.log('❌ Connection timeout after 10 seconds');
    console.log('\n🔍 Possible Issues:');
    console.log('   1. Broker is down or unreachable');
    console.log('   2. Network connectivity issue');
    console.log('   3. Firewall blocking connection');
    console.log('   4. Wrong broker URL');
    console.log('   5. Authentication failed (check username/password)');
    process.exit(1);
  }
}, 10000);

// Connection handlers
client.on('connect', (packet) => {
  clearTimeout(connectionTimeout);
  diagnostics.connection = true;
  console.log('✅ Connected to MQTT broker successfully!');
  console.log(`   Connection ACK: ${packet.returnCode || 'OK'}`);
  
  // Step 3: Subscribe to Topics
  console.log('\n📡 Step 3: Subscribing to Topics...');
  topics.forEach((topic, index) => {
    client.subscribe(topic, { qos: 1 }, (err, granted) => {
      if (err) {
        diagnostics.errors.push(`Failed to subscribe to ${topic}: ${err.message}`);
        console.log(`❌ ${topic}: ${err.message}`);
      } else {
        const grantedQoS = granted?.[0]?.qos ?? 'N/A';
        diagnostics.subscriptions.push({ topic, qos: grantedQoS, success: true });
        subscribedTopics.push(topic);
        console.log(`✅ ${topic} (QoS: ${grantedQoS})`);
      }
      
      // After all subscriptions, start diagnostics
      if (index === topics.length - 1) {
        setTimeout(() => {
          console.log('\n📊 Step 4: Diagnostic Summary...');
          showDiagnostics();
          
          console.log('\n👂 Step 5: Listening for Messages...');
          console.log('   (This will run for 60 seconds to detect messages)');
          console.log('   Press Ctrl+C to stop early\n');
          console.log('─'.repeat(60));
          
          // Also subscribe to ALL topics to see what's actually being published
          console.log('\n🔍 Bonus: Also subscribing to ALL topics (#) to see what\'s published...');
          client.subscribe('#', { qos: 1 }, (err) => {
            if (!err) {
              console.log('✅ Subscribed to # (all topics)');
            }
          });
        }, 1000);
      }
    });
  });
});

// Message handler
client.on('message', (topic, message, packet) => {
  messageCount++;
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  
  diagnostics.messages.push({
    topic,
    timestamp: new Date().toISOString(),
    size: message.length,
    qos: packet?.qos,
    retain: packet?.retain
  });
  
  console.log(`\n📨 [${elapsed}s] Message #${messageCount}`);
  console.log(`   Topic: ${topic}`);
  console.log(`   Size: ${message.length} bytes`);
  console.log(`   QoS: ${packet?.qos ?? 'N/A'}, Retain: ${packet?.retain ?? 'N/A'}`);
  
  // Check if topic matches any of our subscriptions
  const matchesSubscription = subscribedTopics.some(sub => {
    // Simple wildcard matching check
    if (sub === '#') return true;
    if (sub === topic) return true;
    
    // Wildcard pattern matching
    const pattern = sub
      .replace(/\//g, '\\/')
      .replace(/\+/g, '[^/]+')
      .replace(/#/g, '.*');
    const regex = new RegExp(`^${pattern}$`);
    return regex.test(topic);
  });
  
  if (!matchesSubscription && sub !== '#') {
    console.log(`   ⚠️  WARNING: Topic doesn't match any subscription pattern!`);
    diagnostics.warnings.push(`Received message on unmatched topic: ${topic}`);
  } else {
    console.log(`   ✅ Topic matches subscription pattern`);
  }
  
  // Preview message content
  try {
    const preview = message.toString().substring(0, 100);
    console.log(`   Preview: ${preview}${message.length > 100 ? '...' : ''}`);
  } catch (e) {
    console.log(`   Preview: [Binary data - ${message.length} bytes]`);
  }
  
  console.log('─'.repeat(60));
});

// Error handlers
client.on('error', (error) => {
  diagnostics.errors.push(error.message);
  console.error(`\n❌ MQTT Error: ${error.message}`);
});

client.on('close', () => {
  console.log('\n🔌 Connection closed');
});

client.on('offline', () => {
  console.log('\n📡 Client went offline');
  diagnostics.warnings.push('Client went offline - connection lost');
});

// Packet monitoring
client.on('packetsend', (packet) => {
  // Uncomment for verbose debugging
  // console.log('📤 SEND:', packet.cmd);
});

client.on('packetreceive', (packet) => {
  // Uncomment for verbose debugging
  // console.log('📥 RECV:', packet.cmd);
});

// Show diagnostics summary
function showDiagnostics() {
  console.log('\n📊 Diagnostic Results:');
  console.log('═'.repeat(60));
  
  console.log(`\n✅ Connection: ${diagnostics.connection ? 'SUCCESS' : 'FAILED'}`);
  console.log(`✅ Subscriptions: ${diagnostics.subscriptions.length}/${topics.length} successful`);
  
  if (diagnostics.errors.length > 0) {
    console.log(`\n❌ Errors (${diagnostics.errors.length}):`);
    diagnostics.errors.forEach(err => console.log(`   - ${err}`));
  }
  
  if (diagnostics.warnings.length > 0) {
    console.log(`\n⚠️  Warnings (${diagnostics.warnings.length}):`);
    diagnostics.warnings.forEach(warn => console.log(`   - ${warn}`));
  }
  
  console.log('\n💡 Next Steps:');
  if (!diagnostics.connection) {
    console.log('   1. Check if broker is running');
    console.log('   2. Verify network connectivity');
    console.log('   3. Check firewall rules');
    console.log('   4. Verify MQTT_BROKER_URL is correct');
  } else if (diagnostics.subscriptions.length < topics.length) {
    console.log('   1. Check broker ACL (Access Control List)');
    console.log('   2. Verify topic permissions');
    console.log('   3. Check authentication credentials');
  } else if (messageCount === 0) {
    console.log('   1. Verify device is actually publishing messages');
    console.log('   2. Check if topic names match (case-sensitive)');
    console.log('   3. Check broker logs for delivery attempts');
    console.log('   4. Test with: mosquitto_pub to publish test messages');
  } else {
    console.log('   ✅ Messages are being received!');
    console.log('   If your app still doesn\'t receive them, check app logs');
  }
}

// Run for 60 seconds, then show final summary
const runTimeout = setTimeout(() => {
  console.log('\n\n⏱️  60 seconds elapsed - Final Summary:');
  showDiagnostics();
  
  console.log(`\n📨 Total messages received: ${messageCount}`);
  if (messageCount === 0) {
    console.log('\n❌ NO MESSAGES RECEIVED during test period');
    console.log('\n🔍 Likely Causes:');
    console.log('   1. Device is not publishing messages');
    console.log('   2. Topic names don\'t match');
    console.log('   3. Broker ACL preventing delivery');
    console.log('   4. Messages published before subscription');
    console.log('   5. Network/firewall blocking message delivery');
  }
  
  client.end();
  process.exit(0);
}, 60000);

// Graceful shutdown
process.on('SIGINT', () => {
  clearTimeout(runTimeout);
  console.log('\n\n🛑 Interrupted - Final Summary:');
  showDiagnostics();
  console.log(`\n📨 Total messages received: ${messageCount}`);
  client.end();
  process.exit(0);
});

// Keep script running
console.log('⏳ Starting diagnostic checks...');


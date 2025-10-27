const mqtt = require('mqtt');

// Connect to the same broker your application is using
const MQTT_BROKER_URL = 'mqtt://broker.emqx.io:1883';
const MQTT_TOPICS = [
  'crane/+/telemetry',  // All crane telemetry
  'crane/+/status',     // All crane status
  'crane/telemetry',    // General telemetry
  'crane/status',       // General status
  'crane/alerts',       // Alerts
  'telemetry',          // Direct telemetry
  'status',             // Direct status
  'alerts'              // Direct alerts
];

console.log('🔌 Monitoring MQTT Data from broker.emqx.io...');
console.log('📡 Broker: mqtt://broker.emqx.io:1883');
console.log('👂 Listening for crane telemetry data...\n');

// Connect to MQTT broker
const client = mqtt.connect(MQTT_BROKER_URL, {
  clientId: 'monitor-client-' + Math.random().toString(16).substr(2, 8),
  clean: true,
  connectTimeout: 10000,
  reconnectPeriod: 5000,
});

let messageCount = 0;
let startTime = Date.now();

// Connection event handlers
client.on('connect', () => {
  console.log('✅ Connected to MQTT broker successfully!');
  console.log('📡 Subscribing to topics...\n');
  
  // Subscribe to all topics
  MQTT_TOPICS.forEach(topic => {
    client.subscribe(topic, (err) => {
      if (err) {
        console.log(`❌ Failed to subscribe to ${topic}:`, err.message);
      } else {
        console.log(`✅ Subscribed to ${topic}`);
      }
    });
  });
  
  console.log('\n👂 Listening for messages...');
  console.log('💡 If you see crane telemetry data below, your MQTT system is working!');
  console.log('🛑 Press Ctrl+C to stop\n');
  console.log('─'.repeat(60));
});

client.on('message', (topic, message) => {
  messageCount++;
  const timestamp = new Date().toISOString();
  const elapsed = Math.round((Date.now() - startTime) / 1000);
  
  console.log(`\n📨 Message #${messageCount} [${elapsed}s]`);
  console.log(`📡 Topic: ${topic}`);
  
  try {
    // Try to parse as JSON first
    const data = JSON.parse(message.toString());
    console.log('📊 Data (JSON):', JSON.stringify(data, null, 2));
    
    // Check if it looks like crane telemetry
    if (data.craneId || data.load || data.swl) {
      console.log('🏗️  CRANE TELEMETRY DETECTED!');
      console.log(`   Crane ID: ${data.craneId || 'Unknown'}`);
      console.log(`   Load: ${data.load || 'N/A'} kg`);
      console.log(`   SWL: ${data.swl || 'N/A'} kg`);
      console.log(`   Status: ${data.ls1 || 'N/A'}, ${data.ls2 || 'N/A'}, ${data.ls3 || 'N/A'}`);
    }
  } catch (error) {
    // If not JSON, display as string
    console.log('📊 Data (String):', message.toString());
    
    // Check if it looks like telemetry data
    if (message.toString().includes('TC-') || message.toString().includes('LOAD') || message.toString().includes('SWL')) {
      console.log('🏗️  POSSIBLE CRANE TELEMETRY DETECTED!');
    }
  }
  
  console.log('─'.repeat(40));
});

client.on('error', (error) => {
  console.error('❌ MQTT Error:', error.message);
});

client.on('close', () => {
  console.log('🔌 MQTT connection closed');
});

client.on('offline', () => {
  console.log('📡 MQTT client offline');
});

client.on('reconnect', () => {
  console.log('🔄 Reconnecting to MQTT broker...');
});

// Show summary every 30 seconds
setInterval(() => {
  if (messageCount > 0) {
    console.log(`\n📊 Summary: Received ${messageCount} messages so far`);
  } else {
    console.log('\n⏳ Still waiting for messages...');
    console.log('💡 Make sure your MQTT data source is sending data to the broker');
  }
}, 30000);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down MQTT monitor...');
  console.log(`📊 Total messages received: ${messageCount}`);
  client.end();
  process.exit(0);
});

// Keep the script running
console.log('⏳ Waiting for MQTT messages...');

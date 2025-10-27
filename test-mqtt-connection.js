const mqtt = require('mqtt');

// MQTT Configuration
const MQTT_BROKER_URL = 'mqtt://185.201.8.218:1883';
const MQTT_TOPICS = [
  'crane/telemetry',
  'crane/status',
  'crane/alerts',
  'crane/+/telemetry',  // Wildcard for all crane telemetry
  'crane/+/status'      // Wildcard for all crane status
];

console.log('🔌 Testing MQTT Connection...');
console.log(`📡 Broker: ${MQTT_BROKER_URL}`);

// Connect to MQTT broker
const client = mqtt.connect(MQTT_BROKER_URL, {
  clientId: 'test-client-' + Math.random().toString(16).substr(2, 8),
  clean: true,
  connectTimeout: 4000,
  reconnectPeriod: 1000,
});

// Connection event handlers
client.on('connect', () => {
  console.log('✅ Connected to MQTT broker successfully!');
  console.log('📡 Subscribing to topics...');
  
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
  
  console.log('👂 Listening for messages...');
  console.log('Press Ctrl+C to stop\n');
});

client.on('message', (topic, message) => {
  const timestamp = new Date().toISOString();
  console.log(`\n📨 [${timestamp}] Topic: ${topic}`);
  
  try {
    // Try to parse as JSON first
    const data = JSON.parse(message.toString());
    console.log('📊 Data (JSON):', JSON.stringify(data, null, 2));
  } catch (error) {
    // If not JSON, display as string
    console.log('📊 Data (String):', message.toString());
  }
  
  console.log('─'.repeat(50));
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

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down MQTT client...');
  client.end();
  process.exit(0);
});

// Keep the script running
console.log('⏳ Waiting for MQTT messages...');
console.log('💡 Make sure your MQTT data source is sending data to the broker');

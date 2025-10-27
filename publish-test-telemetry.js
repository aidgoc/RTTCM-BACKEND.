const mqtt = require('mqtt');

// Connect to the same broker your application is using
const MQTT_BROKER_URL = 'mqtt://broker.emqx.io:1883';

console.log('🔌 Publishing test crane telemetry data...');
console.log('📡 Broker: mqtt://broker.emqx.io:1883');
console.log('🏗️  Sending sample crane data...\n');

// Connect to MQTT broker
const client = mqtt.connect(MQTT_BROKER_URL, {
  clientId: 'test-publisher-' + Math.random().toString(16).substr(2, 8),
  clean: true,
  connectTimeout: 10000,
});

client.on('connect', () => {
  console.log('✅ Connected to MQTT broker!');
  console.log('📡 Publishing test telemetry data...\n');
  
  // Sample crane telemetry data
  const testCranes = [
    {
      craneId: 'TC-001',
      name: 'Test Crane 1',
      location: 'Construction Site A'
    },
    {
      craneId: 'TC-002', 
      name: 'Test Crane 2',
      location: 'Construction Site B'
    },
    {
      craneId: 'TC-003',
      name: 'Test Crane 3', 
      location: 'Construction Site C'
    }
  ];
  
  let messageCount = 0;
  
  // Publish telemetry data every 3 seconds
  const interval = setInterval(() => {
    testCranes.forEach(crane => {
      // Generate realistic telemetry data
      const load = Math.floor(Math.random() * 120) + 30; // 30-150 kg
      const swl = 100; // Safe Working Load
      const util = Math.floor((load / swl) * 100); // Utilization percentage
      
      const telemetryData = {
        craneId: crane.craneId,
        ts: new Date().toISOString(),
        load: load,
        swl: swl,
        ls1: Math.random() > 0.1 ? 'OK' : 'FAIL',
        ls2: Math.random() > 0.1 ? 'OK' : 'FAIL', 
        ls3: Math.random() > 0.1 ? 'OK' : 'FAIL',
        ut: Math.random() > 0.05 ? 'OK' : 'FAIL',
        util: util
      };
      
      // Publish to multiple topic formats
      const topics = [
        `crane/${crane.craneId}/telemetry`,
        `crane/telemetry`,
        `telemetry`
      ];
      
      topics.forEach(topic => {
        const payload = JSON.stringify(telemetryData);
        client.publish(topic, payload, (err) => {
          if (err) {
            console.error(`❌ Failed to publish to ${topic}:`, err);
          } else {
            console.log(`📡 Published to ${topic}:`);
            console.log(`   Crane: ${crane.craneId}`);
            console.log(`   Load: ${load}kg / ${swl}kg (${util}%)`);
            console.log(`   Status: LS1=${telemetryData.ls1}, LS2=${telemetryData.ls2}, LS3=${telemetryData.ls3}`);
            console.log('');
          }
        });
      });
    });
    
    messageCount++;
    console.log(`📊 Published batch #${messageCount}`);
    console.log('─'.repeat(50));
    
    // Stop after 10 batches (30 seconds)
    if (messageCount >= 10) {
      clearInterval(interval);
      console.log('✅ Test telemetry publishing complete!');
      console.log('💡 Check your application logs to see if it received the data');
      client.end();
      process.exit(0);
    }
  }, 3000);
  
  console.log('📊 Publishing test data every 3 seconds...');
  console.log('🛑 Press Ctrl+C to stop early\n');
});

client.on('error', (error) => {
  console.error('❌ MQTT Error:', error.message);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping test publisher...');
  client.end();
  process.exit(0);
});

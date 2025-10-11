const mqtt = require('mqtt');

console.log('🔧 Setting up local MQTT broker simulation...');
console.log('📡 This will simulate MQTT data for testing\n');

// Connect to a local MQTT broker (if available)
const LOCAL_BROKER = 'mqtt://localhost:1883';

console.log('🔌 Trying to connect to local MQTT broker...');
console.log('💡 If this fails, we can set up a local broker\n');

const client = mqtt.connect(LOCAL_BROKER, {
  clientId: 'test-publisher-' + Math.random().toString(16).substr(2, 8),
  clean: true,
  connectTimeout: 5000
});

client.on('connect', () => {
  console.log('✅ Connected to local MQTT broker!');
  console.log('📡 Publishing test telemetry data...\n');
  
  // Publish test telemetry data
  const testCranes = ['TC-001', 'TC-002', 'TC-003'];
  
  setInterval(() => {
    testCranes.forEach(craneId => {
      const telemetryData = {
        craneId: craneId,
        ts: new Date().toISOString(),
        load: Math.floor(Math.random() * 100) + 50,
        swl: 100,
        ls1: Math.random() > 0.1 ? 'OK' : 'FAIL',
        ls2: Math.random() > 0.1 ? 'OK' : 'FAIL',
        ls3: Math.random() > 0.1 ? 'OK' : 'FAIL',
        ut: Math.random() > 0.05 ? 'OK' : 'FAIL',
        util: Math.floor(Math.random() * 100)
      };
      
      const topic = `crane/${craneId}/telemetry`;
      const payload = JSON.stringify(telemetryData);
      
      client.publish(topic, payload, (err) => {
        if (err) {
          console.error(`❌ Failed to publish to ${topic}:`, err);
        } else {
          console.log(`📡 Published to ${topic}:`, payload);
        }
      });
    });
  }, 5000); // Publish every 5 seconds
  
  console.log('📊 Publishing test data every 5 seconds...');
  console.log('🛑 Press Ctrl+C to stop\n');
});

client.on('error', (error) => {
  console.log('❌ Failed to connect to local MQTT broker:');
  console.log(`   Error: ${error.message}`);
  console.log('\n💡 To set up a local MQTT broker:');
  console.log('   1. Install Mosquitto: https://mosquitto.org/download/');
  console.log('   2. Start broker: mosquitto -p 1883');
  console.log('   3. Or use Docker: docker run -it -p 1883:1883 eclipse-mosquitto');
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping MQTT test publisher...');
  client.end();
  process.exit(0);
});

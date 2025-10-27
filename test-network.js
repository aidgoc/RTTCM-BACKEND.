const net = require('net');

const MQTT_HOST = '185.201.8.218';
const MQTT_PORT = 1883;

console.log('🔍 Testing network connectivity...');
console.log(`📡 Host: ${MQTT_HOST}`);
console.log(`🔌 Port: ${MQTT_PORT}\n`);

// Test TCP connection
const socket = new net.Socket();

socket.setTimeout(5000); // 5 second timeout

socket.connect(MQTT_PORT, MQTT_HOST, () => {
  console.log('✅ TCP connection successful!');
  console.log('📡 MQTT broker is reachable');
  console.log('💡 The issue might be with MQTT protocol or authentication');
  socket.destroy();
});

socket.on('error', (error) => {
  console.log('❌ TCP connection failed:');
  console.log(`   Error: ${error.message}`);
  console.log(`   Code: ${error.code}`);
  
  if (error.code === 'ECONNREFUSED') {
    console.log('💡 This means:');
    console.log('   - No service is running on that port');
    console.log('   - The broker is not started');
    console.log('   - Wrong port number');
  } else if (error.code === 'ETIMEDOUT') {
    console.log('💡 This means:');
    console.log('   - Network timeout');
    console.log('   - Firewall blocking the connection');
    console.log('   - Host is unreachable');
  } else if (error.code === 'ENOTFOUND') {
    console.log('💡 This means:');
    console.log('   - Hostname/IP not found');
    console.log('   - DNS resolution failed');
  }
});

socket.on('timeout', () => {
  console.log('⏰ Connection timeout');
  console.log('💡 The host might be unreachable or port is blocked');
  socket.destroy();
});

console.log('⏳ Testing connection...');

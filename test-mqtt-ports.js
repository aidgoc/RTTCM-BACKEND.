const mqtt = require('mqtt');

const ports = [1833, 1883, 8883, 8083, 1884];
const host = '185.201.8.218';

console.log('🔍 Testing MQTT connection on different ports...');
console.log(`📡 Host: ${host}`);
console.log('⏳ Testing ports:', ports.join(', '));
console.log('');

let testedPorts = 0;
const totalPorts = ports.length;

function testPort(port) {
  return new Promise((resolve) => {
    console.log(`🔌 Testing port ${port}...`);
    
    const client = mqtt.connect(`mqtt://${host}:${port}`, {
      connectTimeout: 3000,
      reconnectPeriod: 0
    });
    
    let resolved = false;
    
    client.on('connect', () => {
      if (!resolved) {
        resolved = true;
        console.log(`✅ SUCCESS! Port ${port} is working!`);
        client.end();
        resolve({ port, success: true });
      }
    });
    
    client.on('error', (error) => {
      if (!resolved) {
        resolved = true;
        console.log(`❌ Port ${port}: ${error.message}`);
        client.end();
        resolve({ port, success: false, error: error.message });
      }
    });
    
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        console.log(`⏰ Port ${port}: Timeout`);
        client.end();
        resolve({ port, success: false, error: 'Timeout' });
      }
    }, 3000);
  });
}

async function testAllPorts() {
  const results = [];
  
  for (const port of ports) {
    const result = await testPort(port);
    results.push(result);
    testedPorts++;
    
    if (result.success) {
      console.log(`\n🎉 Found working port: ${port}`);
      console.log(`📡 Use this URL: mqtt://${host}:${port}`);
      break;
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n📊 Test Results:');
  console.log('─'.repeat(40));
  results.forEach(result => {
    const status = result.success ? '✅ WORKING' : '❌ FAILED';
    console.log(`Port ${result.port}: ${status} ${result.error ? `(${result.error})` : ''}`);
  });
  
  const workingPorts = results.filter(r => r.success);
  if (workingPorts.length === 0) {
    console.log('\n💡 No working ports found. Possible issues:');
    console.log('   - MQTT broker is not running');
    console.log('   - Firewall blocking all ports');
    console.log('   - Wrong IP address');
    console.log('   - Network connectivity issues');
  } else {
    console.log(`\n✅ Found ${workingPorts.length} working port(s)!`);
  }
}

testAllPorts().then(() => {
  process.exit(0);
});

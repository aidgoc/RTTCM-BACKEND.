const mqtt = require('mqtt');

const publicBrokers = [
  { name: 'Eclipse Mosquitto', url: 'mqtt://test.mosquitto.org:1883' },
  { name: 'HiveMQ', url: 'mqtt://broker.hivemq.com:1883' },
  { name: 'EMQX Public', url: 'mqtt://broker.emqx.io:1883' },
  { name: 'Eclipse IoT', url: 'mqtt://mqtt.eclipseprojects.io:1883' }
];

console.log('🔍 Testing public MQTT brokers...');
console.log('💡 This will help verify if your MQTT setup works\n');

async function testBroker(broker) {
  return new Promise((resolve) => {
    console.log(`🔌 Testing ${broker.name}...`);
    
    const client = mqtt.connect(broker.url, {
      connectTimeout: 5000,
      reconnectPeriod: 0
    });
    
    let resolved = false;
    
    client.on('connect', () => {
      if (!resolved) {
        resolved = true;
        console.log(`✅ SUCCESS! ${broker.name} is working!`);
        console.log(`📡 URL: ${broker.url}`);
        client.end();
        resolve({ ...broker, success: true });
      }
    });
    
    client.on('error', (error) => {
      if (!resolved) {
        resolved = true;
        console.log(`❌ ${broker.name}: ${error.message}`);
        client.end();
        resolve({ ...broker, success: false, error: error.message });
      }
    });
    
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        console.log(`⏰ ${broker.name}: Timeout`);
        client.end();
        resolve({ ...broker, success: false, error: 'Timeout' });
      }
    }, 5000);
  });
}

async function testAllBrokers() {
  const results = [];
  
  for (const broker of publicBrokers) {
    const result = await testBroker(broker);
    results.push(result);
    
    if (result.success) {
      console.log(`\n🎉 Found working broker: ${result.name}`);
      console.log(`📡 You can use: ${result.url}`);
      break;
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n📊 Test Results:');
  console.log('─'.repeat(50));
  results.forEach(result => {
    const status = result.success ? '✅ WORKING' : '❌ FAILED';
    console.log(`${result.name}: ${status} ${result.error ? `(${result.error})` : ''}`);
  });
  
  const workingBrokers = results.filter(r => r.success);
  if (workingBrokers.length === 0) {
    console.log('\n💡 No public brokers are accessible. Possible issues:');
    console.log('   - Network firewall blocking MQTT');
    console.log('   - Corporate network restrictions');
    console.log('   - Internet connectivity issues');
  } else {
    console.log(`\n✅ Found ${workingBrokers.length} working broker(s)!`);
    console.log('💡 You can use these for testing your application');
  }
}

testAllBrokers().then(() => {
  process.exit(0);
});

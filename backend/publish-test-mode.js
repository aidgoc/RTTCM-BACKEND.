/**
 * Publish Test Mode Activation Messages to MQTT
 * This script sends the exact messages the user wants to test
 */

require('dotenv').config();
const mqtt = require('mqtt');

// MQTT Configuration
const MQTT_BROKER = process.env.MQTT_BROKER_URL || 'mqtt://broker.hivemq.com:1883';
const MQTT_TOPIC = process.env.MQTT_TOPIC || 'crane/123';

console.log('\n' + '═'.repeat(70));
console.log('🔧 Test Mode Activation - MQTT Publisher');
console.log('═'.repeat(70));
console.log(`📡 Broker: ${MQTT_BROKER}`);
console.log(`📨 Topic: ${MQTT_TOPIC}`);
console.log('═'.repeat(70) + '\n');

// Connect to MQTT broker
const client = mqtt.connect(MQTT_BROKER, {
  clientId: `test-publisher-${Math.random().toString(16).slice(2, 8)}`,
  clean: true,
  reconnectPeriod: 1000
});

// Test messages to send
const testMessages = [
  {
    name: 'Test Mode Activated (UTIL=1, TEST=1)',
    payload: '$DM12369186d32020090F09B#',
    description: 'Crane is WORKING + Test Mode is ACTIVATED',
    expectedResult: 'Badge should show: 🔧 Testing... (yellow, pulsing) + 🟢 WORKING'
  },
  {
    name: 'Test Mode Activated (UTIL=0, TEST=1)',
    payload: '$DM12369187044020010D024#',
    description: 'Crane is IDLE + Test Mode is ACTIVATED',
    expectedResult: 'Badge should show: 🔧 Testing... (yellow, pulsing) + ⚫ IDLE'
  }
];

client.on('connect', () => {
  console.log('✅ Connected to MQTT broker\n');

  let messageIndex = 0;

  const publishNext = () => {
    if (messageIndex >= testMessages.length) {
      console.log('\n' + '═'.repeat(70));
      console.log('✅ All test messages sent successfully!');
      console.log('═'.repeat(70));
      console.log('\n📋 What to check in the frontend:');
      console.log('  1. Open browser and navigate to the crane card');
      console.log('  2. Look for the Test Status badge');
      console.log('  3. It should show: 🔧 Testing... (yellow, pulsing)');
      console.log('  4. Check browser console for debug logs\n');
      
      setTimeout(() => {
        client.end();
        process.exit(0);
      }, 2000);
      return;
    }

    const message = testMessages[messageIndex];
    
    console.log('─'.repeat(70));
    console.log(`📤 Sending Message ${messageIndex + 1}/${testMessages.length}`);
    console.log('─'.repeat(70));
    console.log(`📝 Name: ${message.name}`);
    console.log(`📨 Payload: ${message.payload}`);
    console.log(`📄 Description: ${message.description}`);
    console.log(`✅ Expected: ${message.expectedResult}`);
    console.log('─'.repeat(70));

    client.publish(MQTT_TOPIC, message.payload, { qos: 1 }, (error) => {
      if (error) {
        console.error('❌ Error publishing message:', error);
      } else {
        console.log('✅ Message sent successfully!\n');
      }
      
      messageIndex++;
      setTimeout(publishNext, 3000); // Wait 3 seconds between messages
    });
  };

  publishNext();
});

client.on('error', (error) => {
  console.error('❌ MQTT Connection Error:', error);
  process.exit(1);
});

client.on('close', () => {
  console.log('\n👋 Disconnected from MQTT broker\n');
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n\n⏹️  Interrupted - Closing connection...');
  client.end();
  process.exit(0);
});


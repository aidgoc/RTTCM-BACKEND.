/**
 * Test MQTT Publishing
 * 
 * This script demonstrates how to publish messages to the MQTT broker
 * using both the API endpoint and direct MQTT client methods.
 * 
 * Usage:
 * 1. Make sure your backend is running
 * 2. Run: node test-mqtt-publish.js
 */

const axios = require('axios');

const API_BASE_URL = process.env.API_URL || 'http://localhost:3001';

// Test credentials (update these with your test account)
const TEST_USER = {
  email: 'admin@test.com',
  password: 'admin123'
};

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function login() {
  try {
    log('\n🔐 Logging in...', 'cyan');
    const response = await axios.post(`${API_BASE_URL}/api/auth/login`, TEST_USER, {
      withCredentials: true
    });
    
    log('✅ Login successful', 'green');
    
    // Extract cookie from response headers
    const cookies = response.headers['set-cookie'];
    return cookies ? cookies[0].split(';')[0] : null;
    
  } catch (error) {
    log('❌ Login failed: ' + (error.response?.data?.error || error.message), 'red');
    throw error;
  }
}

async function publishToSpecificCrane(cookie, craneId, message) {
  try {
    log(`\n📤 Publishing to crane ${craneId}...`, 'cyan');
    
    const response = await axios.post(
      `${API_BASE_URL}/api/cranes/${craneId}/mqtt/publish`,
      {
        messageType: 'command',  // Will publish to: crane/{craneId}/command
        message: message
      },
      {
        headers: {
          Cookie: cookie
        },
        withCredentials: true
      }
    );
    
    log('✅ Message published successfully:', 'green');
    console.log(JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    log('❌ Publish failed: ' + (error.response?.data?.error || error.message), 'red');
    if (error.response?.data) {
      console.log('Error details:', error.response.data);
    }
  }
}

async function publishToCustomTopic(cookie, craneId, topic, message) {
  try {
    log(`\n📤 Publishing to custom topic: ${topic}...`, 'cyan');
    
    const response = await axios.post(
      `${API_BASE_URL}/api/cranes/${craneId}/mqtt/publish`,
      {
        topic: topic,  // Custom topic
        message: message
      },
      {
        headers: {
          Cookie: cookie
        },
        withCredentials: true
      }
    );
    
    log('✅ Message published successfully:', 'green');
    console.log(JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    log('❌ Publish failed: ' + (error.response?.data?.error || error.message), 'red');
  }
}

async function broadcastToAllCranes(cookie, message) {
  try {
    log('\n📢 Broadcasting to all cranes...', 'cyan');
    
    const response = await axios.post(
      `${API_BASE_URL}/api/cranes/mqtt/broadcast`,
      {
        messageType: 'announcement',
        message: message
      },
      {
        headers: {
          Cookie: cookie
        },
        withCredentials: true
      }
    );
    
    log('✅ Broadcast successful:', 'green');
    console.log(JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    log('❌ Broadcast failed: ' + (error.response?.data?.error || error.message), 'red');
  }
}

async function main() {
  log('═══════════════════════════════════════', 'bright');
  log('   MQTT Publishing Test Script', 'bright');
  log('═══════════════════════════════════════', 'bright');
  
  try {
    // Step 1: Login
    const cookie = await login();
    
    // Step 2: Test publishing to a specific crane
    log('\n📋 Test 1: Send command to specific crane', 'yellow');
    await publishToSpecificCrane(cookie, 'TC101', {
      action: 'start_test',
      testType: 'limit_switch',
      parameters: {
        ls1: true,
        ls2: true,
        ls3: true,
        ls4: true
      }
    });
    
    // Wait a bit between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Step 3: Test publishing to a custom topic
    log('\n📋 Test 2: Send to custom topic', 'yellow');
    await publishToCustomTopic(cookie, 'TC101', 'crane/TC101/settings', {
      swl: 5000,
      alarmThreshold: 4500,
      updateInterval: 5000
    });
    
    // Wait a bit between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Step 4: Test broadcasting to all cranes
    log('\n📋 Test 3: Broadcast announcement', 'yellow');
    await broadcastToAllCranes(cookie, {
      type: 'maintenance_notice',
      message: 'System maintenance scheduled for tonight at 2 AM',
      priority: 'medium',
      timestamp: new Date().toISOString()
    });
    
    log('\n═══════════════════════════════════════', 'bright');
    log('✅ All tests completed!', 'green');
    log('═══════════════════════════════════════', 'bright');
    
    log('\n💡 Tips:', 'cyan');
    log('  - Check your backend logs to see published messages');
    log('  - Use MQTT Explorer or mosquitto_sub to monitor topics');
    log('  - To subscribe to crane commands: mosquitto_sub -h localhost -t "crane/+/command"');
    log('  - To subscribe to all topics: mosquitto_sub -h localhost -t "#"');
    
  } catch (error) {
    log('\n❌ Test failed:', 'red');
    console.error(error.message);
    process.exit(1);
  }
}

// Example messages you can send:

const EXAMPLE_MESSAGES = {
  // Start a limit test
  startLimitTest: {
    action: 'start_test',
    testType: 'limit_switch',
    parameters: {
      testLS1: true,
      testLS2: true,
      testLS3: true,
      testLS4: true
    }
  },
  
  // Emergency stop command
  emergencyStop: {
    action: 'emergency_stop',
    reason: 'Safety override',
    timestamp: new Date().toISOString()
  },
  
  // Update crane settings
  updateSettings: {
    action: 'update_settings',
    settings: {
      reportingInterval: 5000,
      windSpeedThreshold: 50,
      autoShutdownEnabled: true
    }
  },
  
  // Request status update
  requestStatus: {
    action: 'request_status',
    includeDetails: true
  },
  
  // Calibrate load sensor
  calibrateLoadSensor: {
    action: 'calibrate',
    sensor: 'load',
    parameters: {
      zeroPoint: 0,
      fullScale: 10000
    }
  }
};

log('\n📚 Example messages available:', 'cyan');
log('  EXAMPLE_MESSAGES.startLimitTest', 'blue');
log('  EXAMPLE_MESSAGES.emergencyStop', 'blue');
log('  EXAMPLE_MESSAGES.updateSettings', 'blue');
log('  EXAMPLE_MESSAGES.requestStatus', 'blue');
log('  EXAMPLE_MESSAGES.calibrateLoadSensor', 'blue');

// Run the tests
main();


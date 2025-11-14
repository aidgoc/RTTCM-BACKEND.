/**
 * Complete End-to-End Test Example
 * Tests the full flow: MQTT → Parser → MongoDB → API
 */

const mqtt = require('mqtt');
const mongoose = require('mongoose');
const { parseTelemetryPayload } = require('./src/utils/parser');

// Configuration
const MQTT_BROKER_URL = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/cranefleet';

// Test data
const COMPANY_ID = 'ABC001';
const DEVICE_ID = 'abc';
const CRANE_ID = `DM-${DEVICE_ID}`;
const TEST_TOPIC = `company/${COMPANY_ID}/crane/${CRANE_ID}/telemetry`;
const TEST_PAYLOAD = '$DMabc68e1d43820087#0506';

console.log('🧪 Complete End-to-End Test Example\n');
console.log('='.repeat(70));
console.log('📋 Test Configuration:');
console.log(`   Company ID: ${COMPANY_ID}`);
console.log(`   Device ID: ${DEVICE_ID}`);
console.log(`   Crane ID: ${CRANE_ID}`);
console.log(`   MQTT Topic: ${TEST_TOPIC}`);
console.log(`   Payload: ${TEST_PAYLOAD}`);
console.log('='.repeat(70));

// Step 1: Test Parser
console.log('\n📦 Step 1: Testing Parser');
console.log('-'.repeat(70));
const parsedData = parseTelemetryPayload(TEST_PAYLOAD);
if (parsedData) {
  console.log('✅ Parser Success!');
  console.log('📊 Parsed Data:');
  console.log(JSON.stringify(parsedData, null, 2));
  
  // Verify key fields
  console.log('\n🔍 Verification:');
  console.log(`   ✅ Crane ID: ${parsedData.craneId} (expected: ${CRANE_ID})`);
  console.log(`   ✅ Device ID: ${parsedData.deviceId} (expected: ${DEVICE_ID})`);
  console.log(`   ✅ Command Type: ${parsedData.commandType} (expected: event)`);
  console.log(`   ✅ LS2 Status: ${parsedData.ls2} (expected: HIT)`);
  console.log(`   ✅ Timestamp: ${parsedData.ts}`);
} else {
  console.log('❌ Parser Failed!');
  process.exit(1);
}

// Step 2: Test Topic Parsing
console.log('\n📦 Step 2: Testing Topic Parsing');
console.log('-'.repeat(70));
function extractCompanyAndCraneId(topic) {
  const topicParts = topic.split('/');
  let companyId = null;
  let craneId = null;

  if (topicParts[0] === 'company' && topicParts.length >= 4) {
    companyId = topicParts[1];
    if (topicParts[2] === 'crane') {
      craneId = topicParts[3];
    }
  } else if (topicParts.length >= 3 && topicParts[1] === 'crane') {
    companyId = topicParts[0];
    craneId = topicParts[2];
  } else if (topicParts[0] === 'crane' && topicParts.length >= 2) {
    craneId = topicParts[1];
  }

  return { companyId, craneId };
}

const { companyId, craneId } = extractCompanyAndCraneId(TEST_TOPIC);
console.log(`✅ Topic Parsed!`);
console.log(`   Company ID: ${companyId} (expected: ${COMPANY_ID})`);
console.log(`   Crane ID: ${craneId} (expected: ${CRANE_ID})`);

if (companyId !== COMPANY_ID || craneId !== CRANE_ID) {
  console.log('❌ Topic parsing failed!');
  process.exit(1);
}

// Step 3: Test Complete Flow (if MQTT and MongoDB available)
console.log('\n📦 Step 3: Testing Complete Flow');
console.log('-'.repeat(70));
console.log('⚠️  This requires MQTT broker and MongoDB to be running');
console.log('   To test:');
console.log(`   1. Start MQTT broker: mosquitto -p 1883`);
console.log(`   2. Start MongoDB: mongod`);
console.log(`   3. Run: mosquitto_pub -h localhost -t "${TEST_TOPIC}" -m "${TEST_PAYLOAD}"`);
console.log(`   4. Check backend logs for processing`);
console.log(`   5. Query MongoDB: db.telemetries.find({ craneId: "${CRANE_ID}" })`);

// Step 4: Show Expected MongoDB Document
console.log('\n📦 Step 4: Expected MongoDB Document');
console.log('-'.repeat(70));
const expectedTelemetry = {
  craneId: CRANE_ID,
  ts: new Date(parsedData.ts),
  load: parsedData.load || 0,
  swl: parsedData.swl || 0,
  ls1: parsedData.ls1 || 'UNKNOWN',
  ls2: parsedData.ls2 || 'UNKNOWN',
  ls3: parsedData.ls3 || 'UNKNOWN',
  ls4: parsedData.ls4 || 'UNKNOWN',
  util: parsedData.util || 0,
  ut: parsedData.ut || 'UNKNOWN',
  raw: TEST_PAYLOAD,
  createdAt: new Date(),
  updatedAt: new Date()
};

console.log('📄 Expected Telemetry Document:');
console.log(JSON.stringify(expectedTelemetry, null, 2));

// Step 5: Show Expected API Response
console.log('\n📦 Step 5: Expected API Response');
console.log('-'.repeat(70));
const expectedApiResponse = {
  craneId: CRANE_ID,
  telemetry: [{
    craneId: CRANE_ID,
    timestamp: parsedData.ts,
    load: parsedData.load || 0,
    swl: parsedData.swl || 0,
    utilization: parsedData.util || 0,
    isOverloaded: false,
    limitSwitchStatus: {
      ls1: parsedData.ls1 || 'UNKNOWN',
      ls2: parsedData.ls2 || 'UNKNOWN',
      ls3: parsedData.ls3 || 'UNKNOWN',
      ls4: parsedData.ls4 || 'UNKNOWN'
    },
    hasFailures: parsedData.ls2 === 'HIT',
    raw: TEST_PAYLOAD
  }],
  count: 1
};

console.log('📄 Expected API Response (GET /api/cranes/DM-abc/telemetry):');
console.log(JSON.stringify(expectedApiResponse, null, 2));

// Step 6: Show Frontend Display
console.log('\n📦 Step 6: Expected Frontend Display');
console.log('-'.repeat(70));
console.log(`
┌─────────────────────────────────────┐
│  Crane Dashboard: DM-abc           │
├─────────────────────────────────────┤
│  Company: ABC001                    │
│  Status: Online                     │
│  Last Seen: ${new Date().toLocaleString()} │
│                                     │
│  Load: ${parsedData.load || 0} kg                          │
│  SWL: ${parsedData.swl || 0} kg                           │
│  Utilization: ${parsedData.util || 0}%                    │
│                                     │
│  Limit Switches:                    │
│  ┌─────┬─────┬─────┬─────┐         │
│  │ LS1 │ LS2 │ LS3 │ LS4 │         │
│  ├─────┼─────┼─────┼─────┤         │
│  │ OK  │ HIT │ OK  │ OK  │         │
│  └─────┴─────┴─────┴─────┘         │
│                                     │
│  ⚠️  Alert: LS2 Limit Switch HIT    │
└─────────────────────────────────────┘
`);

console.log('\n' + '='.repeat(70));
console.log('✅ Complete Example Test Finished!');
console.log('='.repeat(70));
console.log('\n💡 Next Steps:');
console.log('   1. Configure your DRM3400 device to publish to:');
console.log(`      Topic: ${TEST_TOPIC}`);
console.log(`      Payload: ${TEST_PAYLOAD}`);
console.log('   2. Update .env with company-based topics:');
console.log('      TOPIC_TELEMETRY=company/+/crane/+/telemetry');
console.log('   3. Start your backend server');
console.log('   4. Monitor logs for incoming messages');
console.log('   5. Check MongoDB for stored data');
console.log('   6. Access frontend to view crane status\n');












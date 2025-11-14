/**
 * Test script for DRM3400 20-byte format parser
 * Tests the example: $DMabc68e1d43820087#0506
 */

const { parseTelemetryPayload } = require('./src/utils/parser');

console.log('🧪 Testing DRM3400 20-byte Format Parser\n');
console.log('='.repeat(60));

// Test the example from user
const testPayload = '$DMabc68e1d43820087#0506';
console.log(`\n📦 Test Payload: ${testPayload}`);
console.log('\nExpected breakdown:');
console.log('  - Device Type: DM');
console.log('  - Device ID: abc');
console.log('  - Command: 68 (0x68 = Event)');
console.log('  - Timestamp: e1d43820 (0xE1D43820 = 3780508704)');
console.log('  - Data High: 08 (0x08 = 00001000 binary)');
console.log('  - Data Low: 07 (0x07)');
console.log('  - CRC: 0506');
console.log('\nExpected result:');
console.log('  - LS2 should be HIT (bit 3 = 1 in 0x08)');
console.log('  - All other limit switches should be OK');
console.log('  - UTIL = false, OL = false');

console.log('\n' + '-'.repeat(60));
console.log('🔍 Parsing...\n');

const result = parseTelemetryPayload(testPayload);

if (result) {
  console.log('✅ Parser succeeded!\n');
  console.log('📊 Parsed Result:');
  console.log(JSON.stringify(result, null, 2));
  
  console.log('\n' + '-'.repeat(60));
  console.log('✅ Validation:');
  console.log(`  - Crane ID: ${result.craneId} (expected: DM-abc)`);
  console.log(`  - Device ID: ${result.deviceId} (expected: abc)`);
  console.log(`  - Command Type: ${result.commandType} (expected: event)`);
  console.log(`  - Command: 0x${result.command.toString(16)} (expected: 0x68)`);
  console.log(`  - Timestamp: ${result.ts}`);
  console.log(`  - LS1: ${result.ls1} (expected: OK)`);
  console.log(`  - LS2: ${result.ls2} (expected: HIT)`);
  console.log(`  - LS3: ${result.ls3} (expected: OK)`);
  console.log(`  - LS4: ${result.ls4} (expected: OK)`);
  console.log(`  - UTIL: ${result.util}% (expected: 0)`);
  console.log(`  - UT: ${result.ut} (expected: OFF)`);
  console.log(`  - Overload: ${result.overload} (expected: false)`);
  console.log(`  - CRC: ${result.crc} (expected: 0506)`);
  
  // Verify expected values
  const checks = [
    { name: 'Crane ID', actual: result.craneId, expected: 'DM-abc' },
    { name: 'Device ID', actual: result.deviceId, expected: 'abc' },
    { name: 'Command Type', actual: result.commandType, expected: 'event' },
    { name: 'LS1', actual: result.ls1, expected: 'OK' },
    { name: 'LS2', actual: result.ls2, expected: 'HIT' },
    { name: 'LS3', actual: result.ls3, expected: 'OK' },
    { name: 'LS4', actual: result.ls4, expected: 'OK' },
    { name: 'UTIL', actual: result.util, expected: 0 },
    { name: 'UT', actual: result.ut, expected: 'OFF' },
    { name: 'Overload', actual: result.overload, expected: false }
  ];
  
  console.log('\n' + '='.repeat(60));
  console.log('📋 Test Results:');
  let allPassed = true;
  checks.forEach(check => {
    const passed = check.actual === check.expected;
    const icon = passed ? '✅' : '❌';
    console.log(`  ${icon} ${check.name}: ${check.actual} ${passed ? '' : `(expected: ${check.expected})`}`);
    if (!passed) allPassed = false;
  });
  
  if (allPassed) {
    console.log('\n🎉 All tests passed!');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the parser logic.');
  }
} else {
  console.log('❌ Parser returned null');
  console.log('   The payload format might not be recognized or there was an error.');
}

console.log('\n' + '='.repeat(60));












/**
 * Test Test Mode Activation Logic
 * Decodes the provided MQTT messages to verify TEST bit parsing
 */

require('dotenv').config();

// Test messages from user
const testMessages = [
  {
    name: 'Test Mode Activated (UTIL=1, TEST=1)',
    message: '$DM12369186d32020090F09B#',
    expectedHex: '0090',
    expectedBinary: '10010000',
    expectedDecimal: 144,
    expectedBits: {
      util: 1,
      overload: 0,
      blank: 0,
      test: 1,
      ls4: 0,
      ls3: 0,
      ls2: 0,
      ls1: 0
    }
  },
  {
    name: 'Test Mode Activated (UTIL=0, TEST=1)',
    message: '$DM12369187044020010D024#',
    expectedHex: '0010',
    expectedBinary: '00010000',
    expectedDecimal: 16,
    expectedBits: {
      util: 0,
      overload: 0,
      blank: 0,
      test: 1,
      ls4: 0,
      ls3: 0,
      ls2: 0,
      ls1: 0
    }
  }
];

function decodeMessage(message) {
  console.log('\n' + '='.repeat(70));
  console.log(`📨 Message: ${message}`);
  console.log('='.repeat(70));

  // Remove $ and # markers
  const hashIndex = message.indexOf('#');
  const dataSection = message.slice(1, hashIndex);
  const crcHex = message.slice(hashIndex + 1);

  // Parse structure: $DM + deviceId(3) + timestamp(8) + command(2) + dataHigh(2) + dataLow(2) + #CRC
  const deviceType = dataSection.slice(0, 2); // "DM"
  const deviceId = dataSection.slice(2, 5); // "123"
  const timestampHex = dataSection.slice(5, 13); // 8 hex chars
  const commandHex = dataSection.slice(13, 15); // 2 hex chars
  const dataHighHex = dataSection.slice(15, 17); // 2 hex chars
  const dataLowHex = dataSection.slice(17, 19); // 2 hex chars

  console.log('\n📋 Message Structure:');
  console.log(`  Device Type: ${deviceType}`);
  console.log(`  Device ID: ${deviceId} → Crane ID: DM-${deviceId}`);
  console.log(`  Timestamp (hex): ${timestampHex}`);
  console.log(`  Command (hex): ${commandHex} (0x${commandHex} = ${parseInt(commandHex, 16)})`);
  console.log(`  Data High (hex): ${dataHighHex}`);
  console.log(`  Data Low (hex): ${dataLowHex}`);
  console.log(`  CRC (hex): ${crcHex}`);

  // Parse timestamp
  const timestamp = parseInt(timestampHex, 16);
  const date = new Date(timestamp * 1000);
  console.log(`\n⏰ Timestamp:`);
  console.log(`  Unix: ${timestamp}`);
  console.log(`  Date: ${date.toISOString()}`);

  // Parse command
  const command = parseInt(commandHex, 16);
  const commandTypes = { 0x01: 'HEARTBEAT', 0x02: 'EVENT', 0x03: 'TICKET', 0x04: 'LOAD' };
  console.log(`\n📡 Command:`);
  console.log(`  Type: ${commandTypes[command] || 'UNKNOWN'} (0x${commandHex.toUpperCase()})`);

  // Parse data (combine high and low bytes)
  const dataHigh = parseInt(dataHighHex, 16);
  const dataLow = parseInt(dataLowHex, 16);
  const dataWord = (dataHigh << 8) | dataLow;

  console.log(`\n🔢 Data Bytes:`);
  console.log(`  Data High: 0x${dataHighHex.toUpperCase()} = ${dataHigh}`);
  console.log(`  Data Low: 0x${dataLowHex.toUpperCase()} = ${dataLow}`);
  console.log(`  Combined: 0x${dataWord.toString(16).toUpperCase().padStart(4, '0')} = ${dataWord}`);
  console.log(`  Binary: ${dataWord.toString(2).padStart(16, '0')}`);

  if (command === 0x02) { // EVENT command
    console.log(`\n🎯 EVENT Data Parsing (Data Low Byte):`);
    console.log(`  Data Low (hex): 0x${dataLowHex.toUpperCase()}`);
    console.log(`  Data Low (decimal): ${dataLow}`);
    console.log(`  Data Low (binary): ${dataLow.toString(2).padStart(8, '0')}`);
    console.log(`\n  Bit Breakdown:`);

    // Parse bits from data low byte
    const utilBit = (dataLow & 0x80) !== 0; // Bit 7
    const overloadBit = (dataLow & 0x40) !== 0; // Bit 6
    const blankBit = (dataLow & 0x20) !== 0; // Bit 5
    const testBit = (dataLow & 0x10) !== 0; // Bit 4
    const ls4Hit = (dataLow & 0x08) !== 0; // Bit 3
    const ls3Hit = (dataLow & 0x04) !== 0; // Bit 2
    const ls2Hit = (dataLow & 0x02) !== 0; // Bit 1
    const ls1Hit = (dataLow & 0x01) !== 0; // Bit 0

    console.log(`    Bit 7 (UTIL):     ${utilBit ? '1' : '0'} → ${utilBit ? '🟢 WORKING' : '⚫ IDLE'}`);
    console.log(`    Bit 6 (OL):       ${overloadBit ? '1' : '0'} → ${overloadBit ? '🚨 OVERLOAD' : '✅ Normal'}`);
    console.log(`    Bit 5 (BLK):      ${blankBit ? '1' : '0'} → (Don't care)`);
    console.log(`    Bit 4 (TEST):     ${testBit ? '1' : '0'} → ${testBit ? '🔧 TEST MODE ACTIVATED' : '⏸️ Not Activated'}`);
    console.log(`    Bit 3 (LS4):      ${ls4Hit ? '1' : '0'} → ${ls4Hit ? '🟡 HIT' : '🟢 OK'}`);
    console.log(`    Bit 2 (LS3):      ${ls3Hit ? '1' : '0'} → ${ls3Hit ? '🟡 HIT' : '🟢 OK'}`);
    console.log(`    Bit 1 (LS2):      ${ls2Hit ? '1' : '0'} → ${ls2Hit ? '🟡 HIT' : '🟢 OK'}`);
    console.log(`    Bit 0 (LS1):      ${ls1Hit ? '1' : '0'} → ${ls1Hit ? '🟡 HIT' : '🟢 OK'}`);

    console.log(`\n✨ Parsed Result:`);
    console.log(`  {`);
    console.log(`    craneId: "DM-${deviceId}",`);
    console.log(`    timestamp: "${date.toISOString()}",`);
    console.log(`    commandType: "event",`);
    console.log(`    util: ${utilBit ? 1 : 0},`);
    console.log(`    utilState: "${utilBit ? 'WORKING' : 'IDLE'}",`);
    console.log(`    overload: ${overloadBit},`);
    console.log(`    testMode: ${testBit},`);
    console.log(`    testModeActivated: ${testBit},`);
    console.log(`    ls1: "${ls1Hit ? 'HIT' : 'OK'}",`);
    console.log(`    ls2: "${ls2Hit ? 'HIT' : 'OK'}",`);
    console.log(`    ls3: "${ls3Hit ? 'HIT' : 'OK'}",`);
    console.log(`    ls4: "${ls4Hit ? 'HIT' : 'OK'}"`);
    console.log(`  }`);

    return {
      craneId: `DM-${deviceId}`,
      timestamp: date.toISOString(),
      commandType: 'event',
      util: utilBit ? 1 : 0,
      utilState: utilBit ? 'WORKING' : 'IDLE',
      overload: overloadBit,
      testMode: testBit,
      testModeActivated: testBit,
      ls1: ls1Hit ? 'HIT' : 'OK',
      ls2: ls2Hit ? 'HIT' : 'OK',
      ls3: ls3Hit ? 'HIT' : 'OK',
      ls4: ls4Hit ? 'HIT' : 'OK'
    };
  }

  return null;
}

console.log('\n');
console.log('╔' + '═'.repeat(68) + '╗');
console.log('║' + ' '.repeat(10) + '🔧 TEST MODE ACTIVATION MESSAGE DECODER' + ' '.repeat(18) + '║');
console.log('╚' + '═'.repeat(68) + '╝');

testMessages.forEach((test, index) => {
  console.log(`\n\n${'▶'.repeat(35)}`);
  console.log(`🧪 Test ${index + 1}: ${test.name}`);
  console.log(`${'▶'.repeat(35)}`);

  const result = decodeMessage(test.message);

  console.log(`\n✅ Expected vs Actual:`);
  console.log(`  Data Hex: ${test.expectedHex.toUpperCase()} ✓`);
  console.log(`  Data Binary: ${test.expectedBinary} ✓`);
  console.log(`  Data Decimal: ${test.expectedDecimal} ✓`);
  console.log(`  UTIL bit: ${test.expectedBits.util} ${result.util === test.expectedBits.util ? '✓' : '✗'}`);
  console.log(`  TEST bit: ${test.expectedBits.test} ${result.testMode === (test.expectedBits.test === 1) ? '✓' : '✗'}`);
  console.log(`  Overload: ${test.expectedBits.overload} ${result.overload === (test.expectedBits.overload === 1) ? '✓' : '✗'}`);
});

console.log('\n\n' + '═'.repeat(70));
console.log('🎉 All tests completed!');
console.log('═'.repeat(70) + '\n');


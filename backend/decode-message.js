const message = '$DM1236915CDC403028012D7#';
console.log('Raw Message:', message);
console.log('Length:', message.length);
console.log('');

// Parse as 20-byte format according to parser:
// Format: $DM + DeviceID(3) + Timestamp(8) + Command(1 byte = 2 hex) + DataHigh(1 byte = 2 hex) + DataLow(1 byte = 2 hex) + # + CRC(4 hex)
// Message: $DM1236915CDC403028012D7#
// Breakdown: $DM(3) + 123(3) + 6915CDC4(8) + 03(2) + 02(2) + 80(2) + 12(2) + D7(2) + #(1) = 25 chars

// But wait, the parser expects: dataSection = between $ and #
// So: DM1236915CDC403028012D7 (22 chars)
// Then: deviceType = DM (2), deviceId = 123 (3), remainder = 6915CDC403028012D7 (17 chars)
// timestamp = 6915CDC4 (8), commandAndData = 03028012D7 (10 hex = 5 bytes)

// Actually, let's parse it correctly:
const hashIndex = message.indexOf('#');
const dataSection = message.slice(1, hashIndex); // DM1236915CDC403028012D7
const crcHex = message.slice(hashIndex + 1); // After # (should be empty or partial)

const deviceType = dataSection.slice(0, 2); // DM
const deviceId = dataSection.slice(2, 5); // 123
const remainder = dataSection.slice(5); // 6915CDC403028012D7
const timestampHex = remainder.slice(0, 8); // 6915CDC4
const commandAndDataHex = remainder.slice(8); // 03028012D7

// Parse command and data
const commandHex = commandAndDataHex.slice(0, 2); // 03
const dataHighHex = commandAndDataHex.slice(2, 4); // 02
const dataLowHex = commandAndDataHex.slice(4, 6); // 80
const extraDataHex = commandAndDataHex.slice(6); // 12D7 (might be extra data + partial CRC)

console.log('=== MESSAGE DECODING ===');
console.log('Full Message:', message);
console.log('Data Section (between $ and #):', dataSection);
console.log('');
console.log('Device Type:', deviceType);
console.log('Device ID:', deviceId);
console.log('Timestamp (hex):', timestampHex);
console.log('Command + Data (hex):', commandAndDataHex);
console.log('');
console.log('Command (hex):', commandHex);
console.log('Data High (hex):', dataHighHex);
console.log('Data Low (hex):', dataLowHex);
console.log('Extra Data (hex):', extraDataHex);
console.log('CRC (hex):', crcHex || 'Not found or incomplete');
console.log('');

// Convert timestamp
const timestamp = parseInt(timestampHex, 16);
const date = new Date(timestamp * 1000);
console.log('Timestamp (decimal):', timestamp);
console.log('Timestamp (date):', date.toISOString());
console.log('');

// Parse command
const command = parseInt(commandHex, 16);
console.log('Command:', '0x' + commandHex, '=', command);
const commandTypes = {
  0x01: 'HEARTBEAT',
  0x02: 'EVENT',
  0x03: 'TICKET',
  0x04: 'LOAD'
};
console.log('Command Type:', commandTypes[command] || 'UNKNOWN');
console.log('');

// Parse data (for TICKET command)
if (command === 0x03) {
  // For TICKET command in 20-byte format:
  // dataHigh = Ticket Number
  // dataLow = Ticket Type Byte
  const ticketNumber = parseInt(dataHighHex, 16);
  const ticketTypeByte = parseInt(dataLowHex, 16);
  
  console.log('Ticket Number (hex):', dataHighHex);
  console.log('Ticket Number (decimal):', ticketNumber);
  console.log('');
  
  console.log('Ticket Type Byte (hex):', dataLowHex);
  console.log('Ticket Type Byte (decimal):', ticketTypeByte);
  console.log('Ticket Type Byte (binary):', ticketTypeByte.toString(2).padStart(8, '0'));
  console.log('');
  
  // Parse ticket data byte
  const isOpen = (ticketTypeByte & 0x80) !== 0; // Bit 7
  const typeCode = ticketTypeByte & 0x0F; // Bits 0-3
  console.log('Bit 7 (Ticket Status):', isOpen ? '1 (OPEN)' : '0 (CLOSED)');
  console.log('Bits 0-3 (Type Code):', typeCode);
  console.log('');
  
  console.log('Ticket Status:', isOpen ? 'OPEN' : 'CLOSED');
  console.log('Ticket Type Code:', typeCode);
  
  const ticketTypes = {
    0: 'Trolley Movement',
    1: 'Hoist Movement',
    2: 'Slew Movement',
    3: 'Power Supply',
    4: 'Control System',
    5: 'Safety System',
    6: 'Communication',
    7: 'Sensor',
    8: 'Mechanical',
    9: 'Electrical',
    10: 'Hydraulic',
    11: 'Pneumatic',
    12: 'Environmental',
    13: 'Maintenance',
    14: 'Calibration',
    15: 'Unknown Issue'
  };
  console.log('Ticket Type:', ticketTypes[typeCode] || 'Unknown');
  console.log('');
  
  // Check CRC
  console.log('CRC16 (hex):', crcHex);
  if (crcHex) {
    console.log('CRC16 (decimal):', parseInt(crcHex, 16));
  }
}

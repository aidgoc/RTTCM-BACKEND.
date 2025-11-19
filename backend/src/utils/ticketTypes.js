/**
 * DRM3400 Ticket Type Mapping - MQTT Protocol
 * Based on legacy ticket descriptions matching MQTT data format
 */

const TICKET_TYPES = {
  0: { problem: 'Trolley Movement', description: 'Trolley movement issue', severity: 'warning' },
  1: { problem: 'Hook Movement', description: 'Hook movement issue', severity: 'warning' },
  2: { problem: 'Jib Rotation Problem', description: 'Jib rotation mechanism problem', severity: 'warning' },
  3: { problem: 'Inclination', description: 'Crane inclination detected', severity: 'critical' },
  4: { problem: 'Joystick Clutch', description: 'Joystick clutch malfunction', severity: 'warning' },
  5: { problem: 'Motor Overheat Burn', description: 'Motor overheating or burn detected', severity: 'critical' },
  6: { problem: 'Gearbox Problem', description: 'Gearbox malfunction', severity: 'warning' },
  7: { problem: 'Bearing Problem', description: 'Bearing issue detected', severity: 'warning' },
  8: { problem: 'Rope Problem', description: 'Rope damage or issue', severity: 'critical' },
  9: { problem: 'Motor Brake Not Working', description: 'Motor brake system failure', severity: 'critical' },
  10: { problem: 'Electric Problem', description: 'Electrical system issue', severity: 'warning' },
  11: { problem: 'Sensor Problem', description: 'Sensor malfunction or reading error', severity: 'warning' },
  12: { problem: 'Limit Switch Problem', description: 'Limit switch failure', severity: 'critical' },
  13: { problem: '2-Phase Supply Irregular', description: 'Two-phase power supply irregular', severity: 'critical' },
  14: { problem: 'End of Ticket Raise Options', description: 'End of ticket raise options', severity: 'info' }
};

/**
 * Get ticket type information
 * @param {number} typeCode - Ticket type code (0-14)
 * @returns {object} Ticket type details
 */
function getTicketType(typeCode) {
  return TICKET_TYPES[typeCode] || TICKET_TYPES[14]; // Default to "End of Ticket Raise Options"
}

/**
 * Parse ticket data byte
 * Bit 7: Ticket status (1=Open, 0=Closed)
 * Bits 0-3: Ticket type (0-15)
 * Bits 4-6: Don't care
 */
function parseTicketDataByte(dataByte) {
  const isOpen = (dataByte & 0x80) !== 0; // Bit 7
  const typeCode = dataByte & 0x0F;        // Bits 0-3
  
  return {
    isOpen,
    status: isOpen ? 'open' : 'closed',
    typeCode,
    typeInfo: getTicketType(typeCode)
  };
}

module.exports = {
  TICKET_TYPES,
  getTicketType,
  parseTicketDataByte
};


/**
 * DRM3400 Ticket Type Mapping
 * Based on manufacturer documentation Table 7
 */

const TICKET_TYPES = {
  0: { problem: 'Trolley Movement', description: 'Issue with trolley movement mechanism', severity: 'warning' },
  1: { problem: 'Hoist Movement', description: 'Issue with hoist movement mechanism', severity: 'warning' },
  2: { problem: 'Slew Movement', description: 'Issue with slewing mechanism', severity: 'warning' },
  3: { problem: 'Overload', description: 'Load exceeds safe working limit', severity: 'critical' },
  4: { problem: 'Limit Switch Failure', description: 'One or more limit switches failed', severity: 'critical' },
  5: { problem: 'Emergency Stop', description: 'Emergency stop activated', severity: 'critical' },
  6: { problem: 'Power Supply Issue', description: 'Problem with power supply', severity: 'warning' },
  7: { problem: 'Communication Error', description: 'Communication failure detected', severity: 'warning' },
  8: { problem: 'Sensor Malfunction', description: 'Sensor reading error', severity: 'warning' },
  9: { problem: 'Motor Overheating', description: 'Motor temperature too high', severity: 'critical' },
  10: { problem: 'Hydraulic Pressure', description: 'Hydraulic system pressure issue', severity: 'warning' },
  11: { problem: 'Brake System', description: 'Brake system malfunction', severity: 'critical' },
  12: { problem: 'Control System', description: 'Control system error', severity: 'critical' },
  13: { problem: 'Safety Device', description: 'Safety device triggered', severity: 'critical' },
  14: { problem: 'Maintenance Required', description: 'Scheduled maintenance due', severity: 'info' },
  15: { problem: 'Unknown Issue', description: 'Unspecified problem detected', severity: 'warning' }
};

/**
 * Get ticket type information
 * @param {number} typeCode - Ticket type code (0-15)
 * @returns {object} Ticket type details
 */
function getTicketType(typeCode) {
  return TICKET_TYPES[typeCode] || TICKET_TYPES[15];
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


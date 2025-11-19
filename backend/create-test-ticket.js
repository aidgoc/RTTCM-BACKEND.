/**
 * Create a test MQTT ticket for DM-123
 * Run with: node create-test-ticket.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Ticket = require('./src/models/Ticket');
const User = require('./src/models/User');

async function createTestTicket() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/crane-monitor');
    console.log('✅ Connected to MongoDB');

    // First, get or create a system user for ticket creation
    let systemUser = await User.findOne({ email: 'system@mqtt.local' });
    if (!systemUser) {
      console.log('📝 Creating system user for MQTT tickets...');
      systemUser = await User.create({
        name: 'MQTT System',
        email: 'system@mqtt.local',
        password: 'not-used',
        role: 'admin',
        isActive: true
      });
      console.log('✅ System user created');
    }

    // Check if DM-123 already has tickets
    const existingCount = await Ticket.countDocuments({ craneId: 'DM-123' });
    console.log(`\n📊 Existing tickets for DM-123: ${existingCount}`);

    // Create 3 test tickets for DM-123
    const testTickets = [
      {
        ticketId: `TKT-TEST-${Date.now()}-1`,
        craneId: 'DM-123',
        title: 'Motor Overheat Burn',
        description: 'Motor overheating or burn detected - Test ticket from MQTT',
        type: 'maintenance',
        severity: 'critical',
        status: 'open',
        priority: 'urgent',
        createdBy: systemUser._id,
        source: 'mqtt',
        mqttData: {
          deviceId: '123',
          ticketNumber: 1,
          ticketType: 5,
          raw: '$DM123[timestamp]030105#[CRC]'
        }
      },
      {
        ticketId: `TKT-TEST-${Date.now()}-2`,
        craneId: 'DM-123',
        title: 'Limit Switch Problem',
        description: 'Limit switch failure detected - Test ticket from MQTT',
        type: 'safety',
        severity: 'critical',
        status: 'open',
        priority: 'high',
        createdBy: systemUser._id,
        source: 'mqtt',
        mqttData: {
          deviceId: '123',
          ticketNumber: 2,
          ticketType: 12,
          raw: '$DM123[timestamp]03020C#[CRC]'
        }
      },
      {
        ticketId: `TKT-TEST-${Date.now()}-3`,
        craneId: 'DM-123',
        title: 'Electric Problem',
        description: 'Electrical system issue - Test ticket from MQTT',
        type: 'electrical',
        severity: 'warning',
        status: 'resolved',
        priority: 'normal',
        createdBy: systemUser._id,
        source: 'mqtt',
        resolution: 'Fixed by maintenance team',
        mqttData: {
          deviceId: '123',
          ticketNumber: 3,
          ticketType: 10,
          raw: '$DM123[timestamp]03030A#[CRC]'
        }
      }
    ];

    console.log('\n🎫 Creating test tickets for DM-123...\n');

    for (const ticketData of testTickets) {
      const ticket = await Ticket.create(ticketData);
      console.log(`✅ Created: ${ticket.ticketId} - ${ticket.title} (${ticket.status})`);
    }

    // Verify tickets were created
    const finalCount = await Ticket.countDocuments({ craneId: 'DM-123' });
    console.log(`\n📊 Total tickets for DM-123: ${finalCount}`);

    // Show all tickets
    const allTickets = await Ticket.find({ craneId: 'DM-123' }).sort({ createdAt: -1 });
    console.log('\n📋 All tickets for DM-123:');
    allTickets.forEach(t => {
      console.log(`   - ${t.ticketId}: ${t.title} (${t.status}, ${t.severity})`);
    });

    console.log('\n✅ Test tickets created successfully!');
    console.log('\n🎯 Now go to the Tickets page and select "DM-123" from the dropdown.');
    console.log('   You should see these test tickets appear.');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Disconnected from MongoDB');
    process.exit(0);
  }
}

createTestTicket();


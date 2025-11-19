/**
 * Quick script to check what tickets exist in the database
 * Run with: node check-tickets.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Ticket = require('./src/models/Ticket');

async function checkTickets() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/crane-monitor');
    console.log('✅ Connected to MongoDB');

    // Get all tickets
    const allTickets = await Ticket.find({}).sort({ createdAt: -1 }).limit(50);
    console.log(`\n📊 Total tickets in database: ${await Ticket.countDocuments({})}`);
    console.log(`\n🎫 Last 50 tickets:\n`);

    if (allTickets.length === 0) {
      console.log('❌ No tickets found in database!');
      console.log('\nPossible reasons:');
      console.log('  1. No MQTT tickets have been received yet');
      console.log('  2. MQTT messages are not being saved to database');
      console.log('  3. Crane ID format mismatch (check mqttClient.js)');
    } else {
      // Group tickets by craneId
      const ticketsByCrane = {};
      allTickets.forEach(ticket => {
        const craneId = ticket.craneId || 'UNKNOWN';
        if (!ticketsByCrane[craneId]) {
          ticketsByCrane[craneId] = [];
        }
        ticketsByCrane[craneId].push(ticket);
      });

      console.log('📋 Tickets grouped by Crane ID:\n');
      Object.keys(ticketsByCrane).forEach(craneId => {
        const tickets = ticketsByCrane[craneId];
        console.log(`  🏗️  ${craneId}: ${tickets.length} ticket(s)`);
        tickets.forEach(ticket => {
          console.log(`      - ${ticket.ticketId || ticket._id}: ${ticket.title || 'No title'} (${ticket.status})`);
        });
      });

      console.log('\n🔍 Sample ticket details (first ticket):\n');
      const sampleTicket = allTickets[0];
      console.log(JSON.stringify({
        _id: sampleTicket._id,
        ticketId: sampleTicket.ticketId,
        craneId: sampleTicket.craneId,
        title: sampleTicket.title,
        type: sampleTicket.type,
        status: sampleTicket.status,
        severity: sampleTicket.severity,
        createdAt: sampleTicket.createdAt
      }, null, 2));
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Disconnected from MongoDB');
    process.exit(0);
  }
}

checkTickets();


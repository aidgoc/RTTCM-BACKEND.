/**
 * Test the tickets API query directly
 * Run with: node test-api-query.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Ticket = require('./src/models/Ticket');

async function testQuery() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/crane-monitor');
    console.log('✅ Connected to MongoDB');

    // Test 1: Get ALL tickets from MongoDB
    console.log('\n📊 TEST 1: Direct MongoDB query for DM-123');
    const allTickets = await Ticket.find({ craneId: 'DM-123' });
    console.log(`Found ${allTickets.length} tickets for DM-123:`);
    allTickets.forEach(t => {
      console.log(`  ✅ ${t.ticketId}: ${t.title} (${t.status}, ${t.severity})`);
      console.log(`     craneId: "${t.craneId}"`);
      console.log(`     createdBy: ${t.createdBy}`);
    });

    // Test 2: Query with filters like the API does
    console.log('\n📊 TEST 2: Query with status="all" filter');
    const query = { craneId: 'DM-123' };
    // NOTE: API doesn't add status if it's 'all'
    const ticketsWithFilter = await Ticket.find(query);
    console.log(`Found ${ticketsWithFilter.length} tickets`);

    // Test 3: Check if query returns empty with wrong filters
    console.log('\n📊 TEST 3: Query that might fail');
    const badQuery = { craneId: 'DM-123', status: 'all' }; // This is WRONG!
    const badResult = await Ticket.find(badQuery);
    console.log(`Bad query result: ${badResult.length} tickets`);
    if (badResult.length === 0) {
      console.log('⚠️  FOUND THE BUG! status="all" returns 0 results!');
    }

    // Test 4: Check all tickets in database
    console.log('\n📊 TEST 4: All tickets in database');
    const totalTickets = await Ticket.countDocuments({});
    console.log(`Total tickets: ${totalTickets}`);

    // Get sample of all tickets
    const allTicketsSample = await Ticket.find({}).limit(10);
    console.log('\nFirst 10 tickets (any crane):');
    allTicketsSample.forEach(t => {
      console.log(`  - ${t.craneId}: ${t.title} (${t.status})`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Disconnected');
    process.exit(0);
  }
}

testQuery();


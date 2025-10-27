const mongoose = require('mongoose');
const Crane = require('./src/models/Crane');
const Telemetry = require('./src/models/Telemetry');
const Ticket = require('./src/models/Ticket');
const User = require('./src/models/User');
require('dotenv').config();

async function testEndpoints() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/cranefleet');
    console.log('✅ Connected to MongoDB');

    // Check existing data
    const craneCount = await Crane.countDocuments();
    const telemetryCount = await Telemetry.countDocuments();
    const ticketCount = await Ticket.countDocuments();
    const userCount = await User.countDocuments();

    console.log(`📊 Database Status:`);
    console.log(`   - Cranes: ${craneCount}`);
    console.log(`   - Telemetry: ${telemetryCount}`);
    console.log(`   - Tickets: ${ticketCount}`);
    console.log(`   - Users: ${userCount}`);

    // If no data, add some sample data
    if (telemetryCount === 0) {
      console.log('📝 Adding sample telemetry data...');
      
      const cranes = await Crane.find({ isActive: true });
      if (cranes.length === 0) {
        console.log('❌ No cranes found. Please add cranes first.');
        return;
      }

      // Add sample telemetry data
      const sampleTelemetry = [];
      const now = new Date();
      
      for (let i = 0; i < 50; i++) {
        const crane = cranes[Math.floor(Math.random() * cranes.length)];
        const timestamp = new Date(now.getTime() - (Math.random() * 24 * 60 * 60 * 1000));
        const load = Math.floor(Math.random() * crane.swl * 1.1);
        const util = Math.min(Math.floor((load / crane.swl) * 100), 100);
        
        sampleTelemetry.push({
          craneId: crane.craneId,
          ts: timestamp,
          load: load,
          swl: crane.swl,
          ls1: Math.random() > 0.95 ? 'FAIL' : 'OK',
          ls2: Math.random() > 0.98 ? 'FAIL' : 'OK',
          ls3: Math.random() > 0.96 ? 'FAIL' : 'OK',
          ut: Math.random() > 0.99 ? 'FAIL' : 'OK',
          util: util,
          raw: `TS=${timestamp.toISOString()};ID=${crane.craneId};LOAD=${load};SWL=${crane.swl};LS1=OK;LS2=OK;LS3=OK;UT=OK;UTIL=${util}`
        });
      }

      await Telemetry.insertMany(sampleTelemetry);
      console.log(`✅ Added ${sampleTelemetry.length} telemetry records`);
    }

    if (ticketCount === 0) {
      console.log('📝 Adding sample ticket data...');
      
      const cranes = await Crane.find({ isActive: true });
      const users = await User.find({ isActive: true });
      
      if (users.length === 0) {
        console.log('❌ No users found. Please add users first.');
        return;
      }

      // Add sample tickets
      const sampleTickets = [];
      const ticketTypes = ['overload', 'limit_switch', 'offline', 'utilization', 'manual'];
      const severities = ['critical', 'warning', 'info'];
      const statuses = ['open', 'in_progress', 'closed'];

      for (let i = 0; i < 20; i++) {
        const crane = cranes[Math.floor(Math.random() * cranes.length)];
        const user = users[Math.floor(Math.random() * users.length)];
        
        sampleTickets.push({
          craneId: crane.craneId,
          type: ticketTypes[Math.floor(Math.random() * ticketTypes.length)],
          severity: severities[Math.floor(Math.random() * severities.length)],
          message: `Sample ticket ${i + 1} for ${crane.craneId}`,
          createdBy: user.email,
          status: statuses[Math.floor(Math.random() * statuses.length)],
          createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
        });
      }

      await Ticket.insertMany(sampleTickets);
      console.log(`✅ Added ${sampleTickets.length} ticket records`);
    }

    // Test the data
    console.log('\n🧪 Testing data retrieval...');
    
    const testCrane = await Crane.findOne({ isActive: true });
    if (testCrane) {
      const telemetry = await Telemetry.find({ craneId: testCrane.craneId }).limit(5);
      const tickets = await Ticket.find({ craneId: testCrane.craneId }).limit(5);
      
      console.log(`✅ Found ${telemetry.length} telemetry records for crane ${testCrane.craneId}`);
      console.log(`✅ Found ${tickets.length} tickets for crane ${testCrane.craneId}`);
    }

    console.log('\n✅ Test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

testEndpoints();

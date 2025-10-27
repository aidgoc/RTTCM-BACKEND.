const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const User = require('./src/models/User');
const Crane = require('./src/models/Crane');
const Ticket = require('./src/models/Ticket');
const Telemetry = require('./src/models/Telemetry');
const LimitTest = require('./src/models/LimitTest');
const Settings = require('./src/models/Settings');

async function checkDatabaseData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Check Users
    console.log('👥 USERS:');
    console.log('========');
    const users = await User.find({}).select('name email role isActive createdAt');
    console.log(`Total Users: ${users.length}`);
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (${user.email}) - Role: ${user.role} - Active: ${user.isActive} - Created: ${user.createdAt.toLocaleDateString()}`);
    });
    console.log('');

    // Check Cranes
    console.log('🏗️ CRANES:');
    console.log('==========');
    const cranes = await Crane.find({}).select('craneId name location swl online lastSeen isActive');
    console.log(`Total Cranes: ${cranes.length}`);
    cranes.forEach((crane, index) => {
      console.log(`${index + 1}. ${crane.craneId} - ${crane.name} - Location: ${crane.location} - SWL: ${crane.swl}kg - Online: ${crane.online} - Active: ${crane.isActive}`);
      if (crane.lastSeen) {
        console.log(`   Last Seen: ${crane.lastSeen.toLocaleString()}`);
      }
    });
    console.log('');

    // Check Tickets
    console.log('🎫 TICKETS:');
    console.log('===========');
    const tickets = await Ticket.find({}).select('ticketId craneId title type severity status createdAt').populate('createdBy', 'name email');
    console.log(`Total Tickets: ${tickets.length}`);
    tickets.forEach((ticket, index) => {
      console.log(`${index + 1}. ${ticket.ticketId} - ${ticket.title} - Crane: ${ticket.craneId} - Type: ${ticket.type} - Severity: ${ticket.severity} - Status: ${ticket.status}`);
      console.log(`   Created: ${ticket.createdAt.toLocaleString()} by ${ticket.createdBy?.name || 'Unknown'}`);
    });
    console.log('');

    // Check Telemetry
    console.log('📊 TELEMETRY:');
    console.log('=============');
    const telemetry = await Telemetry.find({}).select('craneId ts load swl ls1 ls2 ls3 util').sort({ ts: -1 }).limit(10);
    console.log(`Total Telemetry Records: ${await Telemetry.countDocuments()}`);
    console.log('Latest 10 records:');
    telemetry.forEach((record, index) => {
      console.log(`${index + 1}. Crane: ${record.craneId} - Load: ${record.load}kg - SWL: ${record.swl}kg - Util: ${record.util}% - Time: ${record.ts.toLocaleString()}`);
      console.log(`   Limit Switches: LS1:${record.ls1} LS2:${record.ls2} LS3:${record.ls3}`);
    });
    console.log('');

    // Check Limit Tests
    console.log('🧪 LIMIT TESTS:');
    console.log('===============');
    const limitTests = await LimitTest.find({}).select('craneId testType status createdAt');
    console.log(`Total Limit Tests: ${limitTests.length}`);
    limitTests.forEach((test, index) => {
      console.log(`${index + 1}. Crane: ${test.craneId} - Type: ${test.testType} - Status: ${test.status} - Created: ${test.createdAt.toLocaleString()}`);
    });
    console.log('');

    // Check Settings
    console.log('⚙️ SETTINGS:');
    console.log('============');
    const settings = await Settings.find({}).select('key value updatedAt');
    console.log(`Total Settings: ${settings.length}`);
    settings.forEach((setting, index) => {
      console.log(`${index + 1}. ${setting.key}: ${setting.value} - Updated: ${setting.updatedAt.toLocaleString()}`);
    });
    console.log('');

    // Database Statistics
    console.log('📈 DATABASE STATISTICS:');
    console.log('=======================');
    console.log(`Users: ${await User.countDocuments()}`);
    console.log(`Cranes: ${await Crane.countDocuments()}`);
    console.log(`Tickets: ${await Ticket.countDocuments()}`);
    console.log(`Telemetry Records: ${await Telemetry.countDocuments()}`);
    console.log(`Limit Tests: ${await LimitTest.countDocuments()}`);
    console.log(`Settings: ${await Settings.countDocuments()}`);

    // Recent Activity
    console.log('\n🕒 RECENT ACTIVITY (Last 24 hours):');
    console.log('====================================');
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const recentUsers = await User.countDocuments({ createdAt: { $gte: yesterday } });
    const recentCranes = await Crane.countDocuments({ createdAt: { $gte: yesterday } });
    const recentTickets = await Ticket.countDocuments({ createdAt: { $gte: yesterday } });
    const recentTelemetry = await Telemetry.countDocuments({ ts: { $gte: yesterday } });
    
    console.log(`New Users: ${recentUsers}`);
    console.log(`New Cranes: ${recentCranes}`);
    console.log(`New Tickets: ${recentTickets}`);
    console.log(`New Telemetry Records: ${recentTelemetry}`);

  } catch (error) {
    console.error('❌ Error checking database:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

checkDatabaseData();

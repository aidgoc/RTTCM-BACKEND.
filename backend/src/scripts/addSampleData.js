const mongoose = require('mongoose');
const Crane = require('../models/Crane');
const Telemetry = require('../models/Telemetry');
const Ticket = require('../models/Ticket');
const User = require('../models/User');
require('dotenv').config();

async function addSampleData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cranefleet');
    console.log('Connected to MongoDB');

    // Get existing cranes and users
    const cranes = await Crane.find({});
    const users = await User.find({});

    if (cranes.length === 0) {
      console.log('No cranes found. Please add some cranes first.');
      return;
    }

    console.log(`Found ${cranes.length} cranes and ${users.length} users`);

    console.log(`Found ${cranes.length} cranes`);

    // Generate 2-3 recent telemetry records per crane
    const telemetryPerCrane = Math.max(2, Math.min(3, Math.floor(50 / cranes.length)));
    const totalTelemetry = telemetryPerCrane * cranes.length;
    console.log(`Adding ${totalTelemetry} recent telemetry records (${telemetryPerCrane} per crane)...`);
    const telemetryData = [];
    const now = new Date();

    for (let i = 0; i < totalTelemetry; i++) {
      const crane = cranes[Math.floor(Math.random() * cranes.length)];
      const timestamp = new Date(now.getTime() - (Math.random() * 24 * 60 * 60 * 1000)); // Last 24 hours
      
      const load = Math.floor(Math.random() * crane.swl * 1.1); // 0 to 110% of SWL
      const util = Math.min(Math.floor((load / crane.swl) * 100), 100);
      
      const ls1 = Math.random() > 0.95 ? 'FAIL' : 'OK';
      const ls2 = Math.random() > 0.98 ? 'FAIL' : 'OK';
      const ls3 = Math.random() > 0.96 ? 'FAIL' : 'OK';
      const ut = Math.random() > 0.99 ? 'FAIL' : 'OK';

      const raw = `TS=${timestamp.toISOString()};ID=${crane.craneId};LOAD=${load};SWL=${crane.swl};LS1=${ls1};LS2=${ls2};LS3=${ls3};UT=${ut};UTIL=${util}`;

      telemetryData.push({
        craneId: crane.craneId,
        ts: timestamp,
        load: load,
        swl: crane.swl,
        ls1: ls1,
        ls2: ls2,
        ls3: ls3,
        ut: ut,
        util: util,
        raw: raw
      });
    }

    await Telemetry.insertMany(telemetryData);
    console.log(`Added ${telemetryData.length} telemetry records`);

    // Generate 1-2 sample tickets per crane
    const ticketsPerCrane = Math.max(1, Math.min(2, Math.floor(20 / cranes.length)));
    const totalTickets = ticketsPerCrane * cranes.length;
    console.log(`Adding ${totalTickets} sample tickets (${ticketsPerCrane} per crane)...`);
    const tickets = [];

    // Sample tickets data
    const sampleTickets = [
      {
        craneId: cranes[0].craneId,
        type: 'overload',
        severity: 'critical',
        message: 'Crane overload detected: 120kg > 100kg SWL',
        description: 'The crane exceeded its Safe Working Load by 20kg. Immediate action required.',
        status: 'open',
        priority: 'high',
        tags: ['safety', 'overload', 'critical']
      },
      {
        craneId: cranes[0].craneId,
        type: 'limit_switch',
        severity: 'warning',
        message: 'Limit switch LS1 failure detected',
        description: 'Limit switch LS1 is reporting failure. Safety system may be compromised.',
        status: 'in_progress',
        priority: 'medium',
        tags: ['maintenance', 'limit_switch', 'safety']
      },
      {
        craneId: cranes[1]?.craneId || cranes[0].craneId,
        type: 'utilization',
        severity: 'info',
        message: 'High utilization detected: 98%',
        description: 'Crane operating at 98% utilization. Consider scheduling maintenance.',
        status: 'closed',
        priority: 'low',
        tags: ['utilization', 'performance', 'maintenance']
      },
      {
        craneId: cranes[1]?.craneId || cranes[0].craneId,
        type: 'manual',
        severity: 'warning',
        message: 'Scheduled maintenance required',
        description: 'Monthly maintenance check is due for this crane.',
        status: 'open',
        priority: 'medium',
        tags: ['manual', 'maintenance', 'scheduled']
      },
      {
        craneId: cranes[2]?.craneId || cranes[0].craneId,
        type: 'utility',
        severity: 'warning',
        message: 'Utility system failure detected',
        description: 'Power supply system reporting issues. Check electrical connections.',
        status: 'open',
        priority: 'high',
        tags: ['utility', 'power', 'maintenance']
      }
    ];

    for (let i = 0; i < 20; i++) {
      const sampleTicket = sampleTickets[i % sampleTickets.length];
      const user = users[Math.floor(Math.random() * users.length)] || users[0];
      
      tickets.push({
        ...sampleTicket,
        craneId: cranes[i % cranes.length].craneId,
        createdBy: user._id,
        assignedTo: user.role === 'admin' ? null : user._id,
        createdAt: new Date(now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Last 7 days
        updatedAt: new Date(now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        resolution: sampleTicket.status === 'closed' ? 'Issue resolved successfully.' : null
      });
    }

    await Ticket.insertMany(tickets);
    console.log(`Added ${tickets.length} tickets`);

    console.log('✅ Sample data added successfully!');

  } catch (error) {
    console.error('❌ Failed to add sample data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the function
addSampleData();

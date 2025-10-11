const mongoose = require('mongoose');
const User = require('../models/User');
const Crane = require('../models/Crane');
const Telemetry = require('../models/Telemetry');
const Ticket = require('../models/Ticket');
require('dotenv').config();

async function seedDatabase() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    console.log('Clearing existing data...');
    await User.deleteMany({});
    await Crane.deleteMany({});
    await Telemetry.deleteMany({});
    await Ticket.deleteMany({});

    // Create demo users
    console.log('Creating demo users...');
    const admin = new User({
      name: 'System Administrator',
      email: 'admin@cranefleet.com',
      passwordHash: 'password123', // Will be hashed by pre-save middleware
      role: 'admin'
    });

    const manager = new User({
      name: 'Sarah Johnson',
      email: 'manager@cranefleet.com',
      passwordHash: 'password123',
      role: 'manager'
    });

    const operator1 = new User({
      name: 'Mike Wilson',
      email: 'operator@cranefleet.com',
      passwordHash: 'password123',
      role: 'operator'
    });

    const operator2 = new User({
      name: 'Sarah Davis',
      email: 'operator2@cranefleet.com',
      passwordHash: 'password123',
      role: 'operator'
    });

    await admin.save();
    await manager.save();
    await operator1.save();
    await operator2.save();

    console.log('Created users:', {
      admin: admin.email,
      manager: manager.email,
      operator1: operator1.email,
      operator2: operator2.email
    });

    // Create demo cranes
    console.log('Creating demo cranes...');
    const cranes = [
      {
        craneId: 'TC-001',
        name: 'Tower Crane Alpha',
        location: 'Construction Site A - North Wing',
        swl: 100,
        managerUserId: manager._id,
        operators: [operator1._id],
        lastSeen: new Date(),
        online: true,
        lastStatusRaw: {
          load: 75,
          swl: 100,
          ls1: 'OK',
          ls2: 'OK',
          ls3: 'OK',
          ut: 'OK',
          util: 75
        }
      },
      {
        craneId: 'TC-002',
        name: 'Tower Crane Beta',
        location: 'Construction Site A - South Wing',
        swl: 80,
        managerUserId: manager._id,
        operators: [operator2._id],
        lastSeen: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago
        online: true,
        lastStatusRaw: {
          load: 45,
          swl: 80,
          ls1: 'OK',
          ls2: 'OK',
          ls3: 'OK',
          ut: 'OK',
          util: 56
        }
      },
      {
        craneId: 'TC-003',
        name: 'Tower Crane Gamma',
        location: 'Construction Site B - Main Building',
        swl: 120,
        managerUserId: manager._id,
        operators: [operator1._id, operator2._id],
        lastSeen: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
        online: false,
        lastStatusRaw: {
          load: 0,
          swl: 120,
          ls1: 'UNKNOWN',
          ls2: 'UNKNOWN',
          ls3: 'UNKNOWN',
          ut: 'UNKNOWN',
          util: 0
        }
      },
      {
        craneId: 'TC-004',
        name: 'Tower Crane Delta',
        location: 'Construction Site C - Parking Garage',
        swl: 100,
        managerUserId: manager._id,
        operators: [],
        lastSeen: new Date(),
        online: true,
        lastStatusRaw: {
          load: 120, // Overloaded!
          swl: 100,
          ls1: 'OK',
          ls2: 'OK',
          ls3: 'FAIL', // Limit switch failure
          ut: 'OK',
          util: 120
        }
      }
    ];

    const createdCranes = await Crane.insertMany(cranes);
    console.log(`Created ${createdCranes.length} cranes`);

    // Update manager's managed cranes
    manager.managedCranes = createdCranes.map(crane => crane.craneId);
    await manager.save();

    // Update operators' assigned cranes
    operator1.assignedCranes = ['TC-001', 'TC-003'];
    operator2.assignedCranes = ['TC-002', 'TC-003'];
    await operator1.save();
    await operator2.save();

    // Create sample telemetry data
    console.log('Creating sample telemetry data...');
    const telemetryData = [];
    const now = new Date();

    for (let i = 0; i < 100; i++) {
      const crane = createdCranes[Math.floor(Math.random() * createdCranes.length)];
      const timestamp = new Date(now.getTime() - i * 5 * 60 * 1000); // Every 5 minutes
      
      const load = Math.floor(Math.random() * crane.swl * 1.2); // 0 to 120% of SWL
      const util = Math.min(Math.floor((load / crane.swl) * 100), 100); // Cap at 100%
      
      const ls1 = Math.random() > 0.95 ? 'FAIL' : 'OK';
      const ls2 = Math.random() > 0.98 ? 'FAIL' : 'OK';
      const ls3 = Math.random() > 0.95 ? 'FAIL' : 'OK';
      const ut = Math.random() > 0.99 ? 'FAIL' : 'OK';

      // Randomly choose payload format
      const format = Math.floor(Math.random() * 3);
      let raw;

      switch (format) {
        case 0: // Semicolon format
          raw = `TS=${timestamp.toISOString()};ID=${crane.craneId};LOAD=${load};SWL=${crane.swl};LS1=${ls1};LS2=${ls2};LS3=${ls3};UT=${ut};UTIL=${util}`;
          break;
        case 1: // Pipe format
          raw = `${crane.craneId}|${timestamp.toISOString()}|LOAD:${load}|SWL:${crane.swl}|LS1:${ls1}|LS2:${ls2}|LS3:${ls3}|UT:${ut}|UTIL:${util}`;
          break;
        case 2: // JSON format
          raw = JSON.stringify({
            id: crane.craneId,
            ts: timestamp.toISOString(),
            load: load,
            swl: crane.swl,
            ls1: ls1,
            ls2: ls2,
            ls3: ls3,
            ut: ut,
            util: util
          });
          break;
      }

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
    console.log(`Created ${telemetryData.length} telemetry records`);

    // Create sample tickets
    console.log('Creating sample tickets...');
    const tickets = [
      {
        craneId: 'TC-004',
        type: 'overload',
        severity: 'critical',
        message: 'Crane overload detected: 120kg > 100kg SWL',
        createdBy: 'system',
        status: 'open'
      },
      {
        craneId: 'TC-004',
        type: 'limit_switch',
        severity: 'warning',
        message: 'Limit switch LS3 failure detected',
        createdBy: 'system',
        status: 'open'
      },
      {
        craneId: 'TC-003',
        type: 'offline',
        severity: 'warning',
        message: 'Crane offline for more than 5 minutes',
        createdBy: 'system',
        status: 'open'
      },
      {
        craneId: 'TC-001',
        type: 'manual',
        severity: 'info',
        message: 'Scheduled maintenance completed',
        createdBy: manager.email,
        status: 'closed',
        closedAt: new Date(),
        resolution: 'Maintenance completed successfully'
      }
    ];

    await Ticket.insertMany(tickets);
    console.log(`Created ${tickets.length} tickets`);

    console.log('\n✅ Database seeded successfully!');
    console.log('\nDemo credentials:');
    console.log('Admin: admin@cranefleet.com / password123');
    console.log('Manager: manager@cranefleet.com / password123');
    console.log('Operator: operator@cranefleet.com / password123');
    console.log('\nDemo cranes:');
    createdCranes.forEach(crane => {
      console.log(`- ${crane.craneId}: ${crane.name} (${crane.location})`);
    });

  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run if called directly
if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;

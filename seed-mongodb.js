// Seed MongoDB with Initial Data
const mongoose = require('mongoose');

const MONGO_URI = 'mongodb+srv://craneadmin:crane950@cluster0.5wgbbex.mongodb.net/cranefleet?retryWrites=true&w=majority&appName=Cluster0';

// Define Schemas (simple versions)
const userSchema = new mongoose.Schema({
  fullName: String,
  email: String,
  password: String,
  role: String,
  createdAt: { type: Date, default: Date.now }
});

const craneSchema = new mongoose.Schema({
  craneId: String,
  name: String,
  location: {
    type: { type: String, default: 'Point' },
    coordinates: [Number] // [longitude, latitude]
  },
  status: String,
  model: String,
  manufacturer: String,
  installationDate: Date,
  lastMaintenance: Date,
  createdAt: { type: Date, default: Date.now }
});

const telemetrySchema = new mongoose.Schema({
  craneId: String,
  timestamp: { type: Date, default: Date.now },
  load: Number,
  windSpeed: Number,
  angle: Number,
  height: Number,
  temperature: Number,
  status: String
});

const ticketSchema = new mongoose.Schema({
  craneId: String,
  title: String,
  description: String,
  priority: String,
  status: String,
  createdBy: String,
  createdAt: { type: Date, default: Date.now }
});

// Create Models
const User = mongoose.model('User', userSchema);
const Crane = mongoose.model('Crane', craneSchema);
const Telemetry = mongoose.model('Telemetry', telemetrySchema);
const Ticket = mongoose.model('Ticket', ticketSchema);

async function seedDatabase() {
  try {
    console.log('🔄 Connecting to MongoDB...\n');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB!\n');

    // Clear existing data (optional)
    console.log('🧹 Clearing existing data...');
    await User.deleteMany({});
    await Crane.deleteMany({});
    await Telemetry.deleteMany({});
    await Ticket.deleteMany({});
    console.log('✅ Cleared existing data\n');

    // 1. Create Users
    console.log('👤 Creating users...');
    const users = await User.insertMany([
      {
        fullName: 'John Manager',
        email: 'manager@cranefleet.com',
        password: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYILY8UqKOy', // hashed: password123
        role: 'manager'
      },
      {
        fullName: 'Sarah Supervisor',
        email: 'supervisor@cranefleet.com',
        password: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYILY8UqKOy',
        role: 'supervisor'
      },
      {
        fullName: 'Mike Operator',
        email: 'operator@cranefleet.com',
        password: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYILY8UqKOy',
        role: 'operator'
      }
    ]);
    console.log(`✅ Created ${users.length} users\n`);

    // 2. Create Cranes
    console.log('🏗️  Creating cranes...');
    const cranes = await Crane.insertMany([
      {
        craneId: 'TC-001',
        name: 'Tower Crane Alpha',
        location: {
          type: 'Point',
          coordinates: [-74.006, 40.7128] // New York
        },
        status: 'active',
        model: 'TC-5013',
        manufacturer: 'Liebherr',
        installationDate: new Date('2023-01-15'),
        lastMaintenance: new Date('2024-09-01')
      },
      {
        craneId: 'TC-002',
        name: 'Tower Crane Beta',
        location: {
          type: 'Point',
          coordinates: [-118.2437, 34.0522] // Los Angeles
        },
        status: 'active',
        model: 'TC-4510',
        manufacturer: 'Potain',
        installationDate: new Date('2023-03-20'),
        lastMaintenance: new Date('2024-08-15')
      },
      {
        craneId: 'TC-003',
        name: 'Tower Crane Gamma',
        location: {
          type: 'Point',
          coordinates: [-87.6298, 41.8781] // Chicago
        },
        status: 'maintenance',
        model: 'TC-6015',
        manufacturer: 'Terex',
        installationDate: new Date('2022-11-10'),
        lastMaintenance: new Date('2024-10-01')
      },
      {
        craneId: 'TC-004',
        name: 'Tower Crane Delta',
        location: {
          type: 'Point',
          coordinates: [-122.4194, 37.7749] // San Francisco
        },
        status: 'active',
        model: 'TC-5510',
        manufacturer: 'Liebherr',
        installationDate: new Date('2023-06-01'),
        lastMaintenance: new Date('2024-09-20')
      },
      {
        craneId: 'TC-005',
        name: 'Tower Crane Epsilon',
        location: {
          type: 'Point',
          coordinates: [-71.0589, 42.3601] // Boston
        },
        status: 'active',
        model: 'TC-4010',
        manufacturer: 'Potain',
        installationDate: new Date('2023-08-15'),
        lastMaintenance: new Date('2024-09-10')
      }
    ]);
    console.log(`✅ Created ${cranes.length} cranes\n`);

    // 3. Create Telemetry Data
    console.log('📊 Creating telemetry data...');
    const telemetryData = [];
    cranes.forEach(crane => {
      // Create 10 telemetry records for each crane
      for (let i = 0; i < 10; i++) {
        telemetryData.push({
          craneId: crane.craneId,
          timestamp: new Date(Date.now() - (i * 60 * 60 * 1000)), // Each hour back
          load: Math.floor(Math.random() * 5000) + 1000, // 1000-6000 kg
          windSpeed: Math.floor(Math.random() * 30) + 5, // 5-35 km/h
          angle: Math.floor(Math.random() * 360), // 0-360 degrees
          height: Math.floor(Math.random() * 50) + 10, // 10-60 meters
          temperature: Math.floor(Math.random() * 30) + 10, // 10-40°C
          status: crane.status
        });
      }
    });
    const telemetry = await Telemetry.insertMany(telemetryData);
    console.log(`✅ Created ${telemetry.length} telemetry records\n`);

    // 4. Create Tickets
    console.log('🎫 Creating maintenance tickets...');
    const tickets = await Ticket.insertMany([
      {
        craneId: 'TC-001',
        title: 'Routine Inspection Required',
        description: 'Monthly safety inspection due',
        priority: 'medium',
        status: 'open',
        createdBy: 'supervisor@cranefleet.com'
      },
      {
        craneId: 'TC-002',
        title: 'Cable Wear Detected',
        description: 'Main hoist cable showing signs of wear, needs replacement',
        priority: 'high',
        status: 'in-progress',
        createdBy: 'operator@cranefleet.com'
      },
      {
        craneId: 'TC-003',
        title: 'Scheduled Maintenance',
        description: 'Quarterly maintenance scheduled',
        priority: 'high',
        status: 'in-progress',
        createdBy: 'manager@cranefleet.com'
      },
      {
        craneId: 'TC-004',
        title: 'Lubrication Service',
        description: 'All moving parts need lubrication',
        priority: 'low',
        status: 'open',
        createdBy: 'supervisor@cranefleet.com'
      },
      {
        craneId: 'TC-001',
        title: 'Load Sensor Calibration',
        description: 'Load sensor readings seem off, needs calibration',
        priority: 'medium',
        status: 'open',
        createdBy: 'operator@cranefleet.com'
      }
    ]);
    console.log(`✅ Created ${tickets.length} tickets\n`);

    // Summary
    console.log('═══════════════════════════════════════');
    console.log('🎉 DATABASE SEEDED SUCCESSFULLY!');
    console.log('═══════════════════════════════════════');
    console.log('📊 Summary:');
    console.log(`   👤 Users: ${users.length}`);
    console.log(`   🏗️  Cranes: ${cranes.length}`);
    console.log(`   📈 Telemetry Records: ${telemetry.length}`);
    console.log(`   🎫 Tickets: ${tickets.length}`);
    console.log('═══════════════════════════════════════\n');

    console.log('📝 Test Users (all passwords: password123):');
    console.log('   Manager:    manager@cranefleet.com');
    console.log('   Supervisor: supervisor@cranefleet.com');
    console.log('   Operator:   operator@cranefleet.com\n');

    console.log('🌐 Check your MongoDB Atlas dashboard now!');
    console.log('   You should see 4 collections with data.\n');

    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
  }
}

// Run the seed
seedDatabase();


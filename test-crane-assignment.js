const mongoose = require('mongoose');
const User = require('./src/models/User');
const Crane = require('./src/models/Crane');
require('dotenv').config();

async function testCraneAssignment() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/test');
    console.log('✅ Connected to MongoDB');

    // Get manager user
    const manager = await User.findOne({ email: 'kishan@gmail.com' });
    console.log('Manager:', {
      name: manager.name,
      email: manager.email,
      role: manager.role,
      assignedCranes: manager.assignedCranes
    });

    // Get supervisor user
    const supervisor = await User.findOne({ email: 'john@gmail.com' });
    console.log('Supervisor:', {
      name: supervisor.name,
      email: supervisor.email,
      role: supervisor.role,
      assignedCranes: supervisor.assignedCranes
    });

    // Get all cranes
    const cranes = await Crane.find({ isActive: true });
    console.log('Available cranes:', cranes.map(c => ({
      craneId: c.craneId,
      name: c.name,
      location: c.location
    })));

    // Test the filtering logic that the frontend uses
    const availableCranes = cranes.filter(crane => {
      if (manager.role === 'admin') {
        return true;
      } else if (manager.role === 'manager') {
        return manager.assignedCranes && manager.assignedCranes.includes(crane.craneId);
      }
      return false;
    });

    console.log('\n🔍 Cranes available for assignment to supervisor:');
    availableCranes.forEach(crane => {
      console.log(`- ${crane.name} (${crane.craneId}) - ${crane.location}`);
    });

    if (availableCranes.length === 0) {
      console.log('❌ No cranes available for assignment!');
      console.log('Manager assignedCranes:', manager.assignedCranes);
      console.log('All crane IDs:', cranes.map(c => c.craneId));
    } else {
      console.log('✅ Cranes are available for assignment!');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

testCraneAssignment();

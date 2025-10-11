const mongoose = require('mongoose');
const User = require('./src/models/User');
const Crane = require('./src/models/Crane');

async function testSupervisorAssignments() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cranefleet');
    console.log('Connected to MongoDB');

    // Check all users
    const users = await User.find({}).select('name email role assignedCranesByManager managedCranes');
    console.log('\n=== ALL USERS ===');
    users.forEach(user => {
      console.log(`${user.name} (${user.email}) - Role: ${user.role}`);
      console.log(`  - assignedCranesByManager: ${user.assignedCranesByManager || 'none'}`);
      console.log(`  - managedCranes: ${user.managedCranes || 'none'}`);
    });

    // Check all cranes
    const cranes = await Crane.find({}).select('craneId name location isActive');
    console.log('\n=== ALL CRANES ===');
    cranes.forEach(crane => {
      console.log(`${crane.craneId} - ${crane.name} (${crane.location}) - Active: ${crane.isActive}`);
    });

    // Check supervisors specifically
    const supervisors = await User.find({ role: 'supervisor' });
    console.log('\n=== SUPERVISORS ===');
    supervisors.forEach(supervisor => {
      console.log(`${supervisor.name} (${supervisor.email})`);
      console.log(`  - assignedCranesByManager: ${supervisor.assignedCranesByManager || 'none'}`);
      console.log(`  - assignedCranesByManager length: ${supervisor.assignedCranesByManager?.length || 0}`);
    });

    // Check managers
    const managers = await User.find({ role: 'manager' });
    console.log('\n=== MANAGERS ===');
    managers.forEach(manager => {
      console.log(`${manager.name} (${manager.email})`);
      console.log(`  - managedCranes: ${manager.managedCranes || 'none'}`);
      console.log(`  - managedCranes length: ${manager.managedCranes?.length || 0}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

testSupervisorAssignments();

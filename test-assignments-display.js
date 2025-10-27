const mongoose = require('mongoose');
const User = require('./src/models/User');
const Crane = require('./src/models/Crane');
require('dotenv').config();

async function testAssignmentsDisplay() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/test');
    console.log('🔍 Testing Assignments Display:');
    console.log('==============================');
    
    // Get all users with their assignments
    const users = await User.find({});
    console.log('\n👥 User Assignments:');
    users.forEach(user => {
      console.log(`${user.name} (${user.role}) - ${user.email}`);
      console.log(`  Assigned Cranes: ${user.assignedCranes ? user.assignedCranes.join(', ') : 'None'}`);
      console.log('');
    });
    
    // Get all cranes
    const cranes = await Crane.find({ isActive: true });
    console.log('🏗️ Crane Assignments:');
    cranes.forEach(crane => {
      console.log(`\n${crane.name} (${crane.craneId})`);
      console.log(`  Manager: ${crane.managerUserId ? 'Assigned' : 'Unassigned'}`);
      console.log(`  Supervisor: ${crane.supervisorUserId ? 'Assigned' : 'Unassigned'}`);
      console.log(`  Operators: ${crane.operators ? crane.operators.length : 0} assigned`);
    });
    
    // Test the query that the assets page uses
    console.log('\n🔍 Testing Assets Page Queries:');
    for (const crane of cranes) {
      console.log(`\nFor Crane ${crane.craneId}:`);
      
      // Get supervisors assigned to this crane (new query)
      const supervisors = await User.find({
        role: 'supervisor',
        assignedCranes: crane.craneId
      }).select('name email');
      
      // Get operators assigned to this crane (new query)
      const operators = await User.find({
        role: 'operator',
        assignedCranes: crane.craneId
      }).select('name email');
      
      console.log(`  Supervisors: ${supervisors.map(s => s.name).join(', ') || 'Unassigned'}`);
      console.log(`  Operators: ${operators.map(o => o.name).join(', ') || 'Unassigned'}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

testAssignmentsDisplay();

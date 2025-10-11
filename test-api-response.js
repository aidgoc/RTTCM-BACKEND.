const mongoose = require('mongoose');
const User = require('./backend/src/models/User');
const Crane = require('./backend/src/models/Crane');

async function testAPIResponse() {
  try {
    await mongoose.connect('mongodb://localhost:27017/cranefleet');
    console.log('Connected to MongoDB');

    // Simulate the exact API logic from cranes.js
    const cranes = await Crane.find({}).populate('managerUserId', 'name email');
    
    const cranesWithStatus = await Promise.all(cranes.map(async (crane) => {
      // Get supervisors assigned to this crane
      const supervisors = await User.find({
        role: 'supervisor',
        assignedCranesByManager: crane.craneId
      }).select('name email');

      // Get actual operators assigned to this crane
      const operators = await User.find({
        role: 'operator',
        assignedCranesBySupervisor: crane.craneId
      }).select('name email');

      return {
        ...crane.toObject(),
        managerName: crane.managerUserId?.name || 'Unassigned',
        operatorNames: operators.map(op => op.name).join(', ') || 'Unassigned',
        supervisorNames: supervisors.map(sup => sup.name).join(', ') || 'Unassigned'
      };
    }));

    console.log('\n=== API RESPONSE SIMULATION ===');
    cranesWithStatus.forEach(crane => {
      console.log(`Crane: ${crane.name} (${crane.craneId})`);
      console.log(`  - Manager: ${crane.managerName}`);
      console.log(`  - Supervisors: ${crane.supervisorNames}`);
      console.log(`  - Operators: ${crane.operatorNames}`);
      console.log('---');
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testAPIResponse();

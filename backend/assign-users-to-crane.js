/**
 * Assign supervisors/operators to a crane
 * 
 * Usage:
 * node assign-users-to-crane.js <userEmail> <role> <craneId>
 * 
 * Examples:
 * node assign-users-to-crane.js supervisor@example.com supervisor DM-123
 * node assign-users-to-crane.js operator@example.com operator DM-123
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Crane = require('./src/models/Crane');
const User = require('./src/models/User');

const userEmail = process.argv[2];
const userRole = process.argv[3];
const craneId = process.argv[4] || 'DM-123';

async function assignUserToCrane() {
  try {
    if (!userEmail || !userRole) {
      console.log('❌ Usage: node assign-users-to-crane.js <userEmail> <role> [craneId]');
      console.log('');
      console.log('Examples:');
      console.log('  node assign-users-to-crane.js supervisor@example.com supervisor DM-123');
      console.log('  node assign-users-to-crane.js operator@example.com operator DM-456');
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find the user
    const user = await User.findOne({ email: userEmail });
    if (!user) {
      console.log(`❌ User not found: ${userEmail}`);
      process.exit(1);
    }

    // Find the crane
    const crane = await Crane.findOne({ craneId });
    if (!crane) {
      console.log(`❌ Crane not found: ${craneId}`);
      process.exit(1);
    }

    console.log('🔧 Assigning user to crane...\n');
    console.log(`   User: ${user.name} (${user.email}) [${user.role}]`);
    console.log(`   Crane: ${crane.name} (${crane.craneId})`);
    console.log('');

    // Update crane based on role
    let craneUpdated = false;
    if (userRole === 'supervisor') {
      if (!crane.assignedSupervisors) {
        crane.assignedSupervisors = [];
      }
      if (!crane.assignedSupervisors.includes(user._id.toString())) {
        crane.assignedSupervisors.push(user._id);
        craneUpdated = true;
      }
    } else if (userRole === 'operator') {
      if (!crane.operators) {
        crane.operators = [];
      }
      if (!crane.operators.includes(user._id.toString())) {
        crane.operators.push(user._id);
        craneUpdated = true;
      }
    } else if (userRole === 'manager') {
      crane.managerUserId = user._id;
      craneUpdated = true;
    } else {
      console.log(`❌ Invalid role: ${userRole}. Use 'manager', 'supervisor', or 'operator'`);
      process.exit(1);
    }

    if (craneUpdated) {
      await crane.save();
      console.log(`✅ Added user to crane.${
        userRole === 'supervisor' ? 'assignedSupervisors' : 
        userRole === 'operator' ? 'operators' : 
        'managerUserId'
      }`);
    } else {
      console.log(`ℹ️  User already in crane.${
        userRole === 'supervisor' ? 'assignedSupervisors' : 
        userRole === 'operator' ? 'operators' : 
        'managerUserId'
      }`);
    }

    // Update user with crane
    if (!user.assignedCranes) {
      user.assignedCranes = [];
    }
    if (!user.assignedCranes.includes(craneId)) {
      user.assignedCranes.push(craneId);
      await user.save();
      console.log('✅ Added crane to user.assignedCranes');
    } else {
      console.log('ℹ️  Crane already in user.assignedCranes');
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ SUCCESS! User assigned to crane.');
    console.log('='.repeat(60));
    console.log('');
    console.log('📊 Verification:');
    console.log(`   User assignedCranes: [${user.assignedCranes.join(', ')}]`);
    if (userRole === 'manager') {
      console.log(`   Crane managerUserId: ${crane.managerUserId}`);
    } else if (userRole === 'supervisor') {
      console.log(`   Crane supervisors: [${crane.assignedSupervisors.join(', ')}]`);
    } else {
      console.log(`   Crane operators: [${crane.operators.join(', ')}]`);
    }
    console.log('');
    console.log(`💡 ${user.name} should now be able to see the crane!`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

assignUserToCrane();


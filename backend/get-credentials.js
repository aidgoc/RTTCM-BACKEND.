const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config();

async function getCredentials() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/test');
    console.log('📋 Available Login Credentials:');
    console.log('================================');
    
    const users = await User.find({});
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (${user.role})`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Password: password123`);
      console.log(`   Assigned Cranes: ${user.assignedCranes.length > 0 ? user.assignedCranes.join(', ') : 'None'}`);
      console.log('');
    });
    
    console.log('🌐 Application URLs:');
    console.log('Frontend: http://localhost:3000');
    console.log('Backend API: http://localhost:3001');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

getCredentials();

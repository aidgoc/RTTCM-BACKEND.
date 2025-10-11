// Quick MongoDB Connection Test
// Run this to verify your MongoDB URL works before deploying

const mongoose = require('mongoose');

// Replace this with your actual MongoDB connection string
const MONGO_URI = 'mongodb+srv://craneadmin:crane950@cluster0.5wgbbex.mongodb.net/cranefleet?retryWrites=true&w=majority&appName=Cluster0';

async function testConnection() {
  console.log('🔄 Testing MongoDB connection...\n');
  
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ SUCCESS! MongoDB connection established!');
    console.log('📊 Connection details:');
    console.log(`   - Host: ${mongoose.connection.host}`);
    console.log(`   - Database: ${mongoose.connection.name}`);
    console.log(`   - Port: ${mongoose.connection.port}`);
    console.log('\n🎉 Your MongoDB URL is working correctly!');
    console.log('You can now use this URL for backend deployment.\n');
    
    // Disconnect
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    
  } catch (error) {
    console.error('❌ ERROR! Failed to connect to MongoDB');
    console.error('📝 Error details:', error.message);
    console.error('\n🔧 Common issues:');
    console.error('   1. Check if password is correct');
    console.error('   2. Ensure IP address 0.0.0.0/0 is whitelisted');
    console.error('   3. Verify connection string format');
    console.error('   4. Check if cluster is still being created (wait 2-3 minutes)\n');
  }
}

// Run the test
testConnection();


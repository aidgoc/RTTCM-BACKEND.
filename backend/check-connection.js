/**
 * Check what database we're connected to
 * Run with: node check-connection.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function checkConnection() {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/crane-monitor';
    console.log('📡 Connecting to:', mongoUri);
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
    
    // Get the database name
    const dbName = mongoose.connection.db.databaseName;
    console.log(`\n📊 Current Database: ${dbName}`);
    
    // List all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`\n📋 Collections in "${dbName}":`);
    collections.forEach(col => {
      console.log(`   - ${col.name}`);
    });
    
    // Count tickets in current database
    const Ticket = mongoose.connection.collection('tickets');
    const ticketCount = await Ticket.countDocuments({});
    console.log(`\n🎫 Total tickets in "${dbName}.tickets": ${ticketCount}`);
    
    if (ticketCount > 0) {
      const sampleTickets = await Ticket.find({}).limit(5).toArray();
      console.log(`\n📋 Sample tickets:`);
      sampleTickets.forEach(t => {
        console.log(`   - ${t.craneId}: ${t.title} (${t.status})`);
      });
    }
    
    // Check if we should be connecting to "test" database instead
    if (dbName !== 'test') {
      console.log(`\n⚠️  WARNING: Currently connected to "${dbName}" but tickets are in "test" database!`);
      console.log(`\n💡 Solution: Update MONGO_URI in .env file to:`);
      console.log(`   MONGO_URI=mongodb://localhost:27017/test`);
    } else {
      console.log(`\n✅ Connected to correct database: "test"`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Disconnected');
    process.exit(0);
  }
}

checkConnection();


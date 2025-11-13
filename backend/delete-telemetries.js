const mongoose = require('mongoose');
const Telemetry = require('./src/models/Telemetry');
require('dotenv').config();

/**
 * Script to delete telemetry documents from the test.telemetries collection
 * 
 * Usage:
 *   node delete-telemetries.js                    # Delete all documents
 *   node delete-telemetries.js --before 2024-01-01  # Delete before date
 *   node delete-telemetries.js --crane DM-123      # Delete for specific crane
 *   node delete-telemetries.js --count-only        # Just show count, don't delete
 */

async function deleteTelemetries() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/test';
    await mongoose.connect(mongoUri);
    console.log(`✅ Connected to MongoDB: ${mongoUri}`);
    console.log(`📊 Database: ${mongoose.connection.name}`);
    console.log(`📦 Collection: telemetries\n`);

    // Parse command line arguments
    const args = process.argv.slice(2);
    const countOnly = args.includes('--count-only');
    const beforeIndex = args.indexOf('--before');
    const craneIndex = args.indexOf('--crane');

    // Build query
    let query = {};
    let description = 'all telemetry documents';

    if (beforeIndex !== -1 && args[beforeIndex + 1]) {
      const beforeDate = new Date(args[beforeIndex + 1]);
      query.ts = { $lt: beforeDate };
      description = `telemetry documents before ${beforeDate.toISOString()}`;
    }

    if (craneIndex !== -1 && args[craneIndex + 1]) {
      query.craneId = args[craneIndex + 1];
      description = `telemetry documents for crane ${query.craneId}`;
    }

    // Count documents matching the query
    const count = await Telemetry.countDocuments(query);
    console.log(`📈 Found ${count.toLocaleString()} ${description}`);

    if (count === 0) {
      console.log('✅ No documents to delete.');
      await mongoose.disconnect();
      process.exit(0);
    }

    // Show sample documents
    if (count > 0 && count <= 10) {
      console.log('\n📋 Sample documents to be deleted:');
      const samples = await Telemetry.find(query).limit(5).sort({ ts: -1 });
      samples.forEach((doc, i) => {
        console.log(`   ${i + 1}. Crane: ${doc.craneId}, Timestamp: ${doc.ts}, Load: ${doc.load}`);
      });
    } else if (count > 10) {
      console.log('\n📋 Sample documents (showing first 5):');
      const samples = await Telemetry.find(query).limit(5).sort({ ts: -1 });
      samples.forEach((doc, i) => {
        console.log(`   ${i + 1}. Crane: ${doc.craneId}, Timestamp: ${doc.ts}, Load: ${doc.load}`);
      });
    }

    // If count-only flag, just show count and exit
    if (countOnly) {
      console.log('\nℹ️  Count-only mode: No documents deleted.');
      await mongoose.disconnect();
      process.exit(0);
    }

    // Safety confirmation
    console.log(`\n⚠️  WARNING: This will delete ${count.toLocaleString()} documents!`);
    console.log('   This action cannot be undone.\n');

    // For automated scripts, you can add a --force flag to skip confirmation
    if (args.includes('--force')) {
      console.log('🚀 Force flag detected, proceeding with deletion...\n');
    } else {
      // Use readline for interactive confirmation
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const answer = await new Promise((resolve) => {
        rl.question(`⚠️  Type 'DELETE' (all caps) to confirm deletion: `, resolve);
      });
      rl.close();

      if (answer !== 'DELETE') {
        console.log('❌ Deletion cancelled. No documents were deleted.');
        await mongoose.disconnect();
        process.exit(0);
      }
      console.log('🚀 Confirmation received, proceeding with deletion...\n');
    }

    // Perform deletion
    console.log('🗑️  Deleting documents...');
    const result = await Telemetry.deleteMany(query);
    
    console.log(`\n✅ Successfully deleted ${result.deletedCount.toLocaleString()} documents`);
    console.log(`📊 Remaining documents: ${(await Telemetry.countDocuments({})).toLocaleString()}`);

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run the script
deleteTelemetries();


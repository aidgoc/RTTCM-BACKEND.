const mongoose = require('mongoose');

async function checkData() {
  try {
    await mongoose.connect('mongodb://localhost:27017/test');
    console.log('Connected to MongoDB');
    
    // Check collections
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name));
    
    // Check crane data
    const Crane = mongoose.model('Crane', new mongoose.Schema({}, { strict: false }));
    const cranes = await Crane.find({});
    console.log('Cranes found:', cranes.length);
    if (cranes.length > 0) {
      console.log('First crane:', JSON.stringify(cranes[0], null, 2));
    }
    
    // Check telemetry data
    const Telemetry = mongoose.model('Telemetry', new mongoose.Schema({}, { strict: false }));
    const telemetryCount = await Telemetry.countDocuments({});
    console.log('Telemetry records:', telemetryCount);
    
    if (telemetryCount > 0) {
      const recentTelemetry = await Telemetry.find({}).sort({ timestamp: -1 }).limit(3);
      console.log('Recent telemetry:', recentTelemetry.map(t => ({
        timestamp: t.timestamp,
        load: t.load,
        ls1: t.ls1,
        ls2: t.ls2,
        ls3: t.ls3,
        ls4: t.ls4,
        util: t.util
      })));
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkData();

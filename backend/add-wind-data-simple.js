const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Telemetry = require('./src/models/Telemetry');
const Crane = require('./src/models/Crane');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/test', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function addWindSpeedData() {
  try {
    console.log('🌪️ Adding Wind Speed Data to TC-101...');
    console.log('=====================================');

    // Find TC-101 crane
    const crane = await Crane.findOne({ craneId: 'TC-101' });
    if (!crane) {
      console.log('❌ TC-101 crane not found!');
      return;
    }

    console.log(`✅ Found crane: ${crane.name} (${crane.craneId})`);

    // Get all telemetry records for TC-101
    const telemetryRecords = await Telemetry.find({ craneId: 'TC-101' }).sort({ ts: -1 });
    console.log(`📊 Found ${telemetryRecords.length} telemetry records`);

    if (telemetryRecords.length === 0) {
      console.log('❌ No telemetry records found for TC-101');
      return;
    }

    // Update each telemetry record with wind speed data
    let updatedCount = 0;
    for (let i = 0; i < telemetryRecords.length; i++) {
      const record = telemetryRecords[i];
      
      // Generate realistic wind speed data (0-25 km/h)
      // Higher wind speeds during certain hours (simulating weather patterns)
      const hour = record.ts.getHours();
      let windSpeed;
      
      if (hour >= 6 && hour <= 10) {
        // Morning: 5-15 km/h
        windSpeed = 5 + Math.random() * 10;
      } else if (hour >= 14 && hour <= 18) {
        // Afternoon: 8-20 km/h (windier)
        windSpeed = 8 + Math.random() * 12;
      } else if (hour >= 20 && hour <= 23) {
        // Evening: 3-12 km/h
        windSpeed = 3 + Math.random() * 9;
      } else {
        // Night/Early morning: 2-8 km/h
        windSpeed = 2 + Math.random() * 6;
      }

      // Add some variation based on record index (simulating changing conditions)
      windSpeed += (Math.random() - 0.5) * 3;
      windSpeed = Math.max(0, Math.min(25, windSpeed)); // Clamp between 0-25 km/h

      // Parse existing raw data
      let rawData = {};
      try {
        rawData = JSON.parse(record.raw || '{}');
      } catch (e) {
        rawData = {};
      }

      // Add wind speed to raw data
      rawData.windSpeed = parseFloat(windSpeed.toFixed(1));
      rawData.windDirection = Math.floor(Math.random() * 360); // Random wind direction
      rawData.temperature = 20 + Math.random() * 15; // Temperature 20-35°C
      rawData.humidity = 40 + Math.random() * 40; // Humidity 40-80%

      // Update the record
      await Telemetry.updateOne(
        { _id: record._id },
        { 
          $set: { 
            raw: JSON.stringify(rawData)
          }
        }
      );

      updatedCount++;
      
      if (updatedCount % 10 === 0) {
        console.log(`📝 Updated ${updatedCount}/${telemetryRecords.length} records...`);
      }
    }

    console.log(`✅ Successfully updated ${updatedCount} telemetry records with wind speed data`);

    // Show sample of updated data
    console.log('\n📊 Sample Updated Records:');
    console.log('==========================');
    const sampleRecords = await Telemetry.find({ craneId: 'TC-101' })
      .sort({ ts: -1 })
      .limit(5);
    
    sampleRecords.forEach((record, index) => {
      const rawData = JSON.parse(record.raw || '{}');
      console.log(`${index + 1}. Time: ${record.ts.toLocaleString()}`);
      console.log(`   Wind Speed: ${rawData.windSpeed || 'N/A'} km/h`);
      console.log(`   Wind Direction: ${rawData.windDirection || 'N/A'}°`);
      console.log(`   Temperature: ${rawData.temperature || 'N/A'}°C`);
      console.log(`   Humidity: ${rawData.humidity || 'N/A'}%`);
      console.log(`   Load: ${record.load}kg, Utilization: ${record.util}%`);
      console.log('');
    });

    // Show wind speed statistics
    const allRecords = await Telemetry.find({ craneId: 'TC-101' });
    const windSpeeds = allRecords
      .map(r => {
        try {
          const raw = JSON.parse(r.raw || '{}');
          return raw.windSpeed || 0;
        } catch {
          return 0;
        }
      })
      .filter(ws => ws > 0);

    if (windSpeeds.length > 0) {
      const avgWindSpeed = windSpeeds.reduce((a, b) => a + b, 0) / windSpeeds.length;
      const maxWindSpeed = Math.max(...windSpeeds);
      const minWindSpeed = Math.min(...windSpeeds);
      
      console.log('🌪️ Wind Speed Statistics:');
      console.log('=========================');
      console.log(`📊 Average: ${avgWindSpeed.toFixed(1)} km/h`);
      console.log(`📈 Maximum: ${maxWindSpeed.toFixed(1)} km/h`);
      console.log(`📉 Minimum: ${minWindSpeed.toFixed(1)} km/h`);
      console.log(`📋 Records with wind data: ${windSpeeds.length}/${allRecords.length}`);
    }

  } catch (error) {
    console.error('❌ Error adding wind speed data:', error);
  } finally {
    mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the script
addWindSpeedData();

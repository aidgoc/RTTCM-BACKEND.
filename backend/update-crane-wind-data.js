const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Crane = require('./src/models/Crane');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/test', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function updateCraneWindData() {
  try {
    console.log('🌪️ Updating Crane Wind Speed Data...');
    console.log('=====================================');

    // Find TC-101 crane
    const crane = await Crane.findOne({ craneId: 'TC-101' });
    if (!crane) {
      console.log('❌ TC-101 crane not found!');
      return;
    }

    console.log(`✅ Found crane: ${crane.name} (${crane.craneId})`);

    // Generate realistic wind speed data
    const hour = new Date().getHours();
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

    windSpeed = Math.max(0, Math.min(25, windSpeed)); // Clamp between 0-25 km/h

    // Update crane's lastStatusRaw with wind speed data
    const updatedStatusRaw = {
      ...crane.lastStatusRaw,
      windSpeed: parseFloat(windSpeed.toFixed(1)),
      windDirection: Math.floor(Math.random() * 360),
      temperature: 20 + Math.random() * 15,
      humidity: 40 + Math.random() * 40
    };

    await Crane.updateOne(
      { craneId: 'TC-101' },
      { 
        $set: { 
          lastStatusRaw: updatedStatusRaw
        }
      }
    );

    console.log('✅ Successfully updated crane with wind speed data');
    console.log('\n📊 Updated Crane Data:');
    console.log('======================');
    console.log(`🌪️ Wind Speed: ${updatedStatusRaw.windSpeed} km/h`);
    console.log(`🧭 Wind Direction: ${updatedStatusRaw.windDirection}°`);
    console.log(`🌡️ Temperature: ${updatedStatusRaw.temperature.toFixed(1)}°C`);
    console.log(`💧 Humidity: ${updatedStatusRaw.humidity.toFixed(1)}%`);
    console.log(`📦 Load: ${updatedStatusRaw.load}kg`);
    console.log(`⚡ Utilization: ${updatedStatusRaw.util}%`);

    // Show safety status
    console.log('\n🚨 Wind Speed Safety Status:');
    console.log('============================');
    if (updatedStatusRaw.windSpeed > 20) {
      console.log('🔴 DANGER: Wind speed exceeds safe operating limits (20+ km/h)');
    } else if (updatedStatusRaw.windSpeed > 15) {
      console.log('🟡 CAUTION: High wind speed detected (15-20 km/h)');
    } else {
      console.log('🟢 SAFE: Wind speed within normal operating range (0-15 km/h)');
    }

  } catch (error) {
    console.error('❌ Error updating crane wind data:', error);
  } finally {
    mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the script
updateCraneWindData();

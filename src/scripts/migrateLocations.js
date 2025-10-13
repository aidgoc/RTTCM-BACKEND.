/**
 * Migration script to convert existing crane locations to new locationData format
 * This script adds GPS coordinates and location metadata to existing cranes
 */

const mongoose = require('mongoose');
require('dotenv').config();

// City coordinates mapping (same as frontend)
const cityCoordinates = {
  'HUBBALI-DHARWAD': [75.1240, 15.3647], // [lng, lat]
  'GADAG': [75.6167, 15.4167],
  'BENGALURU': [77.5946, 12.9716],
  'MUMBAI': [72.8777, 19.0760],
  'DELHI': [77.1025, 28.7041],
  'CHENNAI': [80.2707, 13.0827],
  'KOLKATA': [88.3639, 22.5726],
  'HYDERABAD': [78.4867, 17.3850],
  'PUNE': [73.8567, 18.5204],
  'AHMEDABAD': [72.5714, 23.0225],
  'JAIPUR': [75.7873, 26.9124]
};

// Crane schema (imported)
const craneSchema = new mongoose.Schema({
  craneId: String,
  name: String,
  location: String,
  locationData: {
    coordinates: [Number],
    siteAddress: String,
    locationSource: String,
    city: String,
    locationAccuracy: Number,
    locationMethod: String
  }
});

const Crane = mongoose.model('Crane', craneSchema);

/**
 * Calculate grid offset for multiple cranes in same city
 */
function calculateGridOffset(cranesInCity, craneIndex) {
  if (cranesInCity.length <= 1) {
    return [0, 0]; // No offset for single crane
  }
  
  const gridSize = Math.ceil(Math.sqrt(cranesInCity.length));
  const row = Math.floor(craneIndex / gridSize);
  const col = craneIndex % gridSize;
  
  // 500m spacing (0.005 degrees ≈ 500m)
  const offsetLat = (row - (gridSize - 1) / 2) * 0.005;
  const offsetLng = (col - (gridSize - 1) / 2) * 0.005;
  
  return [offsetLng, offsetLat]; // [lng, lat]
}

/**
 * Get city name from location string
 */
function extractCityFromLocation(location) {
  const locationUpper = location.toUpperCase();
  
  // Check for exact matches first
  for (const city of Object.keys(cityCoordinates)) {
    if (locationUpper.includes(city)) {
      return city;
    }
  }
  
  // Check for partial matches
  if (locationUpper.includes('HUBBALI') || locationUpper.includes('DHARWAD')) {
    return 'HUBBALI-DHARWAD';
  }
  if (locationUpper.includes('BANGALORE') || locationUpper.includes('BENGALURU')) {
    return 'BENGALURU';
  }
  if (locationUpper.includes('MUMBAI') || locationUpper.includes('BOMBAY')) {
    return 'MUMBAI';
  }
  if (locationUpper.includes('DELHI') || locationUpper.includes('NEW DELHI')) {
    return 'DELHI';
  }
  if (locationUpper.includes('CHENNAI') || locationUpper.includes('MADRAS')) {
    return 'CHENNAI';
  }
  if (locationUpper.includes('KOLKATA') || locationUpper.includes('CALCUTTA')) {
    return 'KOLKATA';
  }
  if (locationUpper.includes('HYDERABAD')) {
    return 'HYDERABAD';
  }
  if (locationUpper.includes('PUNE')) {
    return 'PUNE';
  }
  if (locationUpper.includes('AHMEDABAD')) {
    return 'AHMEDABAD';
  }
  if (locationUpper.includes('JAIPUR')) {
    return 'JAIPUR';
  }
  
  // Default to Hubballi if no match
  return 'HUBBALI-DHARWAD';
}

/**
 * Add sample GSM location data to some cranes for testing
 */
async function addSampleGsmData() {
  try {
    console.log('📡 Adding sample GSM location data...');
    
    // Get a few cranes to add GSM data to
    const cranes = await Crane.find({}).limit(3);
    
    for (const crane of cranes) {
      if (crane.locationData && crane.locationData.coordinates) {
        // Add GSM accuracy data
        const accuracy = Math.floor(Math.random() * 200) + 50; // 50-250m accuracy
        const method = 'gsm';
        
        await Crane.findByIdAndUpdate(crane._id, {
          $set: {
            'locationData.locationAccuracy': accuracy,
            'locationData.locationMethod': method,
            'locationData.locationSource': 'gsm_triangulation'
          }
        });
        
        console.log(`📡 Added GSM data to ${crane.craneId}: ±${accuracy}m accuracy`);
      }
    }
    
    console.log('✅ Sample GSM data added successfully');
  } catch (error) {
    console.error('❌ Error adding sample GSM data:', error);
  }
}

/**
 * Main migration function
 */
async function migrateLocations() {
  try {
    console.log('🚀 Starting location migration...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/cranefleet');
    console.log('✅ Connected to MongoDB');
    
    // Get all cranes
    const cranes = await Crane.find({});
    console.log(`📊 Found ${cranes.length} cranes to migrate`);
    
    if (cranes.length === 0) {
      console.log('ℹ️  No cranes found to migrate');
      return;
    }
    
    // Group cranes by city for grid positioning
    const cranesByCity = {};
    cranes.forEach(crane => {
      const city = extractCityFromLocation(crane.location);
      if (!cranesByCity[city]) {
        cranesByCity[city] = [];
      }
      cranesByCity[city].push(crane);
    });
    
    console.log('🏙️  Cities found:', Object.keys(cranesByCity));
    
    let migratedCount = 0;
    let skippedCount = 0;
    
    // Process each city
    for (const [city, cityCranes] of Object.entries(cranesByCity)) {
      console.log(`\n📍 Processing ${cityCranes.length} cranes in ${city}`);
      
      const baseCoords = cityCoordinates[city];
      if (!baseCoords) {
        console.log(`⚠️  No coordinates found for city: ${city}, skipping...`);
        skippedCount += cityCranes.length;
        continue;
      }
      
      // Process each crane in the city
      for (let i = 0; i < cityCranes.length; i++) {
        const crane = cityCranes[i];
        
        try {
          // Skip if already has locationData
          if (crane.locationData && crane.locationData.coordinates) {
            console.log(`⏭️  Skipping ${crane.craneId} - already has coordinates`);
            skippedCount++;
            continue;
          }
          
          // Calculate grid offset for multiple cranes in same city
          const gridOffset = calculateGridOffset(cityCranes, i);
          const finalCoords = [
            baseCoords[0] + gridOffset[0], // longitude
            baseCoords[1] + gridOffset[1]  // latitude
          ];
          
          // Determine location source
          let locationSource = 'city_default';
          if (cityCranes.length > 1) {
            locationSource = 'grid_offset';
          }
          
          // Update crane with new location data
          await Crane.findByIdAndUpdate(crane._id, {
            $set: {
              locationData: {
                coordinates: finalCoords,
                siteAddress: crane.location, // Use existing location as site address
                locationSource: locationSource,
                city: city,
                locationAccuracy: null, // No accuracy for estimated locations
                locationMethod: 'estimated' // City-based estimation
              }
            }
          });
          
          console.log(`✅ Migrated ${crane.craneId}: [${finalCoords[0].toFixed(6)}, ${finalCoords[1].toFixed(6)}] (${locationSource})`);
          migratedCount++;
          
        } catch (error) {
          console.error(`❌ Error migrating ${crane.craneId}:`, error.message);
          skippedCount++;
        }
      }
    }
    
    console.log('\n📈 Migration Summary:');
    console.log(`✅ Successfully migrated: ${migratedCount} cranes`);
    console.log(`⏭️  Skipped: ${skippedCount} cranes`);
    console.log(`📊 Total processed: ${migratedCount + skippedCount} cranes`);
    
    // Verify migration
    const cranesWithCoords = await Crane.countDocuments({
      'locationData.coordinates': { $exists: true, $ne: null }
    });
    console.log(`\n🔍 Verification: ${cranesWithCoords} cranes now have coordinates`);
    
    // Add sample GSM data for testing
    await addSampleGsmData();
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateLocations()
    .then(() => {
      console.log('🎉 Migration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateLocations, cityCoordinates, calculateGridOffset, extractCityFromLocation };

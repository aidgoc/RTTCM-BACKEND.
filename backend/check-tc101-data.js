const mongoose = require('mongoose');
const Crane = require('./src/models/Crane');
const Telemetry = require('./src/models/Telemetry');
const LimitTest = require('./src/models/LimitTest');

async function checkCraneData() {
  try {
    await mongoose.connect('mongodb://localhost:27017/test');
    console.log('Connected to MongoDB');
    
    // Find TC-101 crane
    const crane = await Crane.findOne({ craneId: 'TC-101' });
    console.log('\n=== CRANE DATA ===');
    console.log(JSON.stringify(crane, null, 2));
    
    // Find telemetry data for TC-101
    const telemetryCount = await Telemetry.countDocuments({ craneId: 'TC-101' });
    console.log('\n=== TELEMETRY COUNT ===');
    console.log('Total telemetry records:', telemetryCount);
    
    const recentTelemetry = await Telemetry.find({ craneId: 'TC-101' }).sort({ timestamp: -1 }).limit(5);
    console.log('\n=== RECENT TELEMETRY (last 5) ===');
    recentTelemetry.forEach((t, i) => {
      console.log(`${i+1}. ${t.timestamp}: Load=${t.load}, LS1=${t.ls1}, LS2=${t.ls2}, LS3=${t.ls3}, LS4=${t.ls4}, Util=${t.util}`);
    });
    
    // Find limit tests for TC-101
    const limitTestCount = await LimitTest.countDocuments({ craneId: 'TC-101' });
    console.log('\n=== LIMIT TEST COUNT ===');
    console.log('Total limit tests:', limitTestCount);
    
    const recentLimitTests = await LimitTest.find({ craneId: 'TC-101' }).sort({ testDate: -1 }).limit(3);
    console.log('\n=== RECENT LIMIT TESTS (last 3) ===');
    recentLimitTests.forEach((lt, i) => {
      console.log(`${i+1}. ${lt.testDate}: Type=${lt.testType}, Status=${lt.testStatus}, LS1=${lt.limitSwitches.ls1.status}, LS2=${lt.limitSwitches.ls2.status}, LS3=${lt.limitSwitches.ls3.status}, LS4=${lt.limitSwitches.ls4.status}`);
    });
    
    // Get all telemetry data to analyze patterns
    const allTelemetry = await Telemetry.find({ craneId: 'TC-101' }).sort({ timestamp: 1 });
    console.log('\n=== TELEMETRY ANALYSIS ===');
    console.log('Date range:', allTelemetry[0]?.timestamp, 'to', allTelemetry[allTelemetry.length-1]?.timestamp);
    
    // Calculate utilization patterns
    const hourlyData = {};
    allTelemetry.forEach(t => {
      const hour = new Date(t.timestamp).getHours();
      if (!hourlyData[hour]) {
        hourlyData[hour] = { total: 0, count: 0, loads: [] };
      }
      hourlyData[hour].total += t.util || 0;
      hourlyData[hour].count += 1;
      hourlyData[hour].loads.push(t.load || 0);
    });
    
    console.log('\n=== HOURLY UTILIZATION PATTERNS ===');
    Object.keys(hourlyData).sort((a,b) => a-b).forEach(hour => {
      const data = hourlyData[hour];
      const avgUtil = (data.total / data.count).toFixed(1);
      const maxLoad = Math.max(...data.loads);
      console.log(`Hour ${hour}:00 - Avg Util: ${avgUtil}%, Max Load: ${maxLoad}kg, Records: ${data.count}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkCraneData();

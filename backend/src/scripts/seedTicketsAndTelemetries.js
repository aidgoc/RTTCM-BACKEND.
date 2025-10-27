const mongoose = require('mongoose');
const Crane = require('../models/Crane');
const Telemetry = require('../models/Telemetry');
const Ticket = require('../models/Ticket');
const LimitTest = require('../models/LimitTest');
const User = require('../models/User');
require('dotenv').config();

async function seedTicketsAndTelemetries() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/cranefleet');
    console.log('Connected to MongoDB');

    // Get existing cranes and users
    const cranes = await Crane.find({ isActive: true });
    const users = await User.find({ isActive: true });
    
    console.log('Debug - Found cranes:', cranes.length);
    console.log('Debug - Found users:', users.length);

    if (cranes.length === 0) {
      console.log('No cranes found. Please seed cranes first.');
      return;
    }

    if (users.length === 0) {
      console.log('No users found. Please seed users first.');
      return;
    }

    console.log(`Found ${cranes.length} cranes and ${users.length} users`);

    // Clear existing telemetry, tickets, and limit tests
    await Telemetry.deleteMany({});
    await Ticket.deleteMany({});
    await LimitTest.deleteMany({});
    console.log('Cleared existing telemetry, tickets, and limit tests');

    // Generate telemetry data
    console.log('Generating telemetry data...');
    const telemetryData = [];
    const now = new Date();
    const craneIds = cranes.map(crane => crane.craneId);

    // Generate 1 telemetry record per crane (most recent)
    const totalTelemetry = cranes.length;
    console.log(`Generating ${totalTelemetry} telemetry records (1 per crane)`);
    
    for (let i = 0; i < totalTelemetry; i++) {
      const crane = cranes[i]; // Use each crane exactly once
      const timestamp = new Date(now.getTime() - (Math.random() * 60 * 60 * 1000)); // Last 1 hour
      
      // Generate realistic load data (0 to 120% of SWL)
      const load = Math.floor(Math.random() * crane.swl * 1.2);
      const util = Math.min(Math.floor((load / crane.swl) * 100), 100);
      
      // Generate limit switch statuses with realistic failure rates
      const ls1 = Math.random() > 0.95 ? 'FAIL' : 'OK';  // 5% failure rate
      const ls2 = Math.random() > 0.98 ? 'FAIL' : 'OK';  // 2% failure rate
      const ls3 = Math.random() > 0.96 ? 'FAIL' : 'OK';  // 4% failure rate
      const ut = Math.random() > 0.99 ? 'FAIL' : 'OK';   // 1% failure rate

      // Randomly choose payload format
      const format = Math.floor(Math.random() * 3);
      let raw;

      switch (format) {
        case 0: // Semicolon format
          raw = `TS=${timestamp.toISOString()};ID=${crane.craneId};LOAD=${load};SWL=${crane.swl};LS1=${ls1};LS2=${ls2};LS3=${ls3};UT=${ut};UTIL=${util}`;
          break;
        case 1: // Pipe format
          raw = `${crane.craneId}|${timestamp.toISOString()}|LOAD:${load}|SWL:${crane.swl}|LS1:${ls1}|LS2:${ls2}|LS3:${ls3}|UT:${ut}|UTIL:${util}`;
          break;
        case 2: // JSON format
          raw = JSON.stringify({
            id: crane.craneId,
            ts: timestamp.toISOString(),
            load: load,
            swl: crane.swl,
            ls1: ls1,
            ls2: ls2,
            ls3: ls3,
            ut: ut,
            util: util
          });
          break;
      }

      telemetryData.push({
        craneId: crane.craneId,
        ts: timestamp,
        load: load,
        swl: crane.swl,
        ls1: ls1,
        ls2: ls2,
        ls3: ls3,
        ut: ut,
        util: util,
        raw: raw
      });
    }

    // Insert telemetry data
    await Telemetry.insertMany(telemetryData);
    console.log(`Created ${telemetryData.length} telemetry records`);

    // Generate tickets based on telemetry data
    console.log('Generating tickets...');
    const tickets = [];
    const ticketTypes = ['overload', 'limit_switch', 'offline', 'utilization', 'manual'];
    const severities = ['critical', 'warning', 'info'];
    const statuses = ['open', 'in_progress', 'closed'];

    // Create tickets for overload conditions (1 per crane if overloaded)
    const overloadTelemetry = telemetryData.filter(t => t.load > t.swl);
    for (const telemetry of overloadTelemetry) {
      const crane = cranes.find(c => c.craneId === telemetry.craneId);
      const user = users[Math.floor(Math.random() * users.length)];
      
      tickets.push({
        craneId: telemetry.craneId,
        type: 'overload',
        severity: 'critical',
        message: `Crane overload detected: ${telemetry.load}kg > ${telemetry.swl}kg SWL`,
        description: `The crane exceeded its Safe Working Load (SWL) of ${telemetry.swl}kg by ${telemetry.load - telemetry.swl}kg. This is a critical safety violation that requires immediate attention.`,
        createdBy: user._id,
        assignedTo: user.role === 'admin' ? null : user._id,
        status: Math.random() > 0.3 ? 'closed' : 'open',
        priority: 'high',
        createdAt: new Date(telemetry.ts.getTime() + Math.random() * 3600000), // Within 1 hour of telemetry
        updatedAt: new Date(telemetry.ts.getTime() + Math.random() * 3600000),
        resolution: Math.random() > 0.3 ? 'Load reduced to safe levels. Operator retrained on SWL limits.' : null,
        tags: ['safety', 'overload', 'critical']
      });
    }

    // Create tickets for limit switch failures (1 per crane if failed)
    const limitSwitchFailures = telemetryData.filter(t => t.ls1 === 'FAIL' || t.ls2 === 'FAIL' || t.ls3 === 'FAIL');
    for (const telemetry of limitSwitchFailures) {
      const crane = cranes.find(c => c.craneId === telemetry.craneId);
      const user = users[Math.floor(Math.random() * users.length)];
      const failedSwitches = [];
      if (telemetry.ls1 === 'FAIL') failedSwitches.push('LS1');
      if (telemetry.ls2 === 'FAIL') failedSwitches.push('LS2');
      if (telemetry.ls3 === 'FAIL') failedSwitches.push('LS3');
      
      tickets.push({
        craneId: telemetry.craneId,
        type: 'limit_switch',
        severity: failedSwitches.length > 1 ? 'critical' : 'warning',
        message: `Limit switch failure detected: ${failedSwitches.join(', ')}`,
        description: `The following limit switches are reporting failure: ${failedSwitches.join(', ')}. This affects crane safety systems and requires immediate inspection.`,
        createdBy: user._id,
        assignedTo: user.role === 'admin' ? null : user._id,
        status: Math.random() > 0.4 ? 'closed' : 'open',
        priority: failedSwitches.length > 1 ? 'high' : 'medium',
        createdAt: new Date(telemetry.ts.getTime() + Math.random() * 1800000), // Within 30 minutes
        updatedAt: new Date(telemetry.ts.getTime() + Math.random() * 1800000),
        resolution: Math.random() > 0.4 ? 'Limit switches inspected and replaced. System functioning normally.' : null,
        tags: ['maintenance', 'limit_switch', 'safety']
      });
    }

    // Create tickets for utility failures (1 per crane if failed)
    const utilityFailures = telemetryData.filter(t => t.ut === 'FAIL');
    for (const telemetry of utilityFailures) {
      const crane = cranes.find(c => c.craneId === telemetry.craneId);
      const user = users[Math.floor(Math.random() * users.length)];
      
      tickets.push({
        craneId: telemetry.craneId,
        type: 'utilization',
        severity: 'warning',
        message: `Utility system failure detected`,
        description: `The crane's utility system is reporting failure. This may affect power supply or other critical systems.`,
        createdBy: user._id,
        assignedTo: user.role === 'admin' ? null : user._id,
        status: Math.random() > 0.5 ? 'closed' : 'open',
        priority: 'medium',
        createdAt: new Date(telemetry.ts.getTime() + Math.random() * 900000), // Within 15 minutes
        updatedAt: new Date(telemetry.ts.getTime() + Math.random() * 900000),
        resolution: Math.random() > 0.5 ? 'Utility system restored. Power supply checked and stabilized.' : null,
        tags: ['utility', 'power', 'maintenance']
      });
    }

    // Create tickets for high utilization
    const highUtilization = telemetryData.filter(t => t.util > 95);
    for (const telemetry of highUtilization.slice(0, 12)) { // Limit to 12 utilization tickets
      const crane = cranes.find(c => c.craneId === telemetry.craneId);
      const user = users[Math.floor(Math.random() * users.length)];
      
      tickets.push({
        craneId: telemetry.craneId,
        type: 'utilization',
        severity: 'info',
        message: `High utilization detected: ${telemetry.util}%`,
        description: `The crane is operating at ${telemetry.util}% utilization, which is above the recommended threshold of 95%. Consider scheduling maintenance or reducing workload.`,
        createdBy: user._id,
        assignedTo: user.role === 'admin' ? null : user._id,
        status: Math.random() > 0.6 ? 'closed' : 'open',
        priority: 'low',
        createdAt: new Date(telemetry.ts.getTime() + Math.random() * 7200000), // Within 2 hours
        updatedAt: new Date(telemetry.ts.getTime() + Math.random() * 7200000),
        resolution: Math.random() > 0.6 ? 'Utilization monitored and workload adjusted. Maintenance scheduled.' : null,
        tags: ['utilization', 'performance', 'maintenance']
      });
    }

    // Create some manual tickets
    for (let i = 0; i < cranes.length; i++) {
      const crane = cranes[i];
      const user = users[Math.floor(Math.random() * users.length)];
      const manualMessages = [
        'Scheduled maintenance required',
        'Crane inspection overdue',
        'Operator training needed',
        'Safety equipment check required',
        'Weather-related shutdown',
        'Site access issue reported',
        'Communication system check',
        'Load testing required',
        'Documentation update needed',
        'Emergency stop test failed'
      ];
      
      tickets.push({
        craneId: crane.craneId,
        type: 'manual',
        severity: severities[Math.floor(Math.random() * severities.length)],
        message: manualMessages[i],
        description: `Manual ticket created for ${crane.name} (${crane.craneId}). This ticket was created to address specific operational requirements or maintenance needs.`,
        createdBy: user._id,
        assignedTo: user.role === 'admin' ? null : user._id,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        priority: Math.random() > 0.5 ? 'medium' : 'low',
        createdAt: new Date(now.getTime() - Math.random() * 3 * 24 * 60 * 60 * 1000), // Last 3 days
        updatedAt: new Date(now.getTime() - Math.random() * 3 * 24 * 60 * 60 * 1000),
        resolution: Math.random() > 0.7 ? 'Issue resolved successfully. All requirements met.' : null,
        tags: ['manual', 'maintenance', 'operational']
      });
    }

    // Insert tickets
    await Ticket.insertMany(tickets);
    console.log(`Created ${tickets.length} tickets`);

    // Update crane last seen times based on latest telemetry
    console.log('Updating crane last seen times...');
    for (const crane of cranes) {
      const latestTelemetry = telemetryData
        .filter(t => t.craneId === crane.craneId)
        .sort((a, b) => b.ts - a.ts)[0];
      
      if (latestTelemetry) {
        await Crane.updateOne(
          { craneId: crane.craneId },
          { 
            lastSeen: latestTelemetry.ts,
            online: new Date() - latestTelemetry.ts < 5 * 60 * 1000 // Online if last seen within 5 minutes
          }
        );
      }
    }

    // Generate limit tests (1 per crane)
    console.log('Generating limit test data...');
    const limitTests = [];
    
    for (const crane of cranes) {
      const user = users[Math.floor(Math.random() * users.length)];
      
      // Generate realistic limit switch data
      const limitSwitches = {
        ls1: {
          status: Math.random() > 0.9 ? 'FAIL' : Math.random() > 0.8 ? 'UNKNOWN' : 'OK',
          responseTime: Math.floor(Math.random() * 2000) + 100,
          threshold: Math.floor(Math.random() * 10) + 5,
          notes: Math.random() > 0.7 ? 'Minor adjustment needed' : ''
        },
        ls2: {
          status: Math.random() > 0.95 ? 'FAIL' : Math.random() > 0.85 ? 'UNKNOWN' : 'OK',
          responseTime: Math.floor(Math.random() * 1500) + 150,
          threshold: Math.floor(Math.random() * 8) + 6,
          notes: Math.random() > 0.8 ? 'Working within normal parameters' : ''
        },
        ls3: {
          status: Math.random() > 0.92 ? 'FAIL' : Math.random() > 0.82 ? 'UNKNOWN' : 'OK',
          responseTime: Math.floor(Math.random() * 1800) + 120,
          threshold: Math.floor(Math.random() * 12) + 4,
          notes: Math.random() > 0.75 ? 'Good condition' : ''
        }
      };

      // Generate utility test data
      const utilityTest = {
        status: Math.random() > 0.95 ? 'FAIL' : Math.random() > 0.9 ? 'UNKNOWN' : 'OK',
        responseTime: Math.floor(Math.random() * 1000) + 200,
        powerLevel: Math.floor(Math.random() * 40) + 60,
        notes: Math.random() > 0.8 ? 'Power levels stable' : ''
      };

      // Calculate test results
      const criticalFailures = [];
      const warnings = [];
      const recommendations = [];

      Object.entries(limitSwitches).forEach(([key, switchData]) => {
        if (switchData.status === 'FAIL') {
          criticalFailures.push(`${key.toUpperCase()} failed`);
        } else if (switchData.status === 'UNKNOWN') {
          warnings.push(`${key.toUpperCase()} status unknown`);
        }
        
        if (switchData.responseTime > 1000) {
          warnings.push(`${key.toUpperCase()} slow response time`);
        }
      });

      if (utilityTest.status === 'FAIL') {
        criticalFailures.push('Utility system failed');
      }
      
      if (utilityTest.powerLevel < 80) {
        warnings.push('Low power level detected');
      }

      if (criticalFailures.length > 0) {
        recommendations.push('Immediate maintenance required');
      }
      
      if (warnings.length > 2) {
        recommendations.push('Schedule preventive maintenance');
      }

      const overallPassed = criticalFailures.length === 0;
      
      const testData = {
        loadAtTest: Math.floor(Math.random() * crane.swl * 0.8),
        swlAtTest: crane.swl,
        utilizationAtTest: Math.floor(Math.random() * 80) + 10,
        environmentalConditions: {
          temperature: Math.floor(Math.random() * 30) + 10,
          humidity: Math.floor(Math.random() * 60) + 30,
          windSpeed: Math.floor(Math.random() * 20) + 5
        }
      };

      const testDate = new Date(now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000);
      const nextTestDue = new Date(testDate.getTime() + (30 + Math.random() * 30) * 24 * 60 * 60 * 1000);

      const limitTest = new LimitTest({
        craneId: crane.craneId,
        testType: Math.random() > 0.7 ? 'scheduled' : 'manual',
        testDate: testDate,
        testStatus: overallPassed ? 'passed' : 'failed',
        limitSwitches: limitSwitches,
        utilityTest: utilityTest,
        testResults: {
          overallPassed: overallPassed,
          criticalFailures: criticalFailures,
          warnings: warnings,
          recommendations: recommendations
        },
        testData: testData,
        performedBy: user._id,
        testDuration: Math.floor(Math.random() * 60) + 30,
        nextTestDue: nextTestDue,
        maintenanceRequired: criticalFailures.length > 0,
        maintenanceNotes: criticalFailures.length > 0 ? 'Critical failures detected - immediate action required' : 
                         warnings.length > 2 ? 'Multiple warnings - schedule maintenance' : 
                         'System operating normally'
      });

      limitTests.push(limitTest);
    }

    // Insert limit tests
    await LimitTest.insertMany(limitTests);
    console.log(`Created ${limitTests.length} limit tests`);

    console.log('✅ Seeding completed successfully!');
    console.log(`📊 Summary:`);
    console.log(`   - Telemetry records: ${telemetryData.length}`);
    console.log(`   - Tickets created: ${tickets.length}`);
    console.log(`   - Limit tests created: ${limitTests.length}`);
    console.log(`   - Overload tickets: ${tickets.filter(t => t.type === 'overload').length}`);
    console.log(`   - Limit switch tickets: ${tickets.filter(t => t.type === 'limit_switch').length}`);
    console.log(`   - Utility tickets: ${tickets.filter(t => t.type === 'utility').length}`);
    console.log(`   - Utilization tickets: ${tickets.filter(t => t.type === 'utilization').length}`);
    console.log(`   - Manual tickets: ${tickets.filter(t => t.type === 'manual').length}`);

  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the seeding function
seedTicketsAndTelemetries();

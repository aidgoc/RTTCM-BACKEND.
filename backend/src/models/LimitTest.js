const mongoose = require('mongoose');

const limitTestSchema = new mongoose.Schema({
  craneId: {
    type: String,
    required: true
  },
  testType: {
    type: String,
    required: true,
    enum: ['scheduled', 'manual', 'automatic', 'emergency'],
    default: 'automatic'
  },
  testDate: {
    type: Date,
    required: true
  },
  testStatus: {
    type: String,
    required: true,
    enum: ['passed', 'failed', 'partial', 'in_progress'],
    default: 'in_progress'
  },
  limitSwitches: {
    ls1: {
      status: {
        type: String,
        enum: ['OK', 'FAIL', 'UNKNOWN', 'HIT'],
        required: true
      },
      responseTime: Number, // milliseconds
      threshold: Number,    // trigger threshold
      notes: String
    },
    ls2: {
      status: {
        type: String,
        enum: ['OK', 'FAIL', 'UNKNOWN', 'HIT'],
        required: true
      },
      responseTime: Number,
      threshold: Number,
      notes: String
    },
    ls3: {
      status: {
        type: String,
        enum: ['OK', 'FAIL', 'UNKNOWN', 'HIT'],
        required: true
      },
      responseTime: Number,
      threshold: Number,
      notes: String
    }
  },
  utilityTest: {
    status: {
      type: String,
      enum: ['OK', 'FAIL', 'UNKNOWN', 'ON', 'OFF'],
      required: true
    },
    responseTime: Number,
    powerLevel: Number,
    notes: String
  },
  testResults: {
    overallPassed: {
      type: Boolean,
      required: true
    },
    criticalFailures: [String], // Array of failed critical systems
    warnings: [String],         // Array of warnings
    recommendations: [String]   // Array of maintenance recommendations
  },
  testData: {
    loadAtTest: Number,        // Load during test
    swlAtTest: Number,         // SWL during test
    utilizationAtTest: Number, // Utilization during test
    environmentalConditions: {
      temperature: Number,
      humidity: Number,
      windSpeed: Number
    }
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Can be system-generated
  },
  testDuration: {
    type: Number, // in minutes
    required: true
  },
  nextTestDue: {
    type: Date,
    required: true
  },
  maintenanceRequired: {
    type: Boolean,
    default: false
  },
  maintenanceNotes: String,
  attachments: [{
    filename: String,
    filepath: String,
    fileType: String,
    uploadedAt: Date
  }]
}, {
  timestamps: true
});

// =============================================================================
// COMPREHENSIVE INDEXING STRATEGY FOR PRODUCTION PERFORMANCE
// =============================================================================

// Primary indexes for efficient queries
limitTestSchema.index({ craneId: 1, testDate: -1 });
limitTestSchema.index({ testStatus: 1, testDate: -1 });
limitTestSchema.index({ nextTestDue: 1 });
limitTestSchema.index({ 'testResults.overallPassed': 1 });

// Performance-optimized composite indexes
limitTestSchema.index({ craneId: 1, testStatus: 1, testDate: -1 }); // Crane tests by status and date
limitTestSchema.index({ testStatus: 1, nextTestDue: 1 }); // Tests by status and due date
limitTestSchema.index({ craneId: 1, nextTestDue: 1 }); // Crane tests by due date
limitTestSchema.index({ testType: 1, testStatus: 1, testDate: -1 }); // Tests by type, status, and date
limitTestSchema.index({ testType: 1, nextTestDue: 1 }); // Tests by type and due date

// Test results analysis indexes
limitTestSchema.index({ 'testResults.overallPassed': 1, testDate: -1 }); // Pass/fail analysis over time
limitTestSchema.index({ craneId: 1, 'testResults.overallPassed': 1, testDate: -1 }); // Crane pass/fail analysis
limitTestSchema.index({ testStatus: 1, 'testResults.overallPassed': 1, testDate: -1 }); // Status and results analysis

// Due date and scheduling indexes
limitTestSchema.index({ nextTestDue: 1, testStatus: 1 }); // Due tests by status
limitTestSchema.index({ nextTestDue: 1, craneId: 1 }); // Due tests by crane
limitTestSchema.index({ nextTestDue: 1, testType: 1 }); // Due tests by type
limitTestSchema.index({ nextTestDue: 1, testStatus: 1, craneId: 1 }); // Complex due date queries

// Search and filtering indexes
limitTestSchema.index({ testType: 1, testStatus: 1 }); // Tests by type and status
limitTestSchema.index({ craneId: 1, testType: 1, testDate: -1 }); // Crane tests by type and date
limitTestSchema.index({ testStatus: 1, testType: 1, nextTestDue: 1 }); // Tests by status, type, and due date

// Text search index for full-text search
limitTestSchema.index({ 
  testType: 'text', 
  notes: 'text',
  'testResults.notes': 'text'
}, { 
  weights: { 
    testType: 10, 
    notes: 5,
    'testResults.notes': 3
  },
  name: 'limittest_text_search'
});

// Aggregation pipeline optimization indexes
limitTestSchema.index({ craneId: 1, testStatus: 1, testType: 1, testDate: -1 }); // Complex test aggregations
limitTestSchema.index({ nextTestDue: 1, testStatus: 1, testType: 1, craneId: 1 }); // Scheduling queries
limitTestSchema.index({ 'testResults.overallPassed': 1, testStatus: 1, testDate: -1 }); // Results analysis

// Partial indexes for specific use cases
limitTestSchema.index({ nextTestDue: 1 }, { partialFilterExpression: { testStatus: { $in: ['scheduled', 'pending'] } } }); // Only scheduled/pending tests
limitTestSchema.index({ testDate: -1 }, { partialFilterExpression: { 'testResults.overallPassed': true } }); // Only passed tests
limitTestSchema.index({ testDate: -1 }, { partialFilterExpression: { 'testResults.overallPassed': false } }); // Only failed tests

// Sparse indexes for optional fields
limitTestSchema.index({ notes: 1 }, { sparse: true }); // Notes queries (sparse because not all tests have notes)
limitTestSchema.index({ 'testResults.notes': 1 }, { sparse: true }); // Result notes queries (sparse because not all tests have result notes)

// Virtual for test age
limitTestSchema.virtual('testAge').get(function() {
  return Math.floor((Date.now() - this.testDate.getTime()) / (1000 * 60 * 60 * 24));
});

// Virtual for days until next test
limitTestSchema.virtual('daysUntilNextTest').get(function() {
  return Math.floor((this.nextTestDue.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
});

// Instance method to get test summary
limitTestSchema.methods.getTestSummary = function() {
  return {
    id: this._id,
    craneId: this.craneId,
    testType: this.testType,
    testDate: this.testDate,
    testStatus: this.testStatus,
    overallPassed: this.testResults.overallPassed,
    criticalFailures: this.testResults.criticalFailures,
    warnings: this.testResults.warnings,
    testAge: this.testAge,
    daysUntilNextTest: this.daysUntilNextTest,
    maintenanceRequired: this.maintenanceRequired
  };
};

// Static method to get tests for a crane
limitTestSchema.statics.getCraneTests = function(craneId, limit = 50) {
  return this.find({ craneId })
    .populate('performedBy', 'name email')
    .sort({ testDate: -1 })
    .limit(limit);
};

// Static method to get overdue tests
limitTestSchema.statics.getOverdueTests = function() {
  return this.find({
    nextTestDue: { $lt: new Date() },
    testStatus: { $ne: 'in_progress' }
  }).populate('performedBy', 'name email');
};

// Static method to get upcoming tests
limitTestSchema.statics.getUpcomingTests = function(days = 7) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  
  return this.find({
    nextTestDue: { 
      $gte: new Date(), 
      $lte: futureDate 
    },
    testStatus: { $ne: 'in_progress' }
  }).populate('performedBy', 'name email');
};

// Static method to get test statistics
limitTestSchema.statics.getTestStats = function(craneId, from, to) {
  const matchStage = { craneId };
  
  if (from || to) {
    matchStage.testDate = {};
    if (from) matchStage.testDate.$gte = new Date(from);
    if (to) matchStage.testDate.$lte = new Date(to);
  }
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalTests: { $sum: 1 },
        passedTests: {
          $sum: { $cond: [{ $eq: ['$testResults.overallPassed', true] }, 1, 0] }
        },
        failedTests: {
          $sum: { $cond: [{ $eq: ['$testResults.overallPassed', false] }, 1, 0] }
        },
        avgTestDuration: { $avg: '$testDuration' },
        maintenanceRequired: {
          $sum: { $cond: ['$maintenanceRequired', 1, 0] }
        }
      }
    }
  ]);
};

module.exports = mongoose.model('LimitTest', limitTestSchema);

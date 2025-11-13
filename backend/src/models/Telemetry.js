const mongoose = require('mongoose');

const telemetrySchema = new mongoose.Schema({
  craneId: {
    type: String,
    required: true
  },
  ts: {
    type: Date,
    required: true
  },
  load: {
    type: Number,
    required: true,
    min: 0,
    max: 10000
  },
  swl: {
    type: Number,
    required: true,
    min: 1,
    max: 10000
  },
  ls1: {
    type: String,
    enum: ['OK', 'FAIL', 'UNKNOWN', 'HIT'],
    default: 'UNKNOWN'
  },
  ls2: {
    type: String,
    enum: ['OK', 'FAIL', 'UNKNOWN', 'HIT'],
    default: 'UNKNOWN'
  },
  ls3: {
    type: String,
    enum: ['OK', 'FAIL', 'UNKNOWN', 'HIT'],
    default: 'UNKNOWN'
  },
  ls4: {
    type: String,
    enum: ['OK', 'FAIL', 'UNKNOWN', 'HIT'],
    default: 'UNKNOWN'
  },
  util: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  raw: {
    type: String,
    required: true
  },
  // DRM3300-specific fields
  trolleyPos: {
    type: Number,
    min: 0,
    max: 100 // meters
  },
  hookHeight: {
    type: Number,
    min: 0,
    max: 200 // meters
  },
  jibLength: {
    type: Number,
    min: 0,
    max: 100 // meters
  },
  ropeFalls: {
    type: Number,
    min: 1,
    max: 20
  },
  windSpeed: {
    type: Number,
    min: 0,
    max: 200 // km/h
  },
  windDirection: {
    type: Number,
    min: 0,
    max: 360 // degrees
  },
  // Operating mode
  operatingMode: {
    type: String,
    enum: ['normal', 'test', 'calibration'],
    default: 'normal'
  },
  // Test mode flag (from TEST bit in DRM3400 EVENT messages)
  testMode: {
    type: Boolean,
    default: false
  },
  // Test mode specific
  testType: {
    type: String,
    enum: ['limit_switch_test', 'sli_test', 'system_test'],
    default: null
  },
  testResults: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  // Overload flag (from OL bit in DRM3400 EVENT messages)
  overload: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// =============================================================================
// COMPREHENSIVE INDEXING STRATEGY FOR PRODUCTION PERFORMANCE
// =============================================================================

// Primary compound indexes for efficient queries
telemetrySchema.index({ craneId: 1, ts: -1 }); // Most common query pattern
telemetrySchema.index({ craneId: 1, util: 1 }); // Utilization queries

// Performance-optimized composite indexes
telemetrySchema.index({ craneId: 1, ts: -1, load: 1 }); // Load analysis queries
telemetrySchema.index({ craneId: 1, ts: -1, util: 1 }); // Utilization trends
telemetrySchema.index({ craneId: 1, ts: -1, 'ls1': 1, 'ls2': 1, 'ls3': 1, 'ls4': 1 }); // Limit switch queries

// Overload detection indexes
telemetrySchema.index({ craneId: 1, load: 1, swl: 1 }); // Overload detection
telemetrySchema.index({ load: 1, swl: 1 }); // Global overload queries

// Limit switch failure indexes
telemetrySchema.index({ craneId: 1, 'ls1': 1, 'ls2': 1, 'ls3': 1, 'ls4': 1 }); // Limit switch analysis
telemetrySchema.index({ 'ls1': 1, 'ls2': 1, 'ls3': 1, 'ls4': 1 }); // Global limit switch queries

// Time-based analysis indexes
telemetrySchema.index({ ts: -1, craneId: 1 }); // Time-series analysis
telemetrySchema.index({ ts: -1, util: 1 }); // Utilization over time
telemetrySchema.index({ ts: -1, load: 1 }); // Load over time

// Aggregation pipeline optimization indexes
telemetrySchema.index({ craneId: 1, ts: -1, util: 1, load: 1 }); // Complex aggregations
telemetrySchema.index({ craneId: 1, ts: -1, 'ls1': 1, 'ls2': 1, 'ls3': 1, 'ls4': 1, util: 1 }); // Full status aggregations

// Partial indexes for specific use cases
telemetrySchema.index({ craneId: 1, ts: -1 }, { partialFilterExpression: { load: { $gt: 0 } } }); // Only non-zero load data
telemetrySchema.index({ craneId: 1, ts: -1 }, { partialFilterExpression: { util: { $gt: 0 } } }); // Only utilization data
telemetrySchema.index({ craneId: 1, ts: -1 }, { partialFilterExpression: { 'ls1': 'FAIL' } }); // Only failed limit switches

// Sparse indexes for optional fields
telemetrySchema.index({ raw: 1 }, { sparse: true }); // Raw data queries (sparse because not all records have raw data)

// DRM3300-specific indexes
telemetrySchema.index({ craneId: 1, operatingMode: 1, ts: -1 }); // Operating mode queries
telemetrySchema.index({ craneId: 1, testType: 1, ts: -1 }); // Test mode queries
telemetrySchema.index({ craneId: 1, testMode: 1, ts: -1 }); // Test history queries (pre-operation tests)
telemetrySchema.index({ operatingMode: 1, ts: -1 }); // Global operating mode analysis
telemetrySchema.index({ testType: 1, ts: -1 }); // Global test analysis
telemetrySchema.index({ testMode: 1, ts: -1 }); // Global test history
telemetrySchema.index({ craneId: 1, trolleyPos: 1, ts: -1 }); // Trolley position analysis
telemetrySchema.index({ craneId: 1, hookHeight: 1, ts: -1 }); // Hook height analysis
telemetrySchema.index({ craneId: 1, windSpeed: 1, ts: -1 }); // Wind condition analysis

// TTL index for automatic data retention - delete records older than 30 days
// This is configurable via environment variable TELEMETRY_RETENTION_DAYS (default: 30)
const retentionDays = parseInt(process.env.TELEMETRY_RETENTION_DAYS) || 30;
const retentionSeconds = retentionDays * 24 * 60 * 60;
telemetrySchema.index({ ts: 1 }, { expireAfterSeconds: retentionSeconds });

// Virtual for overload status
telemetrySchema.virtual('isOverloaded').get(function() {
  return this.load > this.swl;
});

// Virtual for limit switch failures
telemetrySchema.virtual('hasLimitSwitchFailures').get(function() {
  return this.ls1 === 'FAIL' || this.ls2 === 'FAIL' || this.ls3 === 'FAIL' || this.ls4 === 'FAIL';
});

// Virtual for utility failures
telemetrySchema.virtual('hasUtilityFailures').get(function() {
  return this.ut === 'FAIL';
});

// Instance method to get status summary
telemetrySchema.methods.getStatusSummary = function() {
  return {
    craneId: this.craneId,
    timestamp: this.ts,
    load: this.load,
    swl: this.swl,
    utilization: this.util,
    isOverloaded: this.isOverloaded,
    limitSwitchStatus: {
      ls1: this.ls1,
      ls2: this.ls2,
      ls3: this.ls3,
      ls4: this.ls4
    },
    utilityStatus: this.ut,
    hasFailures: this.hasLimitSwitchFailures || this.hasUtilityFailures,
    raw: this.raw
  };
};

// Static method to get telemetry for a crane within time range
telemetrySchema.statics.getCraneTelemetry = function(craneId, from, to, limit = 1000) {
  const query = { craneId };
  
  if (from || to) {
    query.ts = {};
    if (from) query.ts.$gte = new Date(from);
    if (to) query.ts.$lte = new Date(to);
  }
  
  return this.find(query)
    .sort({ ts: -1 })
    .limit(limit);
};

// Static method to get latest telemetry for a crane
telemetrySchema.statics.getLatestTelemetry = function(craneId) {
  return this.findOne({ craneId })
    .sort({ ts: -1 });
};

// Static method to get telemetry statistics
telemetrySchema.statics.getTelemetryStats = function(craneId, from, to) {
  const matchStage = { craneId };
  
  if (from || to) {
    matchStage.ts = {};
    if (from) matchStage.ts.$gte = new Date(from);
    if (to) matchStage.ts.$lte = new Date(to);
  }
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        count: { $sum: 1 },
        avgLoad: { $avg: '$load' },
        maxLoad: { $max: '$load' },
        avgUtilization: { $avg: '$util' },
        maxUtilization: { $max: '$util' },
        overloadCount: {
          $sum: {
            $cond: [{ $gt: ['$load', '$swl'] }, 1, 0]
          }
        },
        limitSwitchFailures: {
          $sum: {
            $cond: [
              { $or: [
                { $eq: ['$ls1', 'FAIL'] },
                { $eq: ['$ls2', 'FAIL'] },
                { $eq: ['$ls3', 'FAIL'] }
              ]},
              1,
              0
            ]
          }
        }
      }
    }
  ]);
};

// Static method to get utilization trend data
telemetrySchema.statics.getUtilizationTrend = function(craneId, hours = 24) {
  const from = new Date(Date.now() - hours * 60 * 60 * 1000);
  
  return this.aggregate([
    {
      $match: {
        craneId,
        ts: { $gte: from }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$ts' },
          month: { $month: '$ts' },
          day: { $dayOfMonth: '$ts' },
          hour: { $hour: '$ts' }
        },
        avgUtilization: { $avg: '$util' },
        maxUtilization: { $max: '$util' },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.hour': 1 }
    }
  ]);
};

// Static method to get peak load trend data
telemetrySchema.statics.getPeakLoadTrend = function(craneId, days = 7) {
  const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  return this.aggregate([
    {
      $match: {
        craneId,
        ts: { $gte: from }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$ts' },
          month: { $month: '$ts' },
          day: { $dayOfMonth: '$ts' }
        },
        maxLoad: { $max: '$load' },
        avgLoad: { $avg: '$load' },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
    }
  ]);
};

// Static method to get data retention statistics
telemetrySchema.statics.getRetentionStats = function() {
  const retentionDays = parseInt(process.env.TELEMETRY_RETENTION_DAYS) || 30;
  const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  
  return this.aggregate([
    {
      $group: {
        _id: null,
        totalRecords: { $sum: 1 },
        recordsWithinRetention: {
          $sum: {
            $cond: [{ $gte: ['$ts', cutoffDate] }, 1, 0]
          }
        },
        recordsToBeDeleted: {
          $sum: {
            $cond: [{ $lt: ['$ts', cutoffDate] }, 1, 0]
          }
        },
        oldestRecord: { $min: '$ts' },
        newestRecord: { $max: '$ts' }
      }
    },
    {
      $project: {
        _id: 0,
        totalRecords: 1,
        recordsWithinRetention: 1,
        recordsToBeDeleted: 1,
        oldestRecord: 1,
        newestRecord: 1,
        retentionDays: retentionDays,
        dataSizeMB: {
          $round: [
            { $divide: [{ $multiply: ['$totalRecords', 0.001] }, 1024] }, // Rough estimate
            2
          ]
        }
      }
    }
  ]);
};

module.exports = mongoose.model('Telemetry', telemetrySchema);

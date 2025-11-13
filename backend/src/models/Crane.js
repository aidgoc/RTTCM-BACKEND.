const mongoose = require('mongoose');

const craneSchema = new mongoose.Schema({
  craneId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true,
    match: [/^(TC|DM|ET|HT)-[\dA-F]+$/i, 'Crane ID must be in format TC-XXX, DM-XXX, ET-XXX, or HT-XXX']
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  location: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  // Enhanced location data with GPS coordinates
  locationData: {
    // GeoJSON format: [longitude, latitude]
    coordinates: {
      type: [Number],
      validate: {
        validator: function(coords) {
          if (!coords || coords.length !== 2) return false;
          const [lng, lat] = coords;
          return lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90;
        },
        message: 'Coordinates must be [longitude, latitude] with valid ranges'
      }
    },
    // Site address for display
    siteAddress: {
      type: String,
      trim: true,
      maxlength: 500
    },
    // How coordinates were determined
    locationSource: {
      type: String,
      enum: ['city_default', 'grid_offset', 'manual_entry', 'gps_hardware', 'gsm_triangulation'],
      default: 'city_default'
    },
    // Location accuracy in meters (for GSM/GPS)
    locationAccuracy: {
      type: Number,
      min: 0,
      max: 10000, // Max 10km accuracy
      default: null
    },
    // Location method used
    locationMethod: {
      type: String,
      enum: ['gsm', 'gps', 'manual', 'estimated'],
      default: 'estimated'
    },
    // City name for fallback
    city: {
      type: String,
      trim: true,
      maxlength: 100
    }
  },
  swl: {
    type: Number,
    required: true,
    min: 1,
    max: 100000 // Maximum 100 tons (100,000 kg)
  },
  managerUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
    validate: {
      validator: async function(userId) {
        if (!userId) return true; // Allow null/undefined
        const User = mongoose.model('User');
        const user = await User.findById(userId);
        return user && user.role === 'manager';
      },
      message: 'Manager must be a user with manager role'
    }
  },
  supervisorUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
    validate: {
      validator: async function(userId) {
        if (!userId) return true; // Allow null/undefined
        const User = mongoose.model('User');
        const user = await User.findById(userId);
        return user && user.role === 'supervisor';
      },
      message: 'Supervisor must be a user with supervisor role'
    }
  },
  operators: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    validate: {
      validator: async function(userIds) {
        const User = mongoose.model('User');
        const users = await User.find({ _id: { $in: userIds } });
        return users.every(user => user.role === 'operator');
      },
      message: 'All operators must be users with operator role'
    }
  }],
  // Tickets raised for this crane
  tickets: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ticket'
  }],
  lastSeen: {
    type: Date,
    default: Date.now
  },
  online: {
    type: Boolean,
    default: false
  },
  lastStatusRaw: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  isActive: {
    type: Boolean,
    default: true
  },
  specifications: {
    manufacturer: String,
    model: String,
    maxHeight: Number,
    maxRadius: Number,
    installationDate: Date
  }
}, {
  timestamps: true
});

// =============================================================================
// COMPREHENSIVE INDEXING STRATEGY FOR PRODUCTION PERFORMANCE
// =============================================================================

// Primary indexes for efficient queries
// Note: craneId index is automatically created by unique: true
craneSchema.index({ managerUserId: 1 });
craneSchema.index({ operators: 1 });
craneSchema.index({ online: 1 });
craneSchema.index({ lastSeen: 1 });

// Performance-optimized composite indexes
craneSchema.index({ managerUserId: 1, online: 1 }); // Manager's online cranes
craneSchema.index({ operators: 1, online: 1 }); // Operator's online cranes
craneSchema.index({ online: 1, lastSeen: -1 }); // Online cranes by last activity
craneSchema.index({ isActive: 1, online: 1 }); // Active online cranes
craneSchema.index({ isActive: 1, lastSeen: -1 }); // Active cranes by activity

// Search and filtering indexes
craneSchema.index({ name: 1, isActive: 1 }); // Name search on active cranes
craneSchema.index({ location: 1, isActive: 1 }); // Location search on active cranes
craneSchema.index({ swl: 1, isActive: 1 }); // SWL filtering on active cranes

// Location data indexes
craneSchema.index({ 'locationData.coordinates': '2dsphere' }); // Geospatial queries
craneSchema.index({ 'locationData.city': 1, isActive: 1 }); // City-based queries
craneSchema.index({ 'locationData.locationSource': 1 }); // Location source queries

// Text search index for full-text search
craneSchema.index({ 
  name: 'text', 
  location: 'text', 
  craneId: 'text',
  'locationData.siteAddress': 'text',
  'locationData.city': 'text'
}, { 
  weights: { 
    name: 10, 
    craneId: 5, 
    location: 3,
    'locationData.siteAddress': 2,
    'locationData.city': 1
  },
  name: 'crane_text_search'
});

// Aggregation pipeline optimization indexes
craneSchema.index({ isActive: 1, online: 1, lastSeen: -1, swl: 1 }); // Complex aggregations
craneSchema.index({ managerUserId: 1, isActive: 1, online: 1 }); // Manager dashboard queries
craneSchema.index({ operators: 1, isActive: 1, online: 1 }); // Operator dashboard queries

// Partial indexes for specific use cases
craneSchema.index({ online: 1, lastSeen: -1 }, { partialFilterExpression: { isActive: true } }); // Only active cranes
craneSchema.index({ swl: 1 }, { partialFilterExpression: { isActive: true, online: true } }); // Only active online cranes

// Sparse indexes for optional fields
craneSchema.index({ specifications: 1 }, { sparse: true }); // Specifications queries (sparse because not all cranes have specs)
craneSchema.index({ 'locationData.locationAccuracy': 1 }); // Location accuracy queries
craneSchema.index({ 'locationData.locationMethod': 1 }); // Location method queries

// Virtual for utilization percentage
craneSchema.virtual('utilization').get(function() {
  if (this.lastStatusRaw && this.lastStatusRaw.util) {
    return Math.min(100, Math.max(0, this.lastStatusRaw.util));
  }
  return 0;
});

// Virtual for current load
craneSchema.virtual('currentLoad').get(function() {
  if (this.lastStatusRaw && this.lastStatusRaw.load) {
    return this.lastStatusRaw.load;
  }
  return 0;
});

// Virtual for overload status
craneSchema.virtual('isOverloaded').get(function() {
  const load = this.currentLoad;
  const swl = this.swl;
  return load > swl;
});

// Virtual for limit switch status
craneSchema.virtual('limitSwitchStatus').get(function() {
  if (!this.lastStatusRaw) {
    return { ls1: 'UNKNOWN', ls2: 'UNKNOWN', ls3: 'UNKNOWN' };
  }
  
  return {
    ls1: this.lastStatusRaw.ls1 || 'UNKNOWN',
    ls2: this.lastStatusRaw.ls2 || 'UNKNOWN',
    ls3: this.lastStatusRaw.ls3 || 'UNKNOWN'
  };
});

// Virtual for getting coordinates (returns [lng, lat] or null)
craneSchema.virtual('coordinates').get(function() {
  if (this.locationData && this.locationData.coordinates && this.locationData.coordinates.length === 2) {
    return this.locationData.coordinates;
  }
  return null;
});

// Virtual for getting latitude
craneSchema.virtual('latitude').get(function() {
  if (this.locationData && this.locationData.coordinates && this.locationData.coordinates.length === 2) {
    return this.locationData.coordinates[1]; // latitude is second element
  }
  return null;
});

// Virtual for getting longitude
craneSchema.virtual('longitude').get(function() {
  if (this.locationData && this.locationData.coordinates && this.locationData.coordinates.length === 2) {
    return this.locationData.coordinates[0]; // longitude is first element
  }
  return null;
});

// Instance method to update status
craneSchema.methods.updateStatus = function(telemetryData) {
  this.lastSeen = new Date();
  this.online = true;
  this.lastStatusRaw = telemetryData;
  return this.save();
};

// Instance method to mark offline
craneSchema.methods.markOffline = function() {
  this.online = false;
  return this.save();
};

// Instance method to update location data
craneSchema.methods.updateLocation = function(locationData) {
  if (locationData.coordinates) {
    this.locationData = this.locationData || {};
    this.locationData.coordinates = locationData.coordinates;
    this.locationData.locationSource = locationData.locationSource || 'manual_entry';
  }
  
  if (locationData.siteAddress) {
    this.locationData = this.locationData || {};
    this.locationData.siteAddress = locationData.siteAddress;
  }
  
  if (locationData.city) {
    this.locationData = this.locationData || {};
    this.locationData.city = locationData.city;
  }

  // Handle GSM/GPS accuracy and method
  if (locationData.accuracy !== undefined) {
    this.locationData = this.locationData || {};
    this.locationData.locationAccuracy = locationData.accuracy;
  }

  if (locationData.method) {
    this.locationData = this.locationData || {};
    this.locationData.locationMethod = locationData.method;
  }
  
  return this.save();
};

// Instance method to get status summary
craneSchema.methods.getStatusSummary = function() {
  const status = this.limitSwitchStatus;
  const hasFailures = Object.values(status).some(s => s === 'FAIL');
  
  return {
    craneId: this.craneId,
    name: this.name,
    online: this.online,
    lastSeen: this.lastSeen,
    currentLoad: this.currentLoad,
    swl: this.swl,
    utilization: this.utilization,
    isOverloaded: this.isOverloaded,
    limitSwitchStatus: status,
    hasLimitSwitchFailures: hasFailures,
    status: this.online ? 
      (this.isOverloaded ? 'overload' : 
       hasFailures ? 'warning' : 'normal') : 'offline'
  };
};

// Static method to find cranes by manager
craneSchema.statics.findByManager = function(managerId) {
  return this.find({ managerUserId: managerId, isActive: true });
};

// Static method to find cranes by operator
craneSchema.statics.findByOperator = function(operatorId) {
  return this.find({ operators: operatorId, isActive: true });
};

// Static method to find offline cranes
craneSchema.statics.findOffline = function(minutes = 5) {
  const cutoff = new Date(Date.now() - minutes * 60 * 1000);
  return this.find({ 
    lastSeen: { $lt: cutoff },
    isActive: true 
  });
};

// Static method to find overloaded cranes
craneSchema.statics.findOverloaded = function() {
  return this.aggregate([
    {
      $match: {
        online: true,
        isActive: true,
        'lastStatusRaw.load': { $exists: true, $ne: null }
      }
    },
    {
      $addFields: {
        isOverloaded: {
          $gt: ['$lastStatusRaw.load', '$swl']
        }
      }
    },
    {
      $match: {
        isOverloaded: true
      }
    },
    {
      $project: {
        isOverloaded: 0 // Remove the computed field from output
      }
    }
  ]);
};

module.exports = mongoose.model('Crane', craneSchema);

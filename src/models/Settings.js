const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  // General Settings
  applicationName: {
    type: String,
    default: 'Tower Crane Monitor',
    maxlength: 100
  },
  defaultLanguage: {
    type: String,
    enum: ['English', 'Spanish', 'French'],
    default: 'English'
  },
  theme: {
    type: String,
    enum: ['Light', 'Dark', 'Auto'],
    default: 'Light'
  },

  // Notification Settings
  emailNotifications: {
    type: Boolean,
    default: true
  },
  browserNotifications: {
    type: Boolean,
    default: true
  },
  criticalAlerts: {
    type: Boolean,
    default: true
  },

  // Security Settings
  sessionTimeout: {
    type: String,
    enum: ['15 minutes', '30 minutes', '1 hour', '2 hours'],
    default: '30 minutes'
  },
  requireStrongPasswords: {
    type: Boolean,
    default: true
  },
  passwordChangeInterval: {
    type: Number,
    default: 90 // days
  },

  // Analytics Settings
  telemetryRetentionDays: {
    type: Number,
    default: 30
  },
  logsRetentionDays: {
    type: Number,
    default: 90
  },
  dailyReports: {
    type: Boolean,
    default: true
  },
  weeklyReports: {
    type: Boolean,
    default: true
  },

  // System Settings
  autoRefreshInterval: {
    type: Number,
    default: 30 // seconds
  },
  maxConcurrentUsers: {
    type: Number,
    default: 100
  },

  // Metadata
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Ensure only one settings document exists
settingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = new this({});
    await settings.save();
  }
  return settings;
};

// Instance method to update settings
settingsSchema.methods.updateSettings = function(updates, userId) {
  Object.keys(updates).forEach(key => {
    if (this.schema.paths[key] && updates[key] !== undefined) {
      this[key] = updates[key];
    }
  });
  this.lastUpdatedBy = userId;
  return this.save();
};

module.exports = mongoose.model('Settings', settingsSchema);

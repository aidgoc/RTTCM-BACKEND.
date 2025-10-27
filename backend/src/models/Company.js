const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  // Basic Company Information
  companyName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
    unique: true
  },
  companyId: {
    type: String,
    required: true, // Now required - must be provided by super admin
    unique: true,
    uppercase: true,
    trim: true
  },
  
  // Contact Information
  contactPerson: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    pincode: String,
    country: { type: String, default: 'India' }
  },
  
  // Company Admin
  adminUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Will be set after admin user is created
  },
  
  // Subscription & Billing
  subscription: {
    planType: {
      type: String,
      enum: ['basic', 'standard', 'enterprise', 'custom'],
      default: 'standard'
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended', 'trial'],
      default: 'trial'
    },
    startDate: {
      type: Date,
      required: true,
      default: Date.now
    },
    endDate: {
      type: Date,
      required: false
    },
    billingCycle: {
      type: String,
      enum: ['monthly', 'quarterly', 'yearly'],
      default: 'monthly'
    },
    nextBillingDate: {
      type: Date,
      required: true
    }
  },
  
  // Financial Details
  billing: {
    deviceCount: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    pricePerDevice: {
      type: Number,
      required: true,
      default: 5000, // ₹5,000 per device per month
      min: 0
    },
    monthlyAmount: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    currency: {
      type: String,
      default: 'INR'
    },
    gstNumber: {
      type: String,
      trim: true
    },
    taxRate: {
      type: Number,
      default: 18, // 18% GST
      min: 0,
      max: 100
    }
  },
  
  // Payment Status
  paymentStatus: {
    lastPaymentDate: Date,
    lastPaymentAmount: Number,
    paymentMethod: {
      type: String,
      enum: ['bank_transfer', 'cheque', 'online', 'upi', 'card', 'cash'],
      default: 'bank_transfer'
    },
    isPaid: {
      type: Boolean,
      default: false
    },
    overdueAmount: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  
  // Statistics
  stats: {
    totalCranes: {
      type: Number,
      default: 0,
      min: 0
    },
    totalUsers: {
      type: Number,
      default: 0,
      min: 0
    },
    totalManagers: {
      type: Number,
      default: 0,
      min: 0
    },
    totalSupervisors: {
      type: Number,
      default: 0,
      min: 0
    },
    totalOperators: {
      type: Number,
      default: 0,
      min: 0
    },
    activeDRMDevices: {
      type: Number,
      default: 0,
      min: 0
    },
    offlineDRMDevices: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  
  // System Status
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Metadata
  notes: {
    type: String,
    maxlength: 1000
  },
  
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  lastActivityDate: {
    type: Date,
    default: Date.now
  }
  
}, {
  timestamps: true
});

// =============================================================================
// INDEXES FOR PERFORMANCE
// =============================================================================

companySchema.index({ companyId: 1 });
companySchema.index({ companyName: 1 });
companySchema.index({ email: 1 });
companySchema.index({ isActive: 1 });
companySchema.index({ 'subscription.status': 1 });
companySchema.index({ 'subscription.nextBillingDate': 1 });
companySchema.index({ 'paymentStatus.isPaid': 1 });
companySchema.index({ isActive: 1, 'subscription.status': 1 });

// Text search index
companySchema.index({ 
  companyName: 'text', 
  contactPerson: 'text',
  email: 'text'
}, { 
  weights: { 
    companyName: 10, 
    contactPerson: 5,
    email: 3
  },
  name: 'company_text_search'
});

// =============================================================================
// PRE-SAVE MIDDLEWARE
// =============================================================================

// Calculate monthly amount before saving
companySchema.pre('save', function(next) {
  if (this.isModified('billing.deviceCount') || this.isModified('billing.pricePerDevice')) {
    this.billing.monthlyAmount = this.billing.deviceCount * this.billing.pricePerDevice;
  }
  
  // Company ID is now required and provided by super admin
  // No auto-generation needed
  
  next();
});

// =============================================================================
// INSTANCE METHODS
// =============================================================================

// Get public JSON (without sensitive data)
companySchema.methods.toPublicJSON = function() {
  return {
    _id: this._id,
    companyName: this.companyName,
    companyId: this.companyId,
    contactPerson: this.contactPerson,
    email: this.email,
    phone: this.phone,
    address: this.address,
    adminUser: this.adminUser,
    subscription: this.subscription,
    billing: {
      deviceCount: this.billing.deviceCount,
      pricePerDevice: this.billing.pricePerDevice,
      monthlyAmount: this.billing.monthlyAmount,
      currency: this.billing.currency,
      taxRate: this.billing.taxRate
    },
    paymentStatus: this.paymentStatus,
    stats: this.stats,
    isActive: this.isActive,
    lastActivityDate: this.lastActivityDate,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

// Calculate total amount with tax
companySchema.methods.calculateTotalAmount = function() {
  const baseAmount = this.billing.monthlyAmount;
  const taxAmount = (baseAmount * this.billing.taxRate) / 100;
  return {
    baseAmount,
    taxAmount,
    totalAmount: baseAmount + taxAmount
  };
};

// Check if payment is overdue
companySchema.methods.isPaymentOverdue = function() {
  if (!this.subscription.nextBillingDate) return false;
  return new Date() > this.subscription.nextBillingDate && !this.paymentStatus.isPaid;
};

// Get days until next billing
companySchema.methods.getDaysUntilBilling = function() {
  if (!this.subscription.nextBillingDate) return null;
  const today = new Date();
  const billingDate = new Date(this.subscription.nextBillingDate);
  const diffTime = billingDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

// Update statistics
companySchema.methods.updateStats = async function() {
  const User = mongoose.model('User');
  const Crane = mongoose.model('Crane');
  
  // Count users by role
  const users = await User.find({ companyId: this._id, isActive: true });
  this.stats.totalUsers = users.length;
  this.stats.totalManagers = users.filter(u => u.role === 'manager').length;
  this.stats.totalSupervisors = users.filter(u => u.role === 'supervisor').length;
  this.stats.totalOperators = users.filter(u => u.role === 'operator').length;
  
  // Count cranes
  const cranes = await Crane.find({ companyId: this._id });
  this.stats.totalCranes = cranes.length;
  
  await this.save();
};

// =============================================================================
// STATIC METHODS
// =============================================================================

// Find active companies
companySchema.statics.findActive = function() {
  return this.find({ isActive: true, 'subscription.status': 'active' });
};

// Find companies with overdue payments
companySchema.statics.findOverdue = function() {
  const today = new Date();
  return this.find({
    isActive: true,
    'subscription.nextBillingDate': { $lt: today },
    'paymentStatus.isPaid': false
  });
};

// Find companies with upcoming billing
companySchema.statics.findUpcomingBilling = function(days = 7) {
  const today = new Date();
  const futureDate = new Date(today.getTime() + (days * 24 * 60 * 60 * 1000));
  return this.find({
    isActive: true,
    'subscription.nextBillingDate': { $gte: today, $lte: futureDate }
  });
};

// Get total revenue statistics
companySchema.statics.getTotalRevenue = async function() {
  const result = await this.aggregate([
    { $match: { isActive: true, 'subscription.status': 'active' } },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$billing.monthlyAmount' },
        totalCompanies: { $sum: 1 },
        totalDevices: { $sum: '$billing.deviceCount' }
      }
    }
  ]);
  
  return result[0] || { totalRevenue: 0, totalCompanies: 0, totalDevices: 0 };
};

module.exports = mongoose.model('Company', companySchema);


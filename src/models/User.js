const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  passwordHash: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['admin', 'manager', 'supervisor', 'operator'],
    default: 'operator',
    required: true
  },
  // Simplified RBAC structure
  assignedCranes: [{
    type: String,
    ref: 'Crane'
  }],
  managedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  // Hierarchy relationships
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  }
}, {
  timestamps: true
});

// =============================================================================
// COMPREHENSIVE INDEXING STRATEGY FOR PRODUCTION PERFORMANCE
// =============================================================================

// Primary indexes for efficient queries
// Note: email index is automatically created by unique: true
userSchema.index({ role: 1 });
userSchema.index({ assignedCranes: 1 });

// Performance-optimized composite indexes
userSchema.index({ role: 1, isActive: 1 }); // Active users by role
userSchema.index({ assignedCranes: 1, isActive: 1 }); // Active users by assigned cranes
userSchema.index({ role: 1, lastLogin: -1 }); // Users by role and last login
userSchema.index({ isActive: 1, lastLogin: -1 }); // Active users by last login

// Search and filtering indexes
userSchema.index({ name: 1, isActive: 1 }); // Name search on active users
userSchema.index({ email: 1, isActive: 1 }); // Email search on active users
userSchema.index({ role: 1, name: 1 }); // Role and name combination

// Text search index for full-text search
userSchema.index({ 
  name: 'text', 
  email: 'text' 
}, { 
  weights: { 
    name: 10, 
    email: 5 
  },
  name: 'user_text_search'
});

// Aggregation pipeline optimization indexes
userSchema.index({ role: 1, isActive: 1, lastLogin: -1 }); // Complex user aggregations
userSchema.index({ assignedCranes: 1, role: 1, isActive: 1 }); // Crane assignment queries

// Partial indexes for specific use cases
userSchema.index({ lastLogin: -1 }, { partialFilterExpression: { isActive: true } }); // Only active users
userSchema.index({ role: 1 }, { partialFilterExpression: { isActive: true } }); // Only active users by role

// Sparse indexes for optional fields
userSchema.index({ managedUsers: 1 }, { sparse: true }); // Managed users queries (sparse because not all users manage others)
userSchema.index({ managedCranes: 1 }, { sparse: true }); // Managed cranes queries (sparse because not all users manage cranes)

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('passwordHash')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to check password
userSchema.methods.checkPassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.passwordHash);
};

// Instance method to get public profile (without password)
userSchema.methods.toPublicJSON = function() {
  return {
    _id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    assignedCranes: this.assignedCranes,
    managedUsers: this.managedUsers,
    createdBy: this.createdBy,
    isActive: this.isActive,
    lastLogin: this.lastLogin,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

// Static method to find users by role
userSchema.statics.findByRole = function(role) {
  return this.find({ role, isActive: true });
};

// Static method to find operators assigned to a crane
userSchema.statics.findOperatorsForCrane = function(craneId) {
  return this.find({ 
    role: 'operator', 
    assignedCranes: craneId,
    isActive: true 
  });
};

// Static method to find managers for a crane
userSchema.statics.findManagersForCrane = function(craneId) {
  return this.find({ 
    role: 'manager', 
    managedCranes: craneId,
    isActive: true 
  });
};

// Static method to find supervisors for a crane
userSchema.statics.findSupervisorsForCrane = function(craneId) {
  return this.find({ 
    role: 'supervisor', 
    assignedCranesByManager: craneId,
    isActive: true 
  });
};

// Instance method to check if user can manage another user
userSchema.methods.canManageUser = function(targetUser) {
  const hierarchy = {
    'admin': ['manager', 'supervisor', 'operator'],
    'manager': ['supervisor', 'operator'],
    'supervisor': ['operator'],
    'operator': []
  };
  
  return hierarchy[this.role] && hierarchy[this.role].includes(targetUser.role);
};

// Instance method to check if user can access crane
userSchema.methods.canAccessCrane = function(craneId) {
  switch (this.role) {
    case 'admin':
      return true; // Admin can access all cranes
    case 'manager':
      return this.assignedCranes && this.assignedCranes.includes(craneId);
    case 'supervisor':
      return this.assignedCranes && this.assignedCranes.includes(craneId);
    case 'operator':
      return this.assignedCranes && this.assignedCranes.includes(craneId);
    default:
      return false;
  }
};

// Instance method to get accessible cranes based on role
userSchema.methods.getAccessibleCranes = function() {
  switch (this.role) {
    case 'admin':
      return []; // Admin can see all cranes (handled in frontend)
    case 'manager':
      return this.assignedCranes || [];
    case 'supervisor':
      return this.assignedCranes || [];
    case 'operator':
      return this.assignedCranes || [];
    default:
      return [];
  }
};

// Instance method to check if user has specific permission
userSchema.methods.hasPermission = function(permission) {
  const PERMISSIONS = {
    // User management - simplified
    'users.create': ['admin', 'manager', 'supervisor'],
    'users.read': ['admin', 'manager', 'supervisor'],
    'users.update': ['admin', 'manager', 'supervisor'],
    'users.delete': ['admin', 'manager'],
    
    // Crane management - simplified
    'cranes.create': ['manager'],
    'cranes.read': ['admin', 'manager', 'supervisor', 'operator'],
    'cranes.update': ['manager', 'supervisor'],
    'cranes.delete': ['manager'],
    'cranes.assign': ['manager', 'supervisor'],
    
    // Ticket management - new
    'tickets.create': ['operator'],
    'tickets.read': ['admin', 'manager', 'supervisor'],
    'tickets.update': ['admin', 'manager', 'supervisor'],
    'tickets.delete': ['admin', 'manager'],
    
    // System permissions
    'system.settings': ['admin'],
    'system.reports': ['admin', 'manager', 'supervisor'],
    'system.analytics': ['admin', 'manager']
  };
  
  const allowedRoles = PERMISSIONS[permission];
  return allowedRoles && allowedRoles.includes(this.role);
};

// Instance method to get user's role level
userSchema.methods.getRoleLevel = function() {
  const ROLE_HIERARCHY = {
    'admin': 4,
    'manager': 3,
    'supervisor': 2,
    'operator': 1
  };
  return ROLE_HIERARCHY[this.role] || 0;
};

// Instance method to check if user can manage another user
userSchema.methods.canManageUser = function(targetUser) {
  // Cannot manage yourself
  if (this._id.toString() === targetUser._id.toString()) {
    return false;
  }
  
  // Cannot manage inactive users
  if (!targetUser.isActive) {
    return false;
  }
  
  // New simplified hierarchy
  const hierarchy = {
    'admin': ['manager'],           // Admin can only manage managers
    'manager': ['supervisor'],      // Manager can only manage supervisors
    'supervisor': ['operator'],     // Supervisor can only manage operators
    'operator': []                  // Operators cannot manage anyone
  };
  
  return hierarchy[this.role] && hierarchy[this.role].includes(targetUser.role);
};

// Instance method to get users this user can manage
userSchema.methods.getManageableRoles = function() {
  const hierarchy = {
    'admin': ['manager'],
    'manager': ['supervisor'],
    'supervisor': ['operator'],
    'operator': []
  };
  return hierarchy[this.role] || [];
};

// Instance method to validate user data
userSchema.methods.validateUserData = function() {
  const errors = [];
  
  // Check required fields
  if (!this.name || this.name.trim().length === 0) {
    errors.push('Name is required');
  }
  
  if (!this.email || !/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(this.email)) {
    errors.push('Valid email is required');
  }
  
  if (!this.role || !['admin', 'manager', 'supervisor', 'operator'].includes(this.role)) {
    errors.push('Valid role is required');
  }
  
  // Role-specific validations
  if (this.role === 'operator' && (!this.assignedCranes || this.assignedCranes.length === 0)) {
    errors.push('Operators must be assigned to at least one crane');
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
};

module.exports = mongoose.model('User', userSchema);

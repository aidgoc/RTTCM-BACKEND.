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
    enum: ['superadmin', 'admin', 'manager', 'supervisor', 'operator'],
    default: 'operator',
    required: true
  },
  // Head Office ID - only for superadmin role
  headOfficeId: {
    type: String,
    required: function() {
      return this.role === 'superadmin';
    },
    trim: true
  },
  // Company ID - all users except superadmin belong to a company
  companyId: {
    type: String,
    required: function() {
      return this.role !== 'superadmin';
    },
    trim: true,
    uppercase: true
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
userSchema.index({ companyId: 1 });
userSchema.index({ assignedCranes: 1 });
userSchema.index({ companyId: 1, role: 1 }); // Company users by role

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
  const publicData = {
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
  
  // Add companyId for non-superadmin users
  if (this.role !== 'superadmin') {
    publicData.companyId = this.companyId;
  }
  
  // Never expose headOfficeId in public JSON for security
  
  return publicData;
};

// Static method to find users by role
userSchema.statics.findByRole = function(role) {
  return this.find({ role, isActive: true });
};

// Static method to find users by company
userSchema.statics.findByCompany = function(companyId) {
  return this.find({ companyId, isActive: true });
};

// Static method to find users by company and role
userSchema.statics.findByCompanyAndRole = function(companyId, role) {
  return this.find({ companyId, role, isActive: true });
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
    case 'superadmin':
      return true; // Super Admin can access all cranes across all companies
    case 'admin':
      return true; // Admin can access all cranes within their company
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
    case 'superadmin':
      return []; // Super Admin can see all cranes across all companies (handled in backend)
    case 'admin':
      return []; // Admin can see all cranes within their company (handled in backend)
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
    'users.create': ['superadmin', 'admin', 'manager', 'supervisor'],
    'users.read': ['superadmin', 'admin', 'manager', 'supervisor'],
    'users.update': ['superadmin', 'admin', 'manager', 'supervisor'],
    'users.delete': ['superadmin', 'admin', 'manager'],
    
    // Crane management - simplified
    'cranes.create': ['admin', 'manager'],
    'cranes.read': ['superadmin', 'admin', 'manager', 'supervisor', 'operator'],
    'cranes.update': ['admin', 'manager', 'supervisor'],
    'cranes.delete': ['admin', 'manager'],
    'cranes.assign': ['admin', 'manager', 'supervisor'],
    
    // Ticket management - new
    'tickets.create': ['operator'],
    'tickets.read': ['superadmin', 'admin', 'manager', 'supervisor'],
    'tickets.update': ['superadmin', 'admin', 'manager', 'supervisor'],
    'tickets.delete': ['superadmin', 'admin', 'manager'],
    
    // Company management - superadmin only
    'companies.create': ['superadmin'],
    'companies.read': ['superadmin'],
    'companies.update': ['superadmin'],
    'companies.delete': ['superadmin'],
    
    // System permissions
    'system.settings': ['superadmin', 'admin'],
    'system.reports': ['superadmin', 'admin', 'manager', 'supervisor'],
    'system.analytics': ['superadmin', 'admin', 'manager']
  };
  
  const allowedRoles = PERMISSIONS[permission];
  return allowedRoles && allowedRoles.includes(this.role);
};

// Instance method to get user's role level
userSchema.methods.getRoleLevel = function() {
  const ROLE_HIERARCHY = {
    'superadmin': 5,
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
  
  // New simplified hierarchy with superadmin
  const hierarchy = {
    'superadmin': ['admin'],        // Super Admin can manage company admins
    'admin': ['manager'],           // Admin can only manage managers
    'manager': ['supervisor'],      // Manager can only manage supervisors
    'supervisor': ['operator'],     // Supervisor can only manage operators
    'operator': []                  // Operators cannot manage anyone
  };
  
  // Super Admin can only manage admins from different companies
  // Users within same company follow the hierarchy
  if (this.role === 'superadmin') {
    return targetUser.role === 'admin';
  }
  
  // Non-superadmin users can only manage users within their own company
  if (this.companyId && targetUser.companyId) {
    if (this.companyId.toString() !== targetUser.companyId.toString()) {
      return false; // Cannot manage users from different companies
    }
  }
  
  return hierarchy[this.role] && hierarchy[this.role].includes(targetUser.role);
};

// Instance method to get users this user can manage
userSchema.methods.getManageableRoles = function() {
  const hierarchy = {
    'superadmin': ['admin'],
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
  
  if (!this.role || !['superadmin', 'admin', 'manager', 'supervisor', 'operator'].includes(this.role)) {
    errors.push('Valid role is required');
  }
  
  // Superadmin must have headOfficeId
  if (this.role === 'superadmin' && !this.headOfficeId) {
    errors.push('Head Office ID is required for Super Admin role');
  }
  
  // Non-superadmin must have companyId
  if (this.role !== 'superadmin' && !this.companyId) {
    errors.push('Company ID is required for non-superadmin users');
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

const User = require('../models/User');

// Role hierarchy definition
const ROLE_HIERARCHY = {
  'superadmin': 5,
  'admin': 4,
  'manager': 3,
  'supervisor': 2,
  'operator': 1
};

// Permission definitions - New Simplified RBAC with Super Admin
const PERMISSIONS = {
  // User management - simplified hierarchy
  'users.create': ['superadmin', 'admin', 'manager', 'supervisor'],
  'users.read': ['superadmin', 'admin', 'manager', 'supervisor'],
  'users.update': ['superadmin', 'admin', 'manager', 'supervisor'],
  'users.delete': ['superadmin', 'admin', 'manager'],
  
  // Crane management - admins and managers can create/delete
  'cranes.create': ['admin', 'manager'],
  'cranes.read': ['superadmin', 'admin', 'manager', 'supervisor', 'operator'],
  'cranes.update': ['admin', 'manager', 'supervisor'],
  'cranes.delete': ['admin', 'manager'],
  'cranes.assign': ['admin', 'manager', 'supervisor'],
  
  // Ticket management - new feature
  'tickets.create': ['operator'],
  'tickets.read': ['superadmin', 'admin', 'manager', 'supervisor'],
  'tickets.update': ['superadmin', 'admin', 'manager', 'supervisor'],
  'tickets.delete': ['superadmin', 'admin', 'manager'],
  'tickets.assign': ['admin', 'manager', 'supervisor'],
  'tickets.resolve': ['admin', 'manager', 'supervisor'],
  
  // Company management - superadmin only
  'companies.create': ['superadmin'],
  'companies.read': ['superadmin'],
  'companies.update': ['superadmin'],
  'companies.delete': ['superadmin'],
  'companies.billing': ['superadmin'],
  
  // System permissions
  'system.settings': ['superadmin', 'admin'],
  'system.reports': ['superadmin', 'admin', 'manager', 'supervisor'],
  'system.analytics': ['superadmin', 'admin', 'manager']
};

// Helper function to get better error messages
const getPermissionError = (permission, userRole) => {
  const roleMessages = {
    'superadmin': 'Super Administrators',
    'admin': 'Administrators',
    'manager': 'Managers',
    'supervisor': 'Supervisors', 
    'operator': 'Operators'
  };
  
  const allowedRoles = PERMISSIONS[permission] || [];
  const allowedRoleNames = allowedRoles.map(role => roleMessages[role]).join(', ');
  
  return {
    error: 'Insufficient permissions',
    message: `This action requires ${allowedRoleNames} role. You have ${roleMessages[userRole]} role.`,
    permission: permission,
    current: userRole,
    required: allowedRoles
  };
};

// Helper function to validate permissions
const validatePermission = (permission, userRole) => {
  const allowedRoles = PERMISSIONS[permission];
  return allowedRoles && allowedRoles.includes(userRole);
};

// Audit logging function
const auditLog = (action, req, additionalData = {}) => {
  const logData = {
    timestamp: new Date(),
    action: action,
    userId: req.user?._id,
    userRole: req.user?.role,
    userEmail: req.user?.email,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    ...additionalData
  };
  
  console.log('AUDIT:', JSON.stringify(logData));
};

// Middleware to check if user has required role level
const requireRole = (minRole) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userRoleLevel = ROLE_HIERARCHY[req.user.role];
    const requiredRoleLevel = ROLE_HIERARCHY[minRole];

    if (userRoleLevel < requiredRoleLevel) {
      auditLog('ROLE_DENIED', req, { 
        required: minRole, 
        current: req.user.role,
        reason: 'Insufficient role level'
      });
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        message: `This action requires ${minRole} role or higher. You have ${req.user.role} role.`,
        required: minRole,
        current: req.user.role
      });
    }

    auditLog('ROLE_GRANTED', req, { required: minRole });
    next();
  };
};

// Middleware to check specific permission
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!validatePermission(permission, req.user.role)) {
      auditLog('PERMISSION_DENIED', req, { 
        permission, 
        reason: 'Insufficient role' 
      });
      return res.status(403).json(getPermissionError(permission, req.user.role));
    }

    auditLog('PERMISSION_GRANTED', req, { permission });
    next();
  };
};

// Middleware to check if user can manage target user
const canManageUser = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const targetUserId = req.params.id || req.params.userId || req.body.userId;
  if (!targetUserId) {
    return res.status(400).json({ error: 'Target user ID required' });
  }

  // Check if user is trying to manage themselves
  if (targetUserId === req.user._id.toString()) {
    auditLog('SELF_MANAGEMENT_ATTEMPT', req, { targetUserId });
    return res.status(400).json({ 
      error: 'Cannot manage yourself',
      message: 'You cannot perform management actions on your own account'
    });
  }

  User.findById(targetUserId)
    .then(targetUser => {
      if (!targetUser) {
        auditLog('USER_NOT_FOUND', req, { targetUserId });
        return res.status(404).json({ error: 'Target user not found' });
      }

      if (!targetUser.isActive) {
        auditLog('INACTIVE_USER_MANAGEMENT_ATTEMPT', req, { 
          targetUserId, 
          targetUserRole: targetUser.role 
        });
        return res.status(400).json({ 
          error: 'Cannot manage inactive user',
          message: 'The target user account is inactive'
        });
      }

      if (!req.user.canManageUser(targetUser)) {
        auditLog('USER_MANAGEMENT_DENIED', req, { 
          targetUserId, 
          targetRole: targetUser.role,
          currentRole: req.user.role,
          reason: 'Insufficient hierarchy level'
        });
        return res.status(403).json({ 
          error: 'Cannot manage this user',
          message: `${req.user.role}s cannot manage ${targetUser.role}s`,
          targetRole: targetUser.role,
          currentRole: req.user.role
        });
      }

      auditLog('USER_MANAGEMENT_GRANTED', req, { 
        targetUserId, 
        targetRole: targetUser.role 
      });
      req.targetUser = targetUser;
      next();
    })
    .catch(error => {
      console.error('Error checking user management permissions:', error);
      auditLog('USER_MANAGEMENT_ERROR', req, { 
        targetUserId, 
        error: error.message 
      });
      res.status(500).json({ error: 'Internal server error' });
    });
};

// Middleware to check if user can access crane
const canAccessCrane = (craneIdParam = 'craneId') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const craneId = req.params[craneIdParam] || req.body.craneId;
    if (!craneId) {
      return res.status(400).json({ error: 'Crane ID required' });
    }

    // Admin can access all cranes
    if (req.user.role === 'admin') {
      return next();
    }

    const accessibleCranes = req.user.getAccessibleCranes();
    if (!accessibleCranes.includes(craneId)) {
      auditLog('CRANE_ACCESS_DENIED', req, { 
        craneId, 
        accessibleCranes: accessibleCranes.length,
        reason: 'Crane not in accessible list'
      });
      return res.status(403).json({ 
        error: 'Access denied to this crane',
        message: 'You do not have permission to access this crane',
        craneId: craneId
      });
    }

    auditLog('CRANE_ACCESS_GRANTED', req, { craneId });
    next();
  };
};

// Middleware to filter data based on user role
const filterDataByRole = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Add accessible cranes to request for filtering
  req.accessibleCranes = req.user.getAccessibleCranes();
  auditLog('DATA_FILTER_APPLIED', req, { 
    accessibleCranes: req.accessibleCranes.length 
  });
  next();
};

// Middleware to enforce company isolation (multi-tenant)
const enforceCompanyIsolation = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Super Admin can access all companies
  if (req.user.role === 'superadmin') {
    req.companyFilter = {}; // No filter for superadmin
    return next();
  }

  // All other users can only access their own company data
  if (!req.user.companyId) {
    auditLog('COMPANY_ISOLATION_FAILED', req, { 
      reason: 'User has no company assigned' 
    });
    return res.status(403).json({ 
      error: 'Access denied',
      message: 'User must be assigned to a company'
    });
  }

  // Add company filter to request
  req.companyFilter = { companyId: req.user.companyId };
  auditLog('COMPANY_ISOLATION_APPLIED', req, { 
    companyId: req.user.companyId 
  });
  next();
};

// Helper function to check if user can create specific role - New Simplified Hierarchy
const canCreateRole = (currentUserRole, targetRole) => {
  const creationHierarchy = {
    'superadmin': ['admin'],        // Super Admin can create company admins
    'admin': ['manager'],           // Admin can only create managers
    'manager': ['supervisor'],      // Manager can only create supervisors
    'supervisor': ['operator'],     // Supervisor can only create operators
    'operator': []                  // Operators cannot create anyone
  };

  return creationHierarchy[currentUserRole] && 
         creationHierarchy[currentUserRole].includes(targetRole);
};

// Middleware to validate role creation
const validateRoleCreation = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const targetRole = req.body.role;
  if (!targetRole) {
    return res.status(400).json({ error: 'Role is required' });
  }

  if (!canCreateRole(req.user.role, targetRole)) {
    auditLog('ROLE_CREATION_DENIED', req, { 
      targetRole, 
      currentRole: req.user.role,
      reason: 'Insufficient hierarchy level'
    });
    return res.status(403).json({ 
      error: 'Cannot create user with this role',
      message: `${req.user.role}s cannot create ${targetRole}s`,
      targetRole: targetRole,
      currentRole: req.user.role
    });
  }

  auditLog('ROLE_CREATION_VALIDATED', req, { targetRole });
  next();
};

// Helper function to check if user can access specific data
const canAccessData = (user, dataType, dataId) => {
  switch (dataType) {
    case 'crane':
      return user.getAccessibleCranes().includes(dataId);
    case 'user':
      return user.role === 'admin' || user._id.toString() === dataId;
    default:
      return false;
  }
};

// Middleware to validate data access
const validateDataAccess = (dataType, idParam = 'id') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const dataId = req.params[idParam];
    if (!dataId) {
      return res.status(400).json({ error: `${dataType} ID required` });
    }

    if (!canAccessData(req.user, dataType, dataId)) {
      auditLog('DATA_ACCESS_DENIED', req, { 
        dataType, 
        dataId, 
        reason: 'Insufficient permissions'
      });
      return res.status(403).json({ 
        error: `Access denied to this ${dataType}`,
        message: `You do not have permission to access this ${dataType}`,
        dataId: dataId
      });
    }

    auditLog('DATA_ACCESS_GRANTED', req, { dataType, dataId });
    next();
  };
};

module.exports = {
  requireRole,
  requirePermission,
  canManageUser,
  canAccessCrane,
  filterDataByRole,
  enforceCompanyIsolation,
  validateRoleCreation,
  validateDataAccess,
  canCreateRole,
  canAccessData,
  validatePermission,
  getPermissionError,
  auditLog,
  ROLE_HIERARCHY,
  PERMISSIONS
};
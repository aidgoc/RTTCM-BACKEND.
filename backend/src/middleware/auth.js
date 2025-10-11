const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Audit logging function
const auditLog = (action, req, additionalData = {}) => {
  const logData = {
    timestamp: new Date(),
    action: action,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    ...additionalData
  };
  
  console.log('AUTH_AUDIT:', JSON.stringify(logData));
};

/**
 * Middleware to authenticate JWT token
 */
const authenticateToken = async (req, res, next) => {
  try {
    // Get token from Authorization header or cookie
    let token = req.headers.authorization;
    
    if (token && token.startsWith('Bearer ')) {
      token = token.slice(7);
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      auditLog('AUTH_FAILED', req, { reason: 'No token provided' });
      return res.status(401).json({ 
        error: 'Access token required',
        message: 'Please provide a valid authentication token'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const user = await User.findById(decoded.userId).select('-passwordHash');
    if (!user) {
      auditLog('AUTH_FAILED', req, { 
        reason: 'User not found',
        userId: decoded.userId 
      });
      return res.status(401).json({ 
        error: 'Invalid user',
        message: 'User account not found'
      });
    }

    if (!user.isActive) {
      auditLog('AUTH_FAILED', req, { 
        reason: 'Inactive user',
        userId: user._id,
        userEmail: user.email
      });
      return res.status(401).json({ 
        error: 'Account inactive',
        message: 'Your account has been deactivated. Please contact support.'
      });
    }

    // Add user to request object
    req.user = user;
    auditLog('AUTH_SUCCESS', req, { 
      userId: user._id,
      userRole: user.role,
      userEmail: user.email
    });
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      auditLog('AUTH_FAILED', req, { 
        reason: 'Invalid token format',
        error: error.message
      });
      return res.status(401).json({ 
        error: 'Invalid token',
        message: 'The provided token is malformed'
      });
    } else if (error.name === 'TokenExpiredError') {
      auditLog('AUTH_FAILED', req, { 
        reason: 'Token expired',
        error: error.message
      });
      return res.status(401).json({ 
        error: 'Token expired',
        message: 'Your session has expired. Please log in again.'
      });
    }
    
    console.error('Auth middleware error:', error);
    auditLog('AUTH_ERROR', req, { 
      reason: 'Internal error',
      error: error.message
    });
    res.status(500).json({ 
      error: 'Authentication error',
      message: 'An internal error occurred during authentication'
    });
  }
};

/**
 * Middleware to require specific role(s)
 * @param {string|string[]} roles - Required role(s)
 */
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      auditLog('ROLE_CHECK_FAILED', req, { reason: 'No user in request' });
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'Please log in to access this resource'
      });
    }

    const userRole = req.user.role;
    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (!allowedRoles.includes(userRole)) {
      auditLog('ROLE_CHECK_FAILED', req, { 
        reason: 'Insufficient role',
        required: allowedRoles,
        current: userRole,
        userId: req.user._id
      });
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        message: `This action requires one of: ${allowedRoles.join(', ')}. You have ${userRole} role.`,
        required: allowedRoles,
        current: userRole
      });
    }

    auditLog('ROLE_CHECK_PASSED', req, { 
      required: allowedRoles,
      current: userRole,
      userId: req.user._id
    });
    next();
  };
};

/**
 * Middleware to check if user can access crane data
 * @param {string} craneIdParam - Name of the parameter containing crane ID
 */
const requireCraneAccess = (craneIdParam = 'id') => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const craneId = req.params[craneIdParam];
      const user = req.user;

      // Admin can access all cranes
      if (user.role === 'admin') {
        return next();
      }

      // Manager can access managed cranes
      if (user.role === 'manager' && user.managedCranes.includes(craneId)) {
        return next();
      }

      // Operator can access assigned cranes
      if (user.role === 'operator' && user.assignedCranes.includes(craneId)) {
        return next();
      }

      return res.status(403).json({ 
        error: 'Access denied to this crane',
        craneId: craneId
      });
    } catch (error) {
      console.error('Crane access middleware error:', error);
      res.status(500).json({ error: 'Authorization error' });
    }
  };
};

/**
 * Middleware to filter cranes based on user role
 */
const filterCranesByRole = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = req.user;

    // Admin can see all cranes
    if (user.role === 'admin') {
      req.craneFilter = {};
      return next();
    }

    // Manager can see managed cranes
    if (user.role === 'manager') {
      req.craneFilter = { craneId: { $in: user.managedCranes } };
      return next();
    }

    // Operator can see assigned cranes
    if (user.role === 'operator') {
      req.craneFilter = { craneId: { $in: user.assignedCranes } };
      return next();
    }

    // Default: no access
    req.craneFilter = { craneId: { $in: [] } };
    next();
  } catch (error) {
    console.error('Crane filter middleware error:', error);
    res.status(500).json({ error: 'Authorization error' });
  }
};

/**
 * Middleware to check if user can manage users (admin only)
 */
const requireUserManagement = requireRole(['admin']);

/**
 * Middleware to check if user is admin
 */
const requireAdmin = requireRole(['admin']);

/**
 * Middleware to check if user can manage cranes (admin or manager)
 */
const requireCraneManagement = requireRole(['admin', 'manager']);

/**
 * Middleware to check if user can access simulation (admin or manager)
 */
const requireSimulationAccess = requireRole(['admin', 'manager']);

module.exports = {
  authenticateToken,
  requireRole,
  requireCraneAccess,
  filterCranesByRole,
  requireUserManagement,
  requireAdmin,
  requireCraneManagement,
  requireSimulationAccess
};

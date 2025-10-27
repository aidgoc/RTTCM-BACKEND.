const express = require('express');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');
const { requirePermission, validateRoleCreation, canCreateRole } = require('../middleware/rbac');
const { 
  smartCache, 
  smartInvalidation,
  cacheMiddleware,
  cacheInvalidation 
} = require('../middleware/cache');
const cacheService = require('../services/cacheService');

const router = express.Router();

// Rate limiting disabled for development
const authLimiter = (req, res, next) => {
  // Skip rate limiting in development
  next();
};

/**
 * POST /api/auth/login
 * User login with email and password
 */
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password, companyId, headOfficeId } = req.body;

    console.log('Login attempt for email:', email);

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email and password are required' 
      });
    }

    // Find user by email
    const user = await User.findOne({ email, isActive: true });
    console.log('User found:', user ? 'Yes' : 'No');
    if (user) {
      console.log('User email:', user.email);
      console.log('User role:', user.role);
      console.log('User isActive:', user.isActive);
    }
    
    if (!user) {
      return res.status(401).json({ 
        error: 'Invalid credentials' 
      });
    }

    // Super Admin must provide Head Office ID
    if (user.role === 'superadmin') {
      if (!headOfficeId) {
        return res.status(400).json({ 
          error: 'Head Office ID is required for Super Admin login' 
        });
      }
      
      // Validate Head Office ID
      if (user.headOfficeId !== headOfficeId) {
        console.log('Invalid Head Office ID');
        return res.status(401).json({ 
          error: 'Invalid credentials' 
        });
      }
    } else {
      // Non-superadmin users must provide Company ID
      if (!companyId) {
        return res.status(400).json({ 
          error: 'Company ID is required for login' 
        });
      }
      
      // Validate Company ID matches user's company
      const userCompanyId = user.companyId?.trim().toUpperCase();
      const providedCompanyId = companyId?.trim().toUpperCase();
      
      console.log('User Company ID (trimmed):', `"${userCompanyId}"`);
      console.log('Provided Company ID (trimmed):', `"${providedCompanyId}"`);
      console.log('Company ID match:', userCompanyId === providedCompanyId);
      
      if (userCompanyId !== providedCompanyId) {
        console.log('Invalid Company ID - Mismatch');
        return res.status(401).json({ 
          error: 'Invalid credentials' 
        });
      }
      
      // Non-superadmin users should not provide Head Office ID
      if (headOfficeId) {
        return res.status(400).json({ 
          error: 'Head Office ID is only for Super Admin' 
        });
      }
    }

    // Check password
    const isValidPassword = await user.checkPassword(password);
    console.log('Password valid:', isValidPassword);
    if (!isValidPassword) {
      return res.status(401).json({ 
        error: 'Invalid credentials' 
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id, 
        email: user.email, 
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Set httpOnly cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // 'none' for cross-origin
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    // Return user data (without password)
    res.json({
      message: 'Login successful',
      user: user.toPublicJSON(),
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * POST /api/auth/signup
 * User registration
 */
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, role = 'operator', headOfficeId, companyId } = req.body;

    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({ 
        error: 'Name, email, and password are required' 
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ 
        error: 'User with this email already exists' 
      });
    }

    // Validate role
    const validRoles = ['superadmin', 'admin', 'manager', 'supervisor', 'operator'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ 
        error: 'Invalid role. Must be superadmin, admin, manager, supervisor, or operator' 
      });
    }

    // Super Admin specific validation
    if (role === 'superadmin') {
      if (!headOfficeId) {
        return res.status(400).json({ 
          error: 'Head Office ID is required for Super Admin signup' 
        });
      }
      // Super Admin should not have a company
      if (companyId) {
        return res.status(400).json({ 
          error: 'Super Admin should not be assigned to a company' 
        });
      }
    } else {
      // Non-superadmin users must have a company
      if (!companyId) {
        return res.status(400).json({ 
          error: 'Company ID is required for non-superadmin users' 
        });
      }
      // Non-superadmin should not have headOfficeId
      if (headOfficeId) {
        return res.status(400).json({ 
          error: 'Head Office ID is only for Super Admin' 
        });
      }
    }

    // Create new user
    const userData = {
      name,
      email,
      passwordHash: password, // Will be hashed by pre-save middleware
      role
    };

    // Add role-specific fields
    if (role === 'superadmin') {
      userData.headOfficeId = headOfficeId;
    } else {
      userData.companyId = companyId;
    }

    const user = new User(userData);

    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id, 
        email: user.email, 
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Set httpOnly cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // 'none' for cross-origin
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    // Return user data (without password)
    res.status(201).json({
      message: 'User created successfully',
      user: user.toPublicJSON(),
      token
    });
  } catch (error) {
    console.error('Signup error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors 
      });
    }
    
    res.status(500).json({ error: 'Registration failed' });
  }
});

/**
 * GET /api/auth/me
 * Get current user information
 */
router.get('/me', authLimiter, authenticateToken, smartCache, async (req, res) => {
  try {
    // Generate a new token for the current session
    const token = jwt.sign(
      { 
        userId: req.user._id, 
        email: req.user.email, 
        role: req.user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({
      user: req.user.toPublicJSON(),
      token: token
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user information' });
  }
});

/**
 * POST /api/auth/logout
 * User logout (clear cookie)
 */
router.post('/logout', (req, res) => {
  try {
    // Clear the token cookie
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh JWT token
 */
router.post('/refresh', authenticateToken, async (req, res) => {
  try {
    const user = req.user;

    // Generate new token
    const token = jwt.sign(
      { 
        userId: user._id, 
        email: user.email, 
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Set new httpOnly cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // 'none' for cross-origin
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    res.json({
      message: 'Token refreshed successfully',
      user: user.toPublicJSON(),
      token
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'Token refresh failed' });
  }
});

/**
 * POST /api/auth/create-user
 * Create user with role-based permissions (superadmin/admin/manager/supervisor)
 */
router.post('/create-user', authenticateToken, validateRoleCreation, async (req, res) => {
  try {
    const { name, email, password, role, companyId } = req.body;

    // Validate input
    if (!name || !email || !password || !role) {
      return res.status(400).json({ 
        error: 'Name, email, password, and role are required' 
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ 
        error: 'User with this email already exists' 
      });
    }

    // Company validation
    let assignedCompanyId;
    
    if (req.user.role === 'superadmin') {
      // Super Admin creating a company admin
      if (role === 'admin') {
        if (!companyId) {
          return res.status(400).json({ 
            error: 'Company ID is required when creating company admin' 
          });
        }
        assignedCompanyId = companyId;
      } else {
        return res.status(400).json({ 
          error: 'Super Admin can only create company admins' 
        });
      }
    } else {
      // Non-superadmin users create users within their own company
      assignedCompanyId = req.user.companyId;
      
      if (!assignedCompanyId) {
        return res.status(400).json({ 
          error: 'Creator must be assigned to a company' 
        });
      }
    }

    // Create new user with creator relationship
    const user = new User({
      name,
      email,
      passwordHash: password, // Will be hashed by pre-save middleware
      role,
      companyId: assignedCompanyId,
      createdBy: req.user._id
    });

    await user.save();

    // Return user data (without password)
    res.status(201).json({
      message: 'User created successfully',
      user: user.toPublicJSON()
    });
  } catch (error) {
    console.error('Create user error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors 
      });
    }
    
    res.status(500).json({ error: 'User creation failed' });
  }
});

/**
 * GET /api/auth/roles
 * Get available roles for current user
 */
router.get('/roles', authenticateToken, smartCache, (req, res) => {
  try {
    const availableRoles = [];
    
    switch (req.user.role) {
      case 'superadmin':
        availableRoles.push('admin');
        break;
      case 'admin':
        availableRoles.push('manager');
        break;
      case 'manager':
        availableRoles.push('supervisor', 'operator');
        break;
      case 'supervisor':
        availableRoles.push('operator');
        break;
      default:
        break;
    }

    res.json({
      currentRole: req.user.role,
      canCreate: availableRoles
    });
  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({ error: 'Failed to get available roles' });
  }
});

module.exports = router;

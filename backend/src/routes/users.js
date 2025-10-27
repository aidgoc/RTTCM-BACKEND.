const express = require('express');
const User = require('../models/User');
const Crane = require('../models/Crane');
const { authenticateToken } = require('../middleware/auth');
const { 
  requirePermission, 
  canManageUser, 
  validateRoleCreation,
  filterDataByRole 
} = require('../middleware/rbac');
const { 
  smartCache, 
  smartInvalidation,
  cacheMiddleware,
  cacheInvalidation 
} = require('../middleware/cache');
const cacheService = require('../services/cacheService');

const router = express.Router();

// Helper function to update crane assignments when user assignments change
async function updateCraneAssignments(user, updates) {
  try {
    // Update operator assignments (assignedCranesBySupervisor)
    if (updates.assignedCranesBySupervisor !== undefined) {
      // Remove user from all cranes they were previously assigned to
      await Crane.updateMany(
        { operators: user._id },
        { $pull: { operators: user._id } }
      );

      // Add user to newly assigned cranes
      if (updates.assignedCranesBySupervisor.length > 0) {
        await Crane.updateMany(
          { craneId: { $in: updates.assignedCranesBySupervisor } },
          { $addToSet: { operators: user._id } }
        );
      }
    }

    // Update supervisor assignments (assignedCranesByManager)
    if (updates.assignedCranesByManager !== undefined) {
      // Update crane supervisor assignments
      await Crane.updateMany(
        { supervisorUserId: user._id },
        { $unset: { supervisorUserId: 1 } }
      );

      // Add user to newly assigned cranes as supervisor
      if (updates.assignedCranesByManager.length > 0) {
        await Crane.updateMany(
          { craneId: { $in: updates.assignedCranesByManager } },
          { $set: { supervisorUserId: user._id } }
        );
      }
    }

    // Update manager assignments
    if (updates.managedCranes !== undefined) {
      // Remove user from all cranes they were previously managing
      await Crane.updateMany(
        { managerUserId: user._id },
        { $unset: { managerUserId: 1 } }
      );

      // Add user to newly managed cranes
      if (updates.managedCranes.length > 0) {
        await Crane.updateMany(
          { craneId: { $in: updates.managedCranes } },
          { $set: { managerUserId: user._id } }
        );
      }
    }
  } catch (error) {
    console.error('Error updating crane assignments:', error);
    throw error;
  }
}

/**
 * GET /api/users
 * Get all users (filtered by role hierarchy)
 */
router.get('/', authenticateToken, requirePermission('users.read'), filterDataByRole, smartCache, async (req, res) => {
  try {
    const { page = 1, limit = 20, role, search } = req.query;
    const skip = (page - 1) * limit;

    // Build query based on user role
    let query = { isActive: true };
    
    // Filter users based on role hierarchy
    if (req.user.role === 'admin') {
      // Admins can only see users within their own company (managers, supervisors, operators)
      // They CANNOT see super admins or users from other companies
      query.companyId = req.user.companyId;
      query.role = { $in: ['manager', 'supervisor', 'operator'] };
    } else if (req.user.role === 'manager') {
      // Managers can only see supervisors and operators they created
      query.$or = [
        { createdBy: req.user._id },
        { role: { $in: ['supervisor', 'operator'] } }
      ];
    } else if (req.user.role === 'supervisor') {
      // Supervisors can only see operators they created
      query.createdBy = req.user._id;
    }
    // Super admin can see all users (no additional filter)
    
    if (role) {
      query.role = role;
    }
    
    if (search) {
      query.$and = [
        query.$or ? { $or: query.$or } : {},
        {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } }
          ]
        }
      ];
      delete query.$or;
    }

    // Get users with pagination
    const users = await User.find(query)
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const total = await User.countDocuments(query);

    res.json({
      users: users.map(user => user.toPublicJSON()),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

/**
 * GET /api/users/:id
 * Get specific user details (role-based access)
 */
router.get('/:id', authenticateToken, canManageUser, smartCache, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-passwordHash');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get assigned/managed cranes details based on role
    let assignedCranes = [];
    let managedCranes = [];
    let assignedCranesByManager = [];
    let assignedCranesBySupervisor = [];

    if (user.assignedCranes && user.assignedCranes.length > 0) {
      assignedCranes = await Crane.find({ 
        craneId: { $in: user.assignedCranes },
        isActive: true 
      }).select('craneId name location online lastSeen');
    }

    if (user.managedCranes && user.managedCranes.length > 0) {
      managedCranes = await Crane.find({ 
        craneId: { $in: user.managedCranes },
        isActive: true 
      }).select('craneId name location online lastSeen');
    }

    if (user.assignedCranesByManager && user.assignedCranesByManager.length > 0) {
      assignedCranesByManager = await Crane.find({ 
        craneId: { $in: user.assignedCranesByManager },
        isActive: true 
      }).select('craneId name location online lastSeen');
    }

    if (user.assignedCranesBySupervisor && user.assignedCranesBySupervisor.length > 0) {
      assignedCranesBySupervisor = await Crane.find({ 
        craneId: { $in: user.assignedCranesBySupervisor },
        isActive: true 
      }).select('craneId name location online lastSeen');
    }

    res.json({
      ...user.toPublicJSON(),
      assignedCranesDetails: assignedCranes,
      managedCranesDetails: managedCranes,
      assignedCranesByManagerDetails: assignedCranesByManager,
      assignedCranesBySupervisorDetails: assignedCranesBySupervisor
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user details' });
  }
});

/**
 * POST /api/users
 * Create new user (role-based permissions)
 */
router.post('/', authenticateToken, validateRoleCreation, smartInvalidation, async (req, res) => {
  try {
    const { name, email, password, role, assignedCranes = [] } = req.body;

    // Validate required fields
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

    // Validate role
    const validRoles = ['admin', 'manager', 'supervisor', 'operator'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ 
        error: 'Invalid role. Must be admin, manager, supervisor, or operator' 
      });
    }

    // Validate crane assignments
    if (assignedCranes.length > 0) {
      const cranes = await Crane.find({ 
        craneId: { $in: assignedCranes },
        isActive: true 
      });
      if (cranes.length !== assignedCranes.length) {
        return res.status(400).json({ 
          error: 'One or more assigned cranes do not exist' 
        });
      }
    }


    // Create new user with creator relationship
    const user = new User({
      name,
      email,
      passwordHash: password, // Will be hashed by pre-save middleware
      role,
      companyId: req.user.companyId, // Inherit companyId from logged-in user
      assignedCranes,
      createdBy: req.user._id
    });

    await user.save();

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
    
    res.status(500).json({ error: 'Failed to create user' });
  }
});

/**
 * PATCH /api/users/:id
 * Update user (role-based permissions)
 */
router.patch('/:id', authenticateToken, canManageUser, smartInvalidation, async (req, res) => {
  try {
    const userId = req.params.id;
    const updates = req.body;
    const currentUser = req.user;

    // Remove fields that shouldn't be updated directly
    delete updates._id;
    delete updates.createdAt;
    delete updates.updatedAt;
    delete updates.lastLogin;

    // Get the target user
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Manager restrictions
    if (currentUser.role === 'manager') {
      // Managers can update supervisors and operators
      if (!['supervisor', 'operator'].includes(targetUser.role)) {
        return res.status(403).json({ 
          error: 'Managers can only update supervisors and operators' 
        });
      }

      // Managers can only assign cranes they manage
      if (updates.assignedCranesByManager) {
        const managedCranes = currentUser.managedCranes || [];
        const invalidCranes = updates.assignedCranesByManager.filter(
          craneId => !managedCranes.includes(craneId)
        );
        
        if (invalidCranes.length > 0) {
          return res.status(403).json({ 
            error: 'Can only assign cranes you manage',
            invalidCranes: invalidCranes
          });
        }
      }

      // Remove fields managers can't update
      delete updates.role;
      delete updates.managedCranes;
      // Allow managers to deactivate users (isActive field)
    }

    // If updating password, hash it
    if (updates.password) {
      updates.passwordHash = updates.password;
      delete updates.password;
    }

    // Validate crane assignments if provided
    if (updates.assignedCranesByManager) {
      const cranes = await Crane.find({ 
        craneId: { $in: updates.assignedCranesByManager },
        isActive: true 
      });
      if (cranes.length !== updates.assignedCranesByManager.length) {
        return res.status(400).json({ 
          error: 'One or more assigned cranes do not exist' 
        });
      }
    }

    if (updates.assignedCranesBySupervisor) {
      const cranes = await Crane.find({ 
        craneId: { $in: updates.assignedCranesBySupervisor },
        isActive: true 
      });
      if (cranes.length !== updates.assignedCranesBySupervisor.length) {
        return res.status(400).json({ 
          error: 'One or more assigned cranes do not exist' 
        });
      }
    }

    if (updates.managedCranes) {
      const cranes = await Crane.find({ 
        craneId: { $in: updates.managedCranes },
        isActive: true 
      });
      if (cranes.length !== updates.managedCranes.length) {
        return res.status(400).json({ 
          error: 'One or more managed cranes do not exist' 
        });
      }
    }

    const user = await User.findByIdAndUpdate(
      userId,
      updates,
      { new: true, runValidators: true }
    ).select('-passwordHash');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update crane assignments to maintain data consistency
    if (updates.assignedCranesByManager !== undefined || updates.assignedCranesBySupervisor !== undefined || updates.managedCranes !== undefined) {
      await updateCraneAssignments(user, updates);
    }

    res.json({
      message: 'User updated successfully',
      user: user.toPublicJSON()
    });
  } catch (error) {
    console.error('Update user error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors 
      });
    }
    
    res.status(500).json({ error: 'Failed to update user' });
  }
});

/**
 * DELETE /api/users/:id
 * Deactivate user (role-based permissions)
 */
router.delete('/:id', authenticateToken, canManageUser, smartInvalidation, async (req, res) => {
  try {
    const userId = req.params.id;

    // Prevent admin from deactivating themselves
    if (userId === req.user._id.toString()) {
      return res.status(400).json({ 
        error: 'Cannot deactivate your own account' 
      });
    }

    // Additional security: Prevent non-superadmin from deactivating superadmin
    if (req.user.role !== 'superadmin' && req.targetUser && req.targetUser.role === 'superadmin') {
      return res.status(403).json({ 
        error: 'Access denied',
        message: 'Only Super Admin can deactivate other Super Admins'
      });
    }

    // Soft delete by setting isActive to false
    const user = await User.findByIdAndUpdate(
      userId,
      { isActive: false },
      { new: true }
    ).select('-passwordHash');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ 
      message: 'User deactivated successfully',
      user: user.toPublicJSON()
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to deactivate user' });
  }
});

/**
 * GET /api/users/stats/summary
 * Get user statistics summary (role-based access)
 */
router.get('/stats/summary', authenticateToken, requirePermission('users.read'), smartCache, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ isActive: true });
    const adminCount = await User.countDocuments({ role: 'admin', isActive: true });
    const managerCount = await User.countDocuments({ role: 'manager', isActive: true });
    const supervisorCount = await User.countDocuments({ role: 'supervisor', isActive: true });
    const operatorCount = await User.countDocuments({ role: 'operator', isActive: true });
    
    const recentUsers = await User.find({ isActive: true })
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      summary: {
        total: totalUsers,
        admin: adminCount,
        manager: managerCount,
        supervisor: supervisorCount,
        operator: operatorCount
      },
      recentUsers: recentUsers.map(user => user.toPublicJSON())
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ error: 'Failed to fetch user statistics' });
  }
});

module.exports = router;

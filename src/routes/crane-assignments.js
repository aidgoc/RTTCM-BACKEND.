const express = require('express');
const User = require('../models/User');
const Crane = require('../models/Crane');
const { authenticateToken } = require('../middleware/auth');
const { 
  requirePermission, 
  canAccessCrane,
  canManageUser 
} = require('../middleware/rbac');

const router = express.Router();

/**
 * POST /api/crane-assignments/assign-to-supervisor
 * Assign cranes to supervisor (manager only)
 */
router.post('/assign-to-supervisor', authenticateToken, requirePermission('cranes.assign'), async (req, res) => {
  try {
    const { supervisorId, craneIds } = req.body;

    // Validate input
    if (!supervisorId || !craneIds || !Array.isArray(craneIds)) {
      return res.status(400).json({ 
        error: 'Supervisor ID and crane IDs array are required' 
      });
    }

    // Verify supervisor exists and is a supervisor
    const supervisor = await User.findById(supervisorId);
    if (!supervisor || supervisor.role !== 'supervisor') {
      return res.status(404).json({ 
        error: 'Supervisor not found or invalid role' 
      });
    }

    // Verify cranes exist and are managed by current user
    const cranes = await Crane.find({ 
      craneId: { $in: craneIds },
      isActive: true 
    });

    if (cranes.length !== craneIds.length) {
      return res.status(400).json({ 
        error: 'One or more cranes do not exist' 
      });
    }

    // Check if current user manages these cranes
    if (req.user.role === 'manager') {
      const assignedCranes = req.user.assignedCranes || [];
      const invalidCranes = craneIds.filter(craneId => !assignedCranes.includes(craneId));
      
      if (invalidCranes.length > 0) {
        return res.status(403).json({ 
          error: 'Can only assign cranes you manage',
          invalidCranes: invalidCranes
        });
      }
    }

    // Update supervisor's assigned cranes (new RBAC structure)
    await User.findByIdAndUpdate(supervisorId, {
      $addToSet: { assignedCranes: { $each: craneIds } }
    });

    // Update crane assignments
    await Crane.updateMany(
      { craneId: { $in: craneIds } },
      { $set: { supervisorUserId: supervisorId } }
    );

    res.json({
      message: 'Cranes assigned to supervisor successfully',
      supervisorId,
      assignedCranes: craneIds
    });
  } catch (error) {
    console.error('Assign cranes to supervisor error:', error);
    res.status(500).json({ error: 'Failed to assign cranes to supervisor' });
  }
});

/**
 * POST /api/crane-assignments/assign-to-operator
 * Assign cranes to operator (supervisor only)
 */
router.post('/assign-to-operator', authenticateToken, requirePermission('cranes.assign'), async (req, res) => {
  try {
    const { operatorId, craneIds } = req.body;

    // Validate input
    if (!operatorId || !craneIds || !Array.isArray(craneIds)) {
      return res.status(400).json({ 
        error: 'Operator ID and crane IDs array are required' 
      });
    }

    // Verify operator exists and is an operator
    const operator = await User.findById(operatorId);
    if (!operator || operator.role !== 'operator') {
      return res.status(404).json({ 
        error: 'Operator not found or invalid role' 
      });
    }

    // Verify cranes exist and are assigned to current supervisor
    const cranes = await Crane.find({ 
      craneId: { $in: craneIds },
      isActive: true 
    });

    if (cranes.length !== craneIds.length) {
      return res.status(400).json({ 
        error: 'One or more cranes do not exist' 
      });
    }

    // Check if current user has access to these cranes
    if (req.user.role === 'supervisor') {
      const assignedCranes = req.user.assignedCranes || [];
      const invalidCranes = craneIds.filter(craneId => !assignedCranes.includes(craneId));
      
      if (invalidCranes.length > 0) {
        return res.status(403).json({ 
          error: 'Can only assign cranes assigned to you',
          invalidCranes: invalidCranes
        });
      }
    }

    // Update operator's assigned cranes (new RBAC structure)
    await User.findByIdAndUpdate(operatorId, {
      $addToSet: { assignedCranes: { $each: craneIds } }
    });

    // Update crane assignments
    await Crane.updateMany(
      { craneId: { $in: craneIds } },
      { $addToSet: { operators: operatorId } }
    );

    res.json({
      message: 'Cranes assigned to operator successfully',
      operatorId,
      assignedCranes: craneIds
    });
  } catch (error) {
    console.error('Assign cranes to operator error:', error);
    res.status(500).json({ error: 'Failed to assign cranes to operator' });
  }
});

/**
 * DELETE /api/crane-assignments/remove-from-supervisor
 * Remove cranes from supervisor (manager only)
 */
router.delete('/remove-from-supervisor', authenticateToken, requirePermission('cranes.assign'), async (req, res) => {
  try {
    const { supervisorId, craneIds } = req.body;

    // Validate input
    if (!supervisorId || !craneIds || !Array.isArray(craneIds)) {
      return res.status(400).json({ 
        error: 'Supervisor ID and crane IDs array are required' 
      });
    }

    // Update supervisor's assigned cranes
    await User.findByIdAndUpdate(supervisorId, {
      $pull: { assignedCranesByManager: { $in: craneIds } }
    });

    // Update crane assignments
    await Crane.updateMany(
      { craneId: { $in: craneIds } },
      { $unset: { supervisorUserId: 1 } }
    );

    res.json({
      message: 'Cranes removed from supervisor successfully',
      supervisorId,
      removedCranes: craneIds
    });
  } catch (error) {
    console.error('Remove cranes from supervisor error:', error);
    res.status(500).json({ error: 'Failed to remove cranes from supervisor' });
  }
});

/**
 * DELETE /api/crane-assignments/remove-from-operator
 * Remove cranes from operator (supervisor only)
 */
router.delete('/remove-from-operator', authenticateToken, requirePermission('cranes.assign'), async (req, res) => {
  try {
    const { operatorId, craneIds } = req.body;

    // Validate input
    if (!operatorId || !craneIds || !Array.isArray(craneIds)) {
      return res.status(400).json({ 
        error: 'Operator ID and crane IDs array are required' 
      });
    }

    // Update operator's assigned cranes
    await User.findByIdAndUpdate(operatorId, {
      $pull: { assignedCranesBySupervisor: { $in: craneIds } }
    });

    // Update crane assignments
    await Crane.updateMany(
      { craneId: { $in: craneIds } },
      { $pull: { operators: operatorId } }
    );

    res.json({
      message: 'Cranes removed from operator successfully',
      operatorId,
      removedCranes: craneIds
    });
  } catch (error) {
    console.error('Remove cranes from operator error:', error);
    res.status(500).json({ error: 'Failed to remove cranes from operator' });
  }
});

/**
 * GET /api/crane-assignments/available-cranes
 * Get cranes available for assignment based on user role
 */
router.get('/available-cranes', authenticateToken, async (req, res) => {
  try {
    let query = { isActive: true };
    
    // Filter cranes based on user role
    if (req.user.role === 'manager') {
      // Managers can assign cranes they manage
      query.craneId = { $in: req.user.managedCranes || [] };
    } else if (req.user.role === 'supervisor') {
      // Supervisors can assign cranes assigned to them
      query.craneId = { $in: req.user.assignedCranesByManager || [] };
    }
    // Admin can see all cranes

    const cranes = await Crane.find(query)
      .select('craneId name location online lastSeen')
      .sort({ name: 1 });

    res.json({
      cranes: cranes.map(crane => ({
        craneId: crane.craneId,
        name: crane.name,
        location: crane.location,
        online: crane.online,
        lastSeen: crane.lastSeen
      }))
    });
  } catch (error) {
    console.error('Get available cranes error:', error);
    res.status(500).json({ error: 'Failed to fetch available cranes' });
  }
});

/**
 * GET /api/crane-assignments/user-assignments/:userId
 * Get crane assignments for a specific user
 */
router.get('/user-assignments/:userId', authenticateToken, canManageUser, async (req, res) => {
  try {
    const userId = req.params.userId;
    const user = await User.findById(userId).select('role assignedCranesByManager assignedCranesBySupervisor managedCranes');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let assignedCranes = [];
    
    if (user.role === 'supervisor') {
      assignedCranes = await Crane.find({ 
        craneId: { $in: user.assignedCranesByManager || [] },
        isActive: true 
      }).select('craneId name location online lastSeen');
    } else if (user.role === 'operator') {
      assignedCranes = await Crane.find({ 
        craneId: { $in: user.assignedCranesBySupervisor || [] },
        isActive: true 
      }).select('craneId name location online lastSeen');
    } else if (user.role === 'manager') {
      assignedCranes = await Crane.find({ 
        craneId: { $in: user.managedCranes || [] },
        isActive: true 
      }).select('craneId name location online lastSeen');
    }

    res.json({
      userId,
      role: user.role,
      assignedCranes: assignedCranes.map(crane => ({
        craneId: crane.craneId,
        name: crane.name,
        location: crane.location,
        online: crane.online,
        lastSeen: crane.lastSeen
      }))
    });
  } catch (error) {
    console.error('Get user assignments error:', error);
    res.status(500).json({ error: 'Failed to fetch user assignments' });
  }
});

module.exports = router;

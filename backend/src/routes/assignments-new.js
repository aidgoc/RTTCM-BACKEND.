const express = require('express');
const User = require('../models/User');
const Crane = require('../models/Crane');
const { authenticateToken } = require('../middleware/auth');
const { requirePermission, canManageUser } = require('../middleware/rbac');

const router = express.Router();

/**
 * POST /api/assignments/manager-to-supervisor
 * Manager assigns cranes to supervisor
 */
router.post('/manager-to-supervisor', authenticateToken, requirePermission('cranes.assign'), async (req, res) => {
  try {
    const { supervisorId, craneIds } = req.body;
    
    if (!supervisorId || !craneIds || !Array.isArray(craneIds)) {
      return res.status(400).json({ 
        error: 'Supervisor ID and crane IDs array are required' 
      });
    }
    
    const user = req.user;
    
    // Verify supervisor exists and is managed by current user
    const supervisor = await User.findById(supervisorId);
    if (!supervisor || supervisor.role !== 'supervisor') {
      return res.status(404).json({ error: 'Supervisor not found' });
    }
    
    if (supervisor.createdBy.toString() !== user._id.toString()) {
      return res.status(403).json({ error: 'Cannot assign cranes to this supervisor' });
    }
    
    // Verify cranes exist and are managed by current user
    const cranes = await Crane.find({ 
      craneId: { $in: craneIds },
      isActive: true 
    });
    
    if (cranes.length !== craneIds.length) {
      return res.status(400).json({ error: 'One or more cranes do not exist' });
    }
    
    // Check if user manages these cranes
    const userCranes = user.assignedCranes || [];
    const invalidCranes = craneIds.filter(craneId => !userCranes.includes(craneId));
    
    if (invalidCranes.length > 0) {
      return res.status(403).json({ 
        error: 'Can only assign cranes you manage',
        invalidCranes: invalidCranes
      });
    }
    
    // Update supervisor's assigned cranes
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
 * POST /api/assignments/supervisor-to-operator
 * Supervisor assigns cranes to operator
 */
router.post('/supervisor-to-operator', authenticateToken, requirePermission('cranes.assign'), async (req, res) => {
  try {
    const { operatorId, craneIds } = req.body;
    
    if (!operatorId || !craneIds || !Array.isArray(craneIds)) {
      return res.status(400).json({ 
        error: 'Operator ID and crane IDs array are required' 
      });
    }
    
    const user = req.user;
    
    // Verify operator exists and is managed by current user
    const operator = await User.findById(operatorId);
    if (!operator || operator.role !== 'operator') {
      return res.status(404).json({ error: 'Operator not found' });
    }
    
    if (operator.createdBy.toString() !== user._id.toString()) {
      return res.status(403).json({ error: 'Cannot assign cranes to this operator' });
    }
    
    // Verify cranes exist and are assigned to current supervisor
    const cranes = await Crane.find({ 
      craneId: { $in: craneIds },
      isActive: true 
    });
    
    if (cranes.length !== craneIds.length) {
      return res.status(400).json({ error: 'One or more cranes do not exist' });
    }
    
    // Check if supervisor has access to these cranes
    const supervisorCranes = user.assignedCranes || [];
    const invalidCranes = craneIds.filter(craneId => !supervisorCranes.includes(craneId));
    
    if (invalidCranes.length > 0) {
      return res.status(403).json({ 
        error: 'Can only assign cranes assigned to you',
        invalidCranes: invalidCranes
      });
    }
    
    // Update operator's assigned cranes
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
 * GET /api/assignments/available-cranes
 * Get cranes available for assignment based on user role
 */
router.get('/available-cranes', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    let cranes = [];
    
    if (user.role === 'manager') {
      // Managers can see cranes they manage
      cranes = await Crane.find({ 
        craneId: { $in: user.assignedCranes || [] },
        isActive: true 
      }).select('craneId name location online lastSeen');
    } else if (user.role === 'supervisor') {
      // Supervisors can see cranes assigned to them
      cranes = await Crane.find({ 
        craneId: { $in: user.assignedCranes || [] },
        isActive: true 
      }).select('craneId name location online lastSeen');
    }
    
    res.json({ cranes });
  } catch (error) {
    console.error('Get available cranes error:', error);
    res.status(500).json({ error: 'Failed to fetch available cranes' });
  }
});

/**
 * GET /api/assignments/users/:role
 * Get users that can be assigned cranes based on current user role
 */
router.get('/users/:role', authenticateToken, async (req, res) => {
  try {
    const { role } = req.params;
    const user = req.user;
    
    let users = [];
    
    if (user.role === 'manager' && role === 'supervisor') {
      // Manager can see supervisors they created
      users = await User.find({ 
        createdBy: user._id,
        role: 'supervisor',
        isActive: true 
      }).select('_id name email assignedCranes');
    } else if (user.role === 'supervisor' && role === 'operator') {
      // Supervisor can see operators they created
      users = await User.find({ 
        createdBy: user._id,
        role: 'operator',
        isActive: true 
      }).select('_id name email assignedCranes');
    }
    
    res.json({ users });
  } catch (error) {
    console.error('Get users for assignment error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

/**
 * GET /api/assignments/user-assignments/:userId
 * Get crane assignments for a specific user
 */
router.get('/user-assignments/:userId', authenticateToken, canManageUser, async (req, res) => {
  try {
    const userId = req.params.userId;
    const user = await User.findById(userId).select('role assignedCranes');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const assignedCranes = await Crane.find({ 
      craneId: { $in: user.assignedCranes || [] },
      isActive: true 
    }).select('craneId name location online lastSeen');
    
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

/**
 * DELETE /api/assignments/remove-crane
 * Remove crane assignment from user
 */
router.delete('/remove-crane', authenticateToken, async (req, res) => {
  try {
    const { userId, craneId } = req.body;
    
    if (!userId || !craneId) {
      return res.status(400).json({ error: 'User ID and crane ID are required' });
    }
    
    const user = req.user;
    
    // Check if user can manage the target user
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (!user.canManageUser(targetUser)) {
      return res.status(403).json({ error: 'Cannot manage this user' });
    }
    
    // Remove crane from user's assigned cranes
    await User.findByIdAndUpdate(userId, {
      $pull: { assignedCranes: craneId }
    });
    
    // Remove user from crane's operators if they're an operator
    if (targetUser.role === 'operator') {
      await Crane.updateMany(
        { craneId },
        { $pull: { operators: userId } }
      );
    } else if (targetUser.role === 'supervisor') {
      await Crane.updateMany(
        { craneId },
        { $unset: { supervisorUserId: 1 } }
      );
    }
    
    res.json({
      message: 'Crane assignment removed successfully',
      userId,
      craneId
    });
  } catch (error) {
    console.error('Remove crane assignment error:', error);
    res.status(500).json({ error: 'Failed to remove crane assignment' });
  }
});

module.exports = router;

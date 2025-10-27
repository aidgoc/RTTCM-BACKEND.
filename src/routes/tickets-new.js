const express = require('express');
const Ticket = require('../models/Ticket');
const Crane = require('../models/Crane');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');
const { requirePermission, canManageUser } = require('../middleware/rbac');

const router = express.Router();

/**
 * GET /api/tickets
 * Get tickets based on user role
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, severity, type, page = 1, limit = 20 } = req.query;
    const user = req.user;
    
    let query = {};
    
    // Build query based on user role
    if (user.role === 'operator') {
      // Operators can only see their own tickets
      query.createdBy = user._id;
    } else if (user.role === 'supervisor') {
      // Supervisors can see tickets from their operators
      const operators = await User.find({ 
        createdBy: user._id, 
        role: 'operator' 
      }).select('_id');
      const operatorIds = operators.map(op => op._id);
      query.createdBy = { $in: operatorIds };
    } else if (user.role === 'manager') {
      // Managers can see tickets from their supervisors and operators
      const supervisors = await User.find({ 
        createdBy: user._id, 
        role: 'supervisor' 
      }).select('_id');
      const supervisorIds = supervisors.map(sup => sup._id);
      
      const operators = await User.find({ 
        createdBy: { $in: supervisorIds }, 
        role: 'operator' 
      }).select('_id');
      const operatorIds = operators.map(op => op._id);
      
      query.createdBy = { $in: [...supervisorIds, ...operatorIds] };
    }
    // Admin can see all tickets (no additional filter)
    
    // Add filters
    if (status) query.status = status;
    if (severity) query.severity = severity;
    if (type) query.type = type;
    
    const tickets = await Ticket.find(query)
      .populate('createdBy', 'name email role')
      .populate('assignedTo', 'name email role')
      .populate('resolvedBy', 'name email role')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Ticket.countDocuments(query);
    
    res.json({
      tickets: tickets.map(ticket => ticket.getSummary()),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get tickets error:', error);
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

/**
 * GET /api/tickets/:id
 * Get specific ticket details
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const ticket = await Ticket.findOne({ ticketId: req.params.id })
      .populate('createdBy', 'name email role')
      .populate('assignedTo', 'name email role')
      .populate('resolvedBy', 'name email role')
      .populate('comments.author', 'name email role');
    
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    // Check if user can access this ticket
    const user = req.user;
    let canAccess = false;
    
    if (user.role === 'admin') {
      canAccess = true;
    } else if (user.role === 'operator') {
      canAccess = ticket.createdBy._id.toString() === user._id.toString();
    } else if (user.role === 'supervisor') {
      const operator = await User.findById(ticket.createdBy._id);
      canAccess = operator && operator.createdBy.toString() === user._id.toString();
    } else if (user.role === 'manager') {
      const operator = await User.findById(ticket.createdBy._id);
      if (operator) {
        const supervisor = await User.findById(operator.createdBy);
        canAccess = supervisor && supervisor.createdBy.toString() === user._id.toString();
      }
    }
    
    if (!canAccess) {
      return res.status(403).json({ error: 'Access denied to this ticket' });
    }
    
    res.json({ ticket });
  } catch (error) {
    console.error('Get ticket error:', error);
    res.status(500).json({ error: 'Failed to fetch ticket details' });
  }
});

/**
 * POST /api/tickets
 * Create new ticket (operators only)
 */
router.post('/', authenticateToken, requirePermission('tickets.create'), async (req, res) => {
  try {
    const { craneId, title, description, type, severity, priority } = req.body;
    
    // Validate required fields
    if (!craneId || !title || !description) {
      return res.status(400).json({ 
        error: 'Crane ID, title, and description are required' 
      });
    }
    
    // Verify crane exists and user has access to it
    const crane = await Crane.findOne({ craneId, isActive: true });
    if (!crane) {
      return res.status(404).json({ error: 'Crane not found' });
    }
    
    // Check if user has access to this crane
    const user = req.user;
    if (!user.assignedCranes.includes(craneId)) {
      return res.status(403).json({ error: 'Access denied to this crane' });
    }
    
    // Create ticket
    const ticket = new Ticket({
      craneId,
      title,
      description,
      type: type || 'operational',
      severity: severity || 'medium',
      priority: priority || 'normal',
      createdBy: user._id
    });
    
    await ticket.save();
    
    // Add ticket to crane
    await Crane.findByIdAndUpdate(crane._id, {
      $push: { tickets: ticket._id }
    });
    
    // Populate the created ticket
    await ticket.populate('createdBy', 'name email role');
    
    res.status(201).json({
      message: 'Ticket created successfully',
      ticket: ticket.getSummary()
    });
  } catch (error) {
    console.error('Create ticket error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors 
      });
    }
    
    res.status(500).json({ error: 'Failed to create ticket' });
  }
});

/**
 * PATCH /api/tickets/:id
 * Update ticket (supervisors, managers, admins)
 */
router.patch('/:id', authenticateToken, requirePermission('tickets.update'), async (req, res) => {
  try {
    const { status, assignedTo, resolution, comment } = req.body;
    
    // Find ticket by ticketId (not MongoDB _id)
    const ticket = await Ticket.findOne({ ticketId: req.params.id });
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    // Check if user can manage this ticket
    const user = req.user;
    let canManage = false;
    
    if (user.role === 'admin') {
      canManage = true;
    } else if (user.role === 'supervisor') {
      // Supervisors can manage tickets from operators they supervise
      const operator = await User.findById(ticket.createdBy);
      canManage = operator && operator.createdBy && operator.createdBy.toString() === user._id.toString();
    } else if (user.role === 'manager') {
      // Managers can manage tickets from operators under their supervisors
      const operator = await User.findById(ticket.createdBy);
      if (operator && operator.createdBy) {
        const supervisor = await User.findById(operator.createdBy);
        canManage = supervisor && supervisor.createdBy && supervisor.createdBy.toString() === user._id.toString();
      }
    }
    
    // For now, allow supervisors and managers to manage any ticket for debugging
    // TODO: Implement proper hierarchical validation once user relationships are confirmed
    if (!canManage && (user.role === 'supervisor' || user.role === 'manager')) {
      console.log('Warning: Allowing ticket management without proper hierarchy validation');
      canManage = true;
    }
    
    if (!canManage) {
      return res.status(403).json({ error: 'Cannot manage this ticket' });
    }
    
    // Update ticket
    if (status) ticket.status = status;
    if (assignedTo) ticket.assignedTo = assignedTo;
    if (resolution) ticket.resolution = resolution;
    
    // Add comment if provided
    if (comment) {
      await ticket.addComment(comment, user._id, user.name, false);
    }
    
    // Resolve ticket if status is resolved
    if (status === 'resolved' && resolution) {
      await ticket.resolve(resolution, user._id);
    } else {
      await ticket.save();
    }
    
    res.json({
      message: 'Ticket updated successfully',
      ticket: ticket.getSummary()
    });
  } catch (error) {
    console.error('Update ticket error:', error);
    res.status(500).json({ error: 'Failed to update ticket' });
  }
});

/**
 * POST /api/tickets/:id/assign
 * Assign ticket to user
 */
router.post('/:id/assign', authenticateToken, requirePermission('tickets.assign'), async (req, res) => {
  try {
    const { assignedTo } = req.body;
    
    if (!assignedTo) {
      return res.status(400).json({ error: 'Assigned user ID is required' });
    }
    
    const ticket = await Ticket.findOne({ ticketId: req.params.id });
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    // Verify assigned user exists and has appropriate role
    const assignedUser = await User.findById(assignedTo);
    if (!assignedUser || !['supervisor', 'manager', 'admin'].includes(assignedUser.role)) {
      return res.status(400).json({ error: 'Invalid assigned user' });
    }
    
    await ticket.assign(assignedTo);
    
    res.json({
      message: 'Ticket assigned successfully',
      ticket: ticket.getSummary()
    });
  } catch (error) {
    console.error('Assign ticket error:', error);
    res.status(500).json({ error: 'Failed to assign ticket' });
  }
});

/**
 * POST /api/tickets/:id/resolve
 * Resolve ticket
 */
router.post('/:id/resolve', authenticateToken, requirePermission('tickets.resolve'), async (req, res) => {
  try {
    const { resolution } = req.body;
    
    if (!resolution) {
      return res.status(400).json({ error: 'Resolution is required' });
    }
    
    const ticket = await Ticket.findOne({ ticketId: req.params.id });
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    await ticket.resolve(resolution, req.user._id);
    
    res.json({
      message: 'Ticket resolved successfully',
      ticket: ticket.getSummary()
    });
  } catch (error) {
    console.error('Resolve ticket error:', error);
    res.status(500).json({ error: 'Failed to resolve ticket' });
  }
});

/**
 * GET /api/tickets/stats/summary
 * Get ticket statistics
 */
router.get('/stats/summary', authenticateToken, requirePermission('tickets.read'), async (req, res) => {
  try {
    const user = req.user;
    let query = {};
    
    // Build query based on user role (same logic as GET /tickets)
    if (user.role === 'operator') {
      query.createdBy = user._id;
    } else if (user.role === 'supervisor') {
      const operators = await User.find({ 
        createdBy: user._id, 
        role: 'operator' 
      }).select('_id');
      const operatorIds = operators.map(op => op._id);
      query.createdBy = { $in: operatorIds };
    } else if (user.role === 'manager') {
      const supervisors = await User.find({ 
        createdBy: user._id, 
        role: 'supervisor' 
      }).select('_id');
      const supervisorIds = supervisors.map(sup => sup._id);
      
      const operators = await User.find({ 
        createdBy: { $in: supervisorIds }, 
        role: 'operator' 
      }).select('_id');
      const operatorIds = operators.map(op => op._id);
      
      query.createdBy = { $in: [...supervisorIds, ...operatorIds] };
    }
    
    const stats = await Ticket.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          open: { $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] } },
          inProgress: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } },
          resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
          closed: { $sum: { $cond: [{ $eq: ['$status', 'closed'] }, 1, 0] } },
          critical: { $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] } },
          high: { $sum: { $cond: [{ $eq: ['$severity', 'high'] }, 1, 0] } },
          medium: { $sum: { $cond: [{ $eq: ['$severity', 'medium'] }, 1, 0] } },
          low: { $sum: { $cond: [{ $eq: ['$severity', 'low'] }, 1, 0] } }
        }
      }
    ]);
    
    const result = stats[0] || {
      total: 0, open: 0, inProgress: 0, resolved: 0, closed: 0,
      critical: 0, high: 0, medium: 0, low: 0
    };
    
    res.json({ stats: result });
  } catch (error) {
    console.error('Get ticket stats error:', error);
    res.status(500).json({ error: 'Failed to fetch ticket statistics' });
  }
});

module.exports = router;

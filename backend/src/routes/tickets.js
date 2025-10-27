const express = require('express');
const Ticket = require('../models/Ticket');
const Crane = require('../models/Crane');
const { requireCraneAccess, authenticateToken } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/tickets
 * Get all tickets (filtered by user role and assigned cranes)
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      severity, 
      type, 
      craneId,
      from,
      to
    } = req.query;
    
    const skip = (page - 1) * limit;
    const user = req.user;

    // Build query based on user role
    let query = {};

    // Filter by crane access
    if (user.role === 'operator') {
      query.craneId = { $in: Array.isArray(user.assignedCranes) ? user.assignedCranes : [] };
    } else if (user.role === 'manager') {
      query.craneId = { $in: Array.isArray(user.assignedCranes) ? user.assignedCranes : [] };
    } else if (user.role === 'supervisor') {
      query.craneId = { $in: Array.isArray(user.assignedCranes) ? user.assignedCranes : [] };
    }
    // Admin can see all tickets

    // Additional filters
    if (craneId) query.craneId = craneId;
    if (status) query.status = status;
    if (severity) query.severity = severity;
    if (type) query.type = type;

    // Date range filter
    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from);
      if (to) query.createdAt.$lte = new Date(to);
    }

    // Get tickets with pagination
    const tickets = await Ticket.find(query)
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const total = await Ticket.countDocuments(query);

    res.json({
      data: {
        tickets: tickets.map(ticket => ticket.getSummary())
      },
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
    const ticket = await Ticket.findById(req.params.id)
      .populate('assignedTo', 'name email');

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Check access permissions
    const user = req.user;
    if (user.role === 'operator' && !user.assignedCranes.includes(ticket.craneId)) {
      return res.status(403).json({ error: 'Access denied to this ticket' });
    }
    if (user.role === 'manager' && !user.assignedCranes.includes(ticket.craneId)) {
      return res.status(403).json({ error: 'Access denied to this ticket' });
    }

    res.json(ticket.getSummary());
  } catch (error) {
    console.error('Get ticket error:', error);
    res.status(500).json({ error: 'Failed to fetch ticket details' });
  }
});

/**
 * POST /api/tickets
 * Create new ticket
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { craneId, type, severity, message, metadata = {} } = req.body;

    // Validate required fields
    if (!craneId || !type || !severity || !message) {
      return res.status(400).json({ 
        error: 'Crane ID, type, severity, and message are required' 
      });
    }

    // Check crane access
    const user = req.user;
    if (user.role === 'operator' && !user.assignedCranes.includes(craneId)) {
      return res.status(403).json({ error: 'Access denied to this crane' });
    }
    if (user.role === 'manager' && !user.assignedCranes.includes(craneId)) {
      return res.status(403).json({ error: 'Access denied to this crane' });
    }

    // Verify crane exists
    const crane = await Crane.findOne({ craneId, isActive: true });
    if (!crane) {
      return res.status(404).json({ error: 'Crane not found' });
    }

    // Create ticket
    const ticket = new Ticket({
      craneId,
      type,
      severity,
      message,
      createdBy: user.email,
      metadata
    });

    await ticket.save();

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
 * Update ticket (assign, close, etc.)
 */
router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const { status, assignedTo, resolution } = req.body;
    const user = req.user;

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Check access permissions
    if (user.role === 'operator' && !user.assignedCranes.includes(ticket.craneId)) {
      return res.status(403).json({ error: 'Access denied to this ticket' });
    }
    if (user.role === 'manager' && !user.assignedCranes.includes(ticket.craneId)) {
      return res.status(403).json({ error: 'Access denied to this ticket' });
    }

    // Update ticket
    if (status) {
      if (status === 'closed') {
        await ticket.close(user.email, resolution || '');
      } else if (status === 'in_progress' && assignedTo) {
        await ticket.assign(assignedTo);
      } else {
        ticket.status = status;
        await ticket.save();
      }
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
 * GET /api/tickets/stats/summary
 * Get ticket statistics summary
 */
router.get('/stats/summary', authenticateToken, async (req, res) => {
  try {
    const { craneId, from, to } = req.query;
    const user = req.user;

    // Build filter based on user role
    let filterCraneId = craneId;
    if (!filterCraneId) {
      if (user.role === 'operator') {
        filterCraneId = Array.isArray(user.assignedCranes) ? user.assignedCranes : [];
      } else if (user.role === 'manager') {
        filterCraneId = Array.isArray(user.assignedCranes) ? user.assignedCranes : [];
      } else if (user.role === 'supervisor') {
        filterCraneId = Array.isArray(user.assignedCranes) ? user.assignedCranes : [];
      }
    } else {
      // If specific craneId is provided, check if user has access to it
      if (user.role === 'operator' && !user.assignedCranes.includes(craneId)) {
        return res.status(403).json({ error: 'Access denied to this crane' });
      }
      if (user.role === 'manager' && !user.assignedCranes.includes(craneId)) {
        return res.status(403).json({ error: 'Access denied to this crane' });
      }
      if (user.role === 'supervisor' && !user.assignedCranes.includes(craneId)) {
        return res.status(403).json({ error: 'Access denied to this crane' });
      }
      // Convert single craneId to array for the getStats method
      filterCraneId = [craneId];
    }

    const stats = await Ticket.getStats(filterCraneId, from, to);
    
    // Get recent tickets, filtered by craneId if provided
    let recentTickets;
    if (craneId) {
      recentTickets = await Ticket.find({ craneId })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('createdBy', 'name email')
        .populate('assignedTo', 'name email');
    } else {
      recentTickets = await Ticket.findRecent(24, 10);
    }

    res.json({
      summary: stats[0] || {
        total: 0,
        open: 0,
        inProgress: 0,
        closed: 0,
        critical: 0,
        warning: 0,
        info: 0,
        overload: 0,
        limitSwitch: 0,
        offline: 0
      },
      recentTickets: recentTickets.map(ticket => ticket.getSummary())
    });
  } catch (error) {
    console.error('Get ticket stats error:', error);
    res.status(500).json({ error: 'Failed to fetch ticket statistics' });
  }
});

module.exports = router;

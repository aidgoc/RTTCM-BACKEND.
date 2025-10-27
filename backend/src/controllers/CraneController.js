const CraneService = require('../services/CraneService');
const { asyncHandler } = require('../middleware/errorHandler');

class CraneController {
  // Get all cranes with optimized aggregation
  static getCranes = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, status, search } = req.query;
    const skip = (page - 1) * limit;

    const result = await CraneService.getCranesWithStatus({
      user: req.user,
      accessibleCranes: req.accessibleCranes,
      filters: { status, search },
      pagination: { page: parseInt(page), limit: parseInt(limit), skip }
    });

    res.json(result);
  });

  // Get specific crane details
  static getCraneById = asyncHandler(async (req, res) => {
    const craneId = req.params.id;
    const crane = await CraneService.getCraneDetails(craneId);
    
    if (!crane) {
      return res.status(404).json({ error: 'Crane not found' });
    }

    res.json(crane);
  });

  // Create new crane
  static createCrane = asyncHandler(async (req, res) => {
    const craneData = {
      ...req.body,
      managerUserId: req.body.managerUserId || req.user._id
    };

    const crane = await CraneService.createCrane(craneData, req.user);
    
    res.status(201).json({
      message: 'Crane created successfully',
      crane
    });
  });

  // Update crane
  static updateCrane = asyncHandler(async (req, res) => {
    const craneId = req.params.id;
    const updates = req.body;

    const crane = await CraneService.updateCrane(craneId, updates);
    
    if (!crane) {
      return res.status(404).json({ error: 'Crane not found' });
    }

    res.json({
      message: 'Crane updated successfully',
      crane
    });
  });

  // Delete crane
  static deleteCrane = asyncHandler(async (req, res) => {
    const craneId = req.params.id;
    
    await CraneService.deleteCrane(craneId);
    
    res.json({ message: 'Crane deleted successfully' });
  });

  // Get crane telemetry
  static getCraneTelemetry = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { from, to, limit = 1000 } = req.query;

    const telemetry = await CraneService.getCraneTelemetry(id, { from, to, limit });
    
    res.json({
      craneId: id,
      telemetry,
      count: telemetry.length
    });
  });

  // Get telemetry statistics
  static getTelemetryStats = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { from, to } = req.query;

    const stats = await CraneService.getTelemetryStats(id, { from, to });
    
    res.json({
      craneId: id,
      ...stats
    });
  });

  // Sync telemetry data
  static syncTelemetry = asyncHandler(async (req, res) => {
    const result = await CraneService.syncAllCranes();
    
    res.json(result);
  });

  // Get crane tickets
  static getCraneTickets = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status, limit = 50 } = req.query;

    const tickets = await CraneService.getCraneTickets(id, { status, limit });
    
    res.json({
      craneId: id,
      tickets
    });
  });
}

module.exports = CraneController;


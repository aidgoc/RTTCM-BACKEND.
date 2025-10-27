const express = require('express');
const CraneController = require('../controllers/CraneController');
const { authenticateToken } = require('../middleware/auth');
const { 
  requirePermission, 
  canAccessCrane, 
  filterDataByRole 
} = require('../middleware/rbac');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// GET /api/cranes - Get all cranes (filtered by user role)
router.get('/', filterDataByRole, CraneController.getCranes);

// GET /api/cranes/:id - Get specific crane details
router.get('/:id', canAccessCrane('id'), CraneController.getCraneById);

// POST /api/cranes - Create new crane (manager only)
router.post('/', requirePermission('cranes.create'), CraneController.createCrane);

// PATCH /api/cranes/:id - Update crane (manager/supervisor only)
router.patch('/:id', canAccessCrane('id'), requirePermission('cranes.update'), CraneController.updateCrane);

// DELETE /api/cranes/:id - Delete crane (manager only)
router.delete('/:id', requirePermission('cranes.delete'), CraneController.deleteCrane);

// GET /api/cranes/:id/telemetry - Get telemetry data for a crane
router.get('/:id/telemetry', canAccessCrane('id'), CraneController.getCraneTelemetry);

// GET /api/cranes/:id/telemetry/stats - Get telemetry statistics for a crane
router.get('/:id/telemetry/stats', canAccessCrane('id'), CraneController.getTelemetryStats);

// POST /api/cranes/sync-telemetry - Sync latest telemetry data to all cranes (manager only)
router.post('/sync-telemetry', requirePermission('cranes.update'), CraneController.syncTelemetry);

// GET /api/cranes/:id/tickets - Get tickets for a crane
router.get('/:id/tickets', canAccessCrane('id'), CraneController.getCraneTickets);

module.exports = router;


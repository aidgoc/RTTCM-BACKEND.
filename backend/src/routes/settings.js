const express = require('express');
const Settings = require('../models/Settings');
const User = require('../models/User');
const Telemetry = require('../models/Telemetry');
const DatabaseBackup = require('../scripts/backup');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/settings
 * Get current settings
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    res.json({ settings });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

/**
 * PUT /api/settings
 * Update settings (admin only)
 */
router.put('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    const updatedSettings = await settings.updateSettings(req.body, req.user._id);
    
    res.json({ 
      message: 'Settings updated successfully',
      settings: updatedSettings 
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

/**
 * GET /api/settings/system-status
 * Get real-time system status
 */
router.get('/system-status', authenticateToken, async (req, res) => {
  try {
    // Get user counts
    const userCounts = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);
    
    const counts = {
      admin: 0,
      manager: 0,
      operator: 0
    };
    
    userCounts.forEach(item => {
      counts[item._id] = item.count;
    });

    // Get database status
    const dbStatus = {
      connected: true,
      collections: 5, // Cranes, Users, Telemetry, Tickets, LimitTests
      lastCheck: new Date()
    };

    // Get MQTT status (simplified - in real app, check actual MQTT connection)
    const mqttStatus = {
      connected: true,
      broker: process.env.MQTT_BROKER_URL || 'test.mosquitto.org:1883',
      lastMessage: new Date()
    };

    // Get server status
    const serverStatus = {
      backend: {
        port: process.env.PORT || 3001,
        status: 'running',
        uptime: process.uptime()
      },
      frontend: {
        port: 3000,
        status: 'running'
      }
    };

    res.json({
      userCounts: counts,
      database: dbStatus,
      mqtt: mqttStatus,
      server: serverStatus,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Get system status error:', error);
    res.status(500).json({ error: 'Failed to fetch system status' });
  }
});

/**
 * GET /api/settings/users
 * Get user management data
 */
router.get('/users', authenticateToken, async (req, res) => {
  try {
    const users = await User.find({}, 'name email role createdAt lastLogin')
      .sort({ createdAt: -1 });
    
    const userCounts = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);
    
    const counts = {
      admin: 0,
      manager: 0,
      operator: 0
    };
    
    userCounts.forEach(item => {
      counts[item._id] = item.count;
    });

    res.json({
      users: users.map(user => ({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      })),
      counts
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

/**
 * GET /api/settings/data-retention
 * Get telemetry data retention statistics (admin only)
 */
router.get('/data-retention', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const retentionStats = await Telemetry.getRetentionStats();
    const stats = retentionStats[0] || {
      totalRecords: 0,
      recordsWithinRetention: 0,
      recordsToBeDeleted: 0,
      oldestRecord: null,
      newestRecord: null,
      retentionDays: parseInt(process.env.TELEMETRY_RETENTION_DAYS) || 30,
      dataSizeMB: 0
    };

    res.json({
      retention: stats,
      message: `Telemetry data is automatically deleted after ${stats.retentionDays} days`
    });
  } catch (error) {
    console.error('Get data retention stats error:', error);
    res.status(500).json({ error: 'Failed to fetch data retention statistics' });
  }
});

/**
 * POST /api/settings/backup/create
 * Create database backup (admin only)
 */
router.post('/backup/create', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const backup = new DatabaseBackup();
    const result = await backup.createBackup();
    
    res.json(result);
  } catch (error) {
    console.error('Create backup error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to create backup' 
    });
  }
});

/**
 * GET /api/settings/backup/list
 * List available backups (admin only)
 */
router.get('/backup/list', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const backup = new DatabaseBackup();
    const result = await backup.listBackups();
    
    res.json(result);
  } catch (error) {
    console.error('List backups error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to list backups' 
    });
  }
});

/**
 * POST /api/settings/backup/clean
 * Clean old backups (admin only)
 */
router.post('/backup/clean', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const backup = new DatabaseBackup();
    const result = await backup.cleanOldBackups();
    
    res.json(result);
  } catch (error) {
    console.error('Clean backups error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to clean backups' 
    });
  }
});

/**
 * POST /api/settings/backup/restore
 * Restore from backup (admin only)
 */
router.post('/backup/restore', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { backupPath } = req.body;
    
    if (!backupPath) {
      return res.status(400).json({
        success: false,
        error: 'Backup path is required'
      });
    }

    const backup = new DatabaseBackup();
    const result = await backup.restoreBackup(backupPath);
    
    res.json(result);
  } catch (error) {
    console.error('Restore backup error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to restore backup' 
    });
  }
});

module.exports = router;

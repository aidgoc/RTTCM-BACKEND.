const express = require('express');
const Crane = require('../models/Crane');
const User = require('../models/User');
const Telemetry = require('../models/Telemetry');
const Ticket = require('../models/Ticket');
const { authenticateToken } = require('../middleware/auth');
const craneDiscovery = require('../middleware/craneDiscovery');
const { 
  requirePermission, 
  canAccessCrane, 
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

/**
 * GET /api/cranes
 * Get all cranes (filtered by user role)
 */
router.get('/', authenticateToken, filterDataByRole, smartCache, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    const skip = (page - 1) * limit;

    // Build query based on user role
    let query = { isActive: true };
    
    // Filter cranes based on user role
    if (req.user.role === 'operator') {
      query.craneId = { $in: req.accessibleCranes };
    } else if (req.user.role === 'supervisor') {
      query.craneId = { $in: req.accessibleCranes };
    } else if (req.user.role === 'manager') {
      query.craneId = { $in: req.accessibleCranes };
    }
    // Admin can see all cranes (no filter)

    // Filter by status
    if (status) {
      if (status === 'online') {
        query.online = true;
      } else if (status === 'offline') {
        query.online = false;
      }
      // Note: 'overloaded' status will be handled in the aggregation pipeline
    }

    // Search by name or craneId
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { craneId: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } }
      ];
    }

    // Get total count
    const total = await Crane.countDocuments(query);

    // Use aggregation pipeline to get cranes with all related data in a single query
    const cranesWithStatus = await Crane.aggregate([
      // Match cranes based on query
      { $match: query },
      
      // Lookup latest telemetry for each crane
      {
        $lookup: {
          from: 'telemetries',
          let: { craneId: '$craneId' },
          pipeline: [
            { $match: { $expr: { $eq: ['$craneId', '$$craneId'] } } },
            { $sort: { ts: -1 } },
            { $limit: 1 }
          ],
          as: 'latestTelemetry'
        }
      },
      
      // Lookup ticket counts for each crane
      {
        $lookup: {
          from: 'tickets',
          let: { craneId: '$craneId' },
          pipeline: [
            { $match: { $expr: { $eq: ['$craneId', '$$craneId'] } } },
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 }
              }
            }
          ],
          as: 'ticketCounts'
        }
      },
      
      // Lookup supervisors assigned to each crane
      {
        $lookup: {
          from: 'users',
          let: { craneId: '$craneId' },
          pipeline: [
            { 
              $match: { 
                $expr: { 
                  $and: [
                    { $eq: ['$role', 'supervisor'] },
                    { $in: ['$$craneId', '$assignedCranes'] }
                  ]
                }
              }
            },
            { $project: { name: 1, email: 1 } }
          ],
          as: 'supervisors'
        }
      },
      
      // Lookup operators assigned to each crane
      {
        $lookup: {
          from: 'users',
          let: { craneId: '$craneId' },
          pipeline: [
            { 
              $match: { 
                $expr: { 
                  $and: [
                    { $eq: ['$role', 'operator'] },
                    { $in: ['$$craneId', '$assignedCranes'] }
                  ]
                }
              }
            },
            { $project: { name: 1, email: 1 } }
          ],
          as: 'operators'
        }
      },
      
      // Lookup manager details
      {
        $lookup: {
          from: 'users',
          localField: 'managerUserId',
          foreignField: '_id',
          as: 'manager',
          pipeline: [
            { $project: { name: 1, email: 1 } }
          ]
        }
      },
      
      // Add computed fields
      {
        $addFields: {
          // Process ticket counts
          tickets: {
            $let: {
              vars: {
                ticketCounts: '$ticketCounts'
              },
              in: {
                open: {
                  $sum: {
                    $map: {
                      input: '$$ticketCounts',
                      as: 'ticket',
                      in: {
                        $cond: [
                          { $in: ['$$ticket._id', ['open', 'in_progress']] },
                          '$$ticket.count',
                          0
                        ]
                      }
                    }
                  }
                },
                total: {
                  $sum: '$$ticketCounts.count'
                }
              }
            }
          },
          
          // Process latest telemetry
          latestTelemetryData: {
            $cond: [
              { $gt: [{ $size: '$latestTelemetry' }, 0] },
              { $arrayElemAt: ['$latestTelemetry', 0] },
              null
            ]
          },
          
          // Manager name
          managerName: {
            $cond: [
              { $gt: [{ $size: '$manager' }, 0] },
              { $arrayElemAt: ['$manager.name', 0] },
              'Unassigned'
            ]
          },
          
          // Operator names
          operatorNames: {
            $cond: [
              { $gt: [{ $size: '$operators' }, 0] },
              { $reduce: {
                input: '$operators',
                initialValue: '',
                in: {
                  $cond: [
                    { $eq: ['$$value', ''] },
                    '$$this.name',
                    { $concat: ['$$value', ', ', '$$this.name'] }
                  ]
                }
              }},
              'Unassigned'
            ]
          },
          
          // Supervisor names
          supervisorNames: {
            $cond: [
              { $gt: [{ $size: '$supervisors' }, 0] },
              { $reduce: {
                input: '$supervisors',
                initialValue: '',
                in: {
                  $cond: [
                    { $eq: ['$$value', ''] },
                    '$$this.name',
                    { $concat: ['$$value', ', ', '$$this.name'] }
                  ]
                }
              }},
              'Unassigned'
            ]
          }
        }
      },
      
      // Filter by overload status if requested
      ...(status === 'overloaded' ? [{
        $match: {
          $expr: {
            $and: [
              { $ne: ['$lastStatusRaw.load', null] },
              { $gt: ['$lastStatusRaw.load', '$swl'] }
            ]
          }
        }
      }] : []),
      
      // Sort by lastSeen
      { $sort: { createdAt: -1, lastSeen: -1 } },
      
      // Pagination
      { $skip: skip },
      { $limit: parseInt(limit) },
      
      // Project final fields
      {
        $project: {
          _id: 1,
          craneId: 1,
          name: 1,
          location: 1,
          swl: 1,
          managerUserId: 1,
          supervisorUserId: 1,
          operators: 1,
          tickets: 1,
          lastSeen: 1,
          online: 1,
          lastStatusRaw: 1,
          isActive: 1,
          specifications: 1,
          locationData: 1,
          createdAt: 1,
          updatedAt: 1,
          latestTelemetryData: 1,
          managerName: 1,
          operatorNames: 1,
          supervisorNames: 1,
          // Computed fields for status
          utilization: {
            $cond: [
              { $and: ['$latestTelemetryData', { $ne: ['$latestTelemetryData.util', null] }] },
              { $min: [100, { $max: [0, '$latestTelemetryData.util'] }] },
              0
            ]
          },
          currentLoad: {
            $cond: [
              { $and: ['$latestTelemetryData', { $ne: ['$latestTelemetryData.load', null] }] },
              '$latestTelemetryData.load',
              0
            ]
          },
          isOverloaded: {
            $cond: [
              { $and: ['$latestTelemetryData', { $ne: ['$latestTelemetryData.load', null] }] },
              { $gt: ['$latestTelemetryData.load', '$swl'] },
              false
            ]
          },
          limitSwitchStatus: {
            $cond: [
              { $ne: ['$latestTelemetryData', null] },
              {
                ls1: { $ifNull: ['$latestTelemetryData.ls1', 'UNKNOWN'] },
                ls2: { $ifNull: ['$latestTelemetryData.ls2', 'UNKNOWN'] },
                ls3: { $ifNull: ['$latestTelemetryData.ls3', 'UNKNOWN'] },
                ls4: { $ifNull: ['$latestTelemetryData.ls4', 'UNKNOWN'] }
              },
              {
                ls1: 'UNKNOWN',
                ls2: 'UNKNOWN',
                ls3: 'UNKNOWN',
                ls4: 'UNKNOWN'
              }
            ]
          }
        }
      }
    ]);

    // Process the aggregated results to add status summary
    const processedCranes = cranesWithStatus.map(crane => {
      // Update crane status if we have newer telemetry data
      if (crane.latestTelemetryData && (!crane.lastSeen || crane.latestTelemetryData.ts > crane.lastSeen)) {
        // Note: We'll update the crane in the background to avoid blocking the response
        setImmediate(async () => {
          try {
            const craneDoc = await Crane.findById(crane._id);
            if (craneDoc) {
              const telemetryData = {
                load: crane.latestTelemetryData.load,
                swl: crane.latestTelemetryData.swl,
                util: crane.latestTelemetryData.util,
                ls1: crane.latestTelemetryData.ls1,
                ls2: crane.latestTelemetryData.ls2,
                ls3: crane.latestTelemetryData.ls3,
                ls4: crane.latestTelemetryData.ls4,
                ut: crane.latestTelemetryData.ut,
                raw: crane.latestTelemetryData.raw
              };
              await craneDoc.updateStatus(telemetryData);
            }
          } catch (error) {
            console.error('Error updating crane status in background:', error);
          }
        });
      }

      // Create status summary
      const statusSummary = {
        craneId: crane.craneId,
        name: crane.name,
        online: crane.online,
        lastSeen: crane.lastSeen,
        currentLoad: crane.currentLoad,
        swl: crane.swl,
        utilization: crane.utilization,
        isOverloaded: crane.isOverloaded,
        limitSwitchStatus: crane.limitSwitchStatus,
        hasLimitSwitchFailures: Object.values(crane.limitSwitchStatus).some(s => s === 'FAIL'),
        status: crane.online ? 
          (crane.isOverloaded ? 'overload' : 
           Object.values(crane.limitSwitchStatus).some(s => s === 'FAIL') ? 'warning' : 'normal') : 'offline'
      };

      return {
        ...crane,
        statusSummary,
        // Remove the raw telemetry data from response
        latestTelemetryData: undefined
      };
    });

    res.json({
      cranes: processedCranes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get cranes error:', error);
    res.status(500).json({ error: 'Failed to fetch cranes' });
  }
});

/**
 * GET /api/cranes/:id
 * Get specific crane details
 */
router.get('/:id', authenticateToken, canAccessCrane('id'), smartCache, async (req, res) => {
  try {
    const crane = await Crane.findOne({ craneId: req.params.id, isActive: true })
      .populate('managerUserId', 'name email')
      .populate('operators', 'name email');

    if (!crane) {
      return res.status(404).json({ error: 'Crane not found' });
    }

    // Get recent tickets
    const recentTickets = await Ticket.findByCrane(crane.craneId)
      .limit(5)
      .sort({ createdAt: -1 });

    // Get latest telemetry
    const latestTelemetry = await Telemetry.getLatestTelemetry(crane.craneId);

    res.json({
      ...crane.toObject(),
      statusSummary: crane.getStatusSummary(),
      utilization: crane.utilization,
      currentLoad: crane.currentLoad,
      isOverloaded: crane.isOverloaded,
      limitSwitchStatus: crane.limitSwitchStatus,
      recentTickets: recentTickets.map(ticket => ticket.getSummary()),
      latestTelemetry: latestTelemetry ? latestTelemetry.getStatusSummary() : null
    });
  } catch (error) {
    console.error('Get crane error:', error);
    res.status(500).json({ error: 'Failed to fetch crane details' });
  }
});

/**
 * POST /api/cranes
 * Create new crane (manager only)
 */
router.post('/', authenticateToken, requirePermission('cranes.create'), smartInvalidation, async (req, res) => {
  try {
    const { 
      craneId, 
      name, 
      location, 
      swl, 
      managerUserId, 
      operators = [], 
      assignedSupervisors = [],
      // Location fields
      siteAddress,
      city,
      // GSM location fields
      accuracy,
      method
    } = req.body;
    const currentUser = req.user;

    // Validate required fields
    if (!craneId || !name || !location || !swl) {
      return res.status(400).json({ 
        error: 'Crane ID, name, location, and SWL are required' 
      });
    }

    // Check if current user has permission to create cranes
    if (currentUser.role !== 'manager' && currentUser.role !== 'admin') {
      return res.status(403).json({ 
        error: 'Only managers and admins can create cranes' 
      });
    }

    // For managers, use their own ID as managerUserId
    const finalManagerUserId = managerUserId || currentUser._id;
    
    console.log('Current user:', {
      id: currentUser._id,
      role: currentUser.role,
      name: currentUser.name
    });
    console.log('Final manager user ID:', finalManagerUserId);

    // Verify the manager user exists and has the correct role
    const managerUser = await User.findById(finalManagerUserId);
    if (!managerUser) {
      return res.status(400).json({ 
        error: 'Manager user not found' 
      });
    }
    
    if (managerUser.role !== 'manager' && managerUser.role !== 'admin') {
      return res.status(400).json({ 
        error: 'Manager user must have manager or admin role' 
      });
    }

    // Check if crane already exists
    const existingCrane = await Crane.findOne({ craneId });
    if (existingCrane) {
      return res.status(409).json({ 
        error: 'Crane with this ID already exists' 
      });
    }

    // Prepare location data
    let locationData = {};
    
    // City coordinates fallback for major Indian cities
    const cityCoordinates = {
      'HUBBALI-DHARWAD': [15.3647, 75.1240],
      'GADAG': [15.4319, 75.6319],
      'BENGALURU': [12.9716, 77.5946],
      'MUMBAI': [19.0760, 72.8777],
      'DELHI': [28.7041, 77.1025],
      'CHENNAI': [13.0827, 80.2707],
      'KOLKATA': [22.5726, 88.3639],
      'HYDERABAD': [17.3850, 78.4867],
      'PUNE': [18.5204, 73.8567],
      'AHMEDABAD': [23.0225, 72.5714],
      'JAIPUR': [26.9124, 75.7873]
    };
    
    // For manual crane creation, use city coordinates as fallback
    // GPS coordinates will be provided by GSM module via MQTT
    const cityCoords = cityCoordinates[city?.toUpperCase()];
    if (cityCoords) {
      locationData = {
        coordinates: [cityCoords[1], cityCoords[0]], // [lng, lat]
        locationSource: 'city_default',
        city: city || 'Unknown',
        siteAddress: siteAddress || location,
        locationAccuracy: 5000, // 5km accuracy for city center
        locationMethod: 'estimated'
      };
    } else {
      // Default to Hubballi if city not found
      locationData = {
        coordinates: [75.1240, 15.3647], // [lng, lat] for Hubballi
        locationSource: 'city_default',
        city: city || 'HUBBALI-DHARWAD',
        siteAddress: siteAddress || location,
        locationAccuracy: 5000,
        locationMethod: 'estimated'
      };
    }

    // Create new crane
    const crane = new Crane({
      craneId,
      name,
      location,
      swl,
      managerUserId: finalManagerUserId,
      operators,
      locationData
    });

    console.log('Creating crane with data:', {
      craneId,
      name,
      location,
      swl,
      managerUserId: finalManagerUserId,
      operators,
      locationData
    });

    await crane.save();

    // Handle supervisor assignments if provided
    if (assignedSupervisors && assignedSupervisors.length > 0) {
      // Update supervisors' assignedCranes field (new RBAC structure)
      await User.updateMany(
        { _id: { $in: assignedSupervisors } },
        { $addToSet: { assignedCranes: craneId } }
      );
    }

    // Update manager's assignedCranes field (new RBAC structure)
    await User.findByIdAndUpdate(
      finalManagerUserId,
      { $addToSet: { assignedCranes: craneId } }
    );

    // Populate references
    await crane.populate('managerUserId', 'name email');
    await crane.populate('operators', 'name email');

    // Emit WebSocket event for new crane creation
    const io = req.app.get('io');
    if (io) {
      const craneData = {
        ...crane.toObject(),
        statusSummary: crane.getStatusSummary()
      };
      
      io.emit('crane:created', {
        crane: craneData,
        message: `New crane ${craneId} created by ${currentUser.name}`,
        timestamp: new Date().toISOString()
      });
      
      console.log(`📡 WebSocket event emitted: crane:created for ${craneId}`);
    }

    res.status(201).json({
      message: 'Crane created successfully',
      crane: {
        ...crane.toObject(),
        statusSummary: crane.getStatusSummary()
      }
    });
  } catch (error) {
    console.error('Create crane error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message,
        value: err.value
      }));
      console.log('Validation errors:', errors);
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors 
      });
    }
    
    res.status(500).json({ error: 'Failed to create crane' });
  }
});

/**
 * PATCH /api/cranes/:id
 * Update crane (manager/supervisor only)
 */
router.patch('/:id', authenticateToken, canAccessCrane('id'), requirePermission('cranes.update'), smartInvalidation, async (req, res) => {
  try {
    const craneId = req.params.id;
    const updates = req.body;

    // Handle location updates if coordinates provided
    if (updates.latitude && updates.longitude) {
      const lat = parseFloat(updates.latitude);
      const lng = parseFloat(updates.longitude);

      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        updates.locationData = {
          coordinates: [lng, lat], // [longitude, latitude]
          siteAddress: updates.siteAddress || updates.location,
          locationSource: 'manual_entry',
          city: updates.city || 'Unknown'
        };
      }
    }

    // Remove fields that shouldn't be updated directly
    delete updates._id;
    delete updates.createdAt;
    delete updates.updatedAt;
    delete updates.lastSeen;
    delete updates.online;
    delete updates.lastStatusRaw;
    delete updates.latitude;
    delete updates.longitude;
    delete updates.siteAddress;
    delete updates.city;

    const crane = await Crane.findOneAndUpdate(
      { craneId, isActive: true },
      updates,
      { new: true, runValidators: true }
    ).populate('managerUserId', 'name email')
     .populate('operators', 'name email');

    if (!crane) {
      return res.status(404).json({ error: 'Crane not found' });
    }

    // Emit WebSocket event for crane update
    const io = req.app.get('io');
    if (io) {
      const craneData = {
        ...crane.toObject(),
        statusSummary: crane.getStatusSummary()
      };
      
      io.emit('crane:updated', {
        crane: craneData,
        message: `Crane ${craneId} updated by ${req.user.name}`,
        timestamp: new Date().toISOString()
      });
      
      console.log(`📡 WebSocket event emitted: crane:updated for ${craneId}`);
    }

    res.json({
      message: 'Crane updated successfully',
      crane: {
        ...crane.toObject(),
        statusSummary: crane.getStatusSummary()
      }
    });
  } catch (error) {
    console.error('Update crane error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors 
      });
    }
    
    res.status(500).json({ error: 'Failed to update crane' });
  }
});

/**
 * PATCH /api/cranes/:id/location
 * Update crane location coordinates (manager only)
 */
router.patch('/:id/location', authenticateToken, canAccessCrane('id'), requirePermission('cranes.update'), smartInvalidation, async (req, res) => {
  try {
    const craneId = req.params.id;
    const { latitude, longitude, siteAddress, accuracy, method } = req.body;

    // Validate coordinates
    if (!latitude || !longitude) {
      return res.status(400).json({ 
        error: 'Latitude and longitude are required' 
      });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ 
        error: 'Invalid coordinates format' 
      });
    }

    if (lat < -90 || lat > 90) {
      return res.status(400).json({ 
        error: 'Latitude must be between -90 and 90' 
      });
    }

    if (lng < -180 || lng > 180) {
      return res.status(400).json({ 
        error: 'Longitude must be between -180 and 180' 
      });
    }

    const crane = await Crane.findOne({ craneId, isActive: true });
    if (!crane) {
      return res.status(404).json({ error: 'Crane not found' });
    }

    // Update location data
    await crane.updateLocation({
      coordinates: [lng, lat], // [longitude, latitude]
      siteAddress: siteAddress,
      locationSource: 'manual_entry',
      accuracy: accuracy ? parseFloat(accuracy) : null,
      method: method || 'manual'
    });

    // Emit WebSocket event for real-time update
    const io = req.app.get('io');
    if (io) {
      io.emit('crane:location_updated', {
        craneId,
        coordinates: [lng, lat],
        siteAddress,
        accuracy: accuracy ? parseFloat(accuracy) : null,
        method: method || 'manual',
        timestamp: new Date()
      });
    }

    res.json({
      message: 'Crane location updated successfully',
      crane: {
        craneId: crane.craneId,
        name: crane.name,
        locationData: crane.locationData
      }
    });
  } catch (error) {
    console.error('Update crane location error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors 
      });
    }
    
    res.status(500).json({ error: 'Failed to update crane location' });
  }
});

/**
 * DELETE /api/cranes/:id
 * Delete crane (manager only)
 */
router.delete('/:id', authenticateToken, requirePermission('cranes.delete'), smartInvalidation, async (req, res) => {
  try {
    const craneId = req.params.id;

    // Soft delete by setting isActive to false
    const crane = await Crane.findOneAndUpdate(
      { craneId, isActive: true },
      { isActive: false },
      { new: true }
    );

    if (!crane) {
      return res.status(404).json({ error: 'Crane not found' });
    }

    // Clean up orphaned references from users
    const User = require('../models/User');
    
    // Remove from assignedCranes
    await User.updateMany(
      { assignedCranes: craneId },
      { $pull: { assignedCranes: craneId } }
    );

    // Remove from managedCranes
    await User.updateMany(
      { managedCranes: craneId },
      { $pull: { managedCranes: craneId } }
    );

    console.log(`Cleaned up orphaned references for deleted crane: ${craneId}`);

    res.json({ message: 'Crane deleted successfully' });
  } catch (error) {
    console.error('Delete crane error:', error);
    res.status(500).json({ error: 'Failed to delete crane' });
  }
});

/**
 * GET /api/cranes/:id/telemetry
 * Get telemetry data for a crane
 */
router.get('/:id/telemetry', authenticateToken, canAccessCrane('id'), smartCache, async (req, res) => {
  try {
    const { from, to, limit = 1000 } = req.query;
    const craneId = req.params.id;

    // Verify crane exists
    const crane = await Crane.findOne({ craneId, isActive: true });
    if (!crane) {
      return res.status(404).json({ error: 'Crane not found' });
    }

    // Get telemetry data
    const telemetry = await Telemetry.getCraneTelemetry(craneId, from, to, parseInt(limit));

    res.json({
      craneId,
      telemetry: telemetry.map(t => t.getStatusSummary()),
      count: telemetry.length
    });
  } catch (error) {
    console.error('Get telemetry error:', error);
    res.status(500).json({ error: 'Failed to fetch telemetry data' });
  }
});

/**
 * GET /api/cranes/:id/telemetry/stats
 * Get telemetry statistics for a crane
 */
router.get('/:id/telemetry/stats', authenticateToken, canAccessCrane('id'), smartCache, async (req, res) => {
  try {
    const { from, to } = req.query;
    const craneId = req.params.id;

    // Verify crane exists
    const crane = await Crane.findOne({ craneId, isActive: true });
    if (!crane) {
      return res.status(404).json({ error: 'Crane not found' });
    }

    // Get statistics
    const stats = await Telemetry.getTelemetryStats(craneId, from, to);
    const utilizationTrend = await Telemetry.getUtilizationTrend(craneId, 24);
    const peakLoadTrend = await Telemetry.getPeakLoadTrend(craneId, 7);

    res.json({
      craneId,
      stats: stats[0] || {
        count: 0,
        avgLoad: 0,
        maxLoad: 0,
        avgUtilization: 0,
        maxUtilization: 0,
        overloadCount: 0,
        limitSwitchFailures: 0
      },
      utilizationTrend,
      peakLoadTrend
    });
  } catch (error) {
    console.error('Get telemetry stats error:', error);
    res.status(500).json({ error: 'Failed to fetch telemetry statistics' });
  }
});

/**
 * POST /api/cranes/sync-telemetry
 * Sync latest telemetry data to all cranes (manager only)
 */
router.post('/sync-telemetry', authenticateToken, requirePermission('cranes.update'), smartInvalidation, async (req, res) => {
  try {
    const cranes = await Crane.find({ isActive: true });
    
    // Process all cranes in parallel instead of sequentially
    const syncPromises = cranes.map(async (crane) => {
      try {
        // Get the latest telemetry for this crane
        const latestTelemetry = await Telemetry.findOne({ craneId: crane.craneId })
          .sort({ ts: -1 });

        if (latestTelemetry) {
          // Update the crane's lastStatusRaw with the latest telemetry data
          const telemetryData = {
            load: latestTelemetry.load,
            swl: latestTelemetry.swl,
            util: latestTelemetry.util,
            ls1: latestTelemetry.ls1,
            ls2: latestTelemetry.ls2,
            ls3: latestTelemetry.ls3,
            ls4: latestTelemetry.ls4,
            ut: latestTelemetry.ut,
            raw: latestTelemetry.raw
          };

          await crane.updateStatus(telemetryData);
          return { success: true, craneId: crane.craneId };
        }
        return { success: false, craneId: crane.craneId, reason: 'No telemetry data' };
      } catch (error) {
        console.error(`Error syncing crane ${crane.craneId}:`, error);
        return { success: false, craneId: crane.craneId, error: error.message };
      }
    });

    // Wait for all sync operations to complete
    const results = await Promise.all(syncPromises);
    
    // Count successful updates
    const updatedCount = results.filter(result => result.success).length;
    const failedCount = results.filter(result => !result.success).length;
    const failedCranes = results.filter(result => !result.success).map(r => r.craneId);

    res.json({
      message: `Successfully synced telemetry data to ${updatedCount} cranes`,
      updatedCount,
      totalCranes: cranes.length,
      failedCount,
      failedCranes: failedCranes.length > 0 ? failedCranes : undefined
    });
  } catch (error) {
    console.error('Sync telemetry error:', error);
    res.status(500).json({ error: 'Failed to sync telemetry data' });
  }
});

/**
 * GET /api/cranes/:id/tickets
 * Get tickets for a crane
 */
router.get('/:id/tickets', authenticateToken, canAccessCrane('id'), smartCache, async (req, res) => {
  try {
    const { status, limit = 50 } = req.query;
    const craneId = req.params.id;

    // Verify crane exists
    const crane = await Crane.findOne({ craneId, isActive: true });
    if (!crane) {
      return res.status(404).json({ error: 'Crane not found' });
    }

    // Get tickets
    const tickets = await Ticket.findByCrane(craneId, status)
      .limit(parseInt(limit))
      .populate('assignedTo', 'name email');

    res.json({
      craneId,
      tickets: tickets.map(ticket => ticket.getSummary())
    });
  } catch (error) {
    console.error('Get crane tickets error:', error);
    res.status(500).json({ error: 'Failed to fetch crane tickets' });
  }
});

// =============================================================================
// CRANE DISCOVERY ENDPOINTS
// =============================================================================

/**
 * Get all pending cranes (discovered from MQTT but not approved)
 */
router.get('/pending', authenticateToken, requirePermission('cranes.read'), async (req, res) => {
  try {
    const pendingCranes = craneDiscovery.getPendingCranes();
    res.json({
      success: true,
      pendingCranes: pendingCranes.map(crane => ({
        craneId: crane.craneId,
        name: crane.name,
        location: crane.location,
        swl: crane.swl,
        discoveredAt: crane.discoveredAt,
        lastSeen: crane.lastSeen,
        telemetryCount: crane.telemetryCount,
        locationData: crane.locationData
      }))
    });
  } catch (error) {
    console.error('Get pending cranes error:', error);
    res.status(500).json({ error: 'Failed to fetch pending cranes' });
  }
});

/**
 * Approve a pending crane
 */
router.post('/pending/:craneId/approve', authenticateToken, requirePermission('cranes.create'), smartInvalidation, async (req, res) => {
  try {
    const { craneId } = req.params;
    const { name, location, swl, managerUserId, operators, assignedSupervisors, locationData } = req.body;

    // Validate required fields
    if (!name || !location) {
      return res.status(400).json({ 
        error: 'Name and location are required for approval' 
      });
    }

    const crane = await craneDiscovery.approvePendingCrane(craneId, {
      name,
      location,
      swl,
      managerUserId,
      operators,
      assignedSupervisors,
      locationData
    });

    // Emit WebSocket event for crane approval
    const io = req.app.get('io');
    if (io) {
      const craneData = {
        ...crane.toObject(),
        statusSummary: crane.getStatusSummary ? crane.getStatusSummary() : null
      };
      
      io.emit('crane:created', {
        crane: craneData,
        message: `Crane ${craneId} approved and activated by ${req.user.name}`,
        timestamp: new Date().toISOString()
      });
      
      console.log(`📡 WebSocket event emitted: crane:created for approved crane ${craneId}`);
    }

    res.json({
      success: true,
      message: `Crane ${craneId} has been approved and activated`,
      crane: {
        craneId: crane.craneId,
        name: crane.name,
        location: crane.location,
        swl: crane.swl,
        isActive: crane.isActive
      }
    });
  } catch (error) {
    console.error('Approve pending crane error:', error);
    res.status(500).json({ error: 'Failed to approve pending crane' });
  }
});

/**
 * Reject a pending crane
 */
router.post('/pending/:craneId/reject', authenticateToken, requirePermission('cranes.delete'), async (req, res) => {
  try {
    const { craneId } = req.params;
    const { reason } = req.body;

    craneDiscovery.rejectPendingCrane(craneId, reason);

    res.json({
      success: true,
      message: `Crane ${craneId} has been rejected`,
      reason: reason || 'Not authorized'
    });
  } catch (error) {
    console.error('Reject pending crane error:', error);
    res.status(500).json({ error: 'Failed to reject pending crane' });
  }
});

module.exports = router;

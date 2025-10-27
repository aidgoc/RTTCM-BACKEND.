const Crane = require('../models/Crane');
const Telemetry = require('../models/Telemetry');
const Ticket = require('../models/Ticket');
const User = require('../models/User');
const { logServiceOperation, logDatabaseOperation } = require('../middleware/errorHandler');

class CraneService {
  // Optimized aggregation pipeline for getting cranes with status
  static async getCranesWithStatus({ user, accessibleCranes, filters, pagination }) {
    const startTime = Date.now();
    
    try {
      const { page, limit, skip } = pagination;
      const { status, search } = filters;

      // Build base query
      let query = { isActive: true };
      
      // Apply role-based filtering
      if (user.role !== 'admin' && accessibleCranes.length > 0) {
        query.craneId = { $in: accessibleCranes };
      }

      // Apply filters
      if (status === 'online') query.online = true;
      if (status === 'offline') query.online = false;
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { craneId: { $regex: search, $options: 'i' } },
          { location: { $regex: search, $options: 'i' } }
        ];
      }

      // Get total count with logging
      const countStart = Date.now();
      const total = await Crane.countDocuments(query);
      logDatabaseOperation('countDocuments', 'cranes', Date.now() - countStart, true);

    // Optimized aggregation pipeline
    const pipeline = [
      { $match: query },
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
      {
        $lookup: {
          from: 'tickets',
          let: { craneId: '$craneId' },
          pipeline: [
            { $match: { $expr: { $eq: ['$craneId', '$$craneId'] } } },
            { $group: { _id: '$status', count: { $sum: 1 } } }
          ],
          as: 'ticketCounts'
        }
      },
      {
        $addFields: {
          tickets: {
            $let: {
              vars: { ticketCounts: '$ticketCounts' },
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
                total: { $sum: '$$ticketCounts.count' }
              }
            }
          },
          latestTelemetryData: {
            $cond: [
              { $gt: [{ $size: '$latestTelemetry' }, 0] },
              { $arrayElemAt: ['$latestTelemetry', 0] },
              null
            ]
          },
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
          }
        }
      },
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
      { $sort: { createdAt: -1, lastSeen: -1 } },
      { $skip: skip },
      { $limit: parseInt(limit) },
      {
        $project: {
          _id: 1,
          craneId: 1,
          name: 1,
          location: 1,
          swl: 1,
          lastSeen: 1,
          online: 1,
          lastStatusRaw: 1,
          isActive: 1,
          specifications: 1,
          createdAt: 1,
          updatedAt: 1,
          tickets: 1,
          utilization: 1,
          currentLoad: 1,
          isOverloaded: 1,
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
    ];

      // Execute aggregation with logging
      const aggStart = Date.now();
      const cranes = await Crane.aggregate(pipeline);
      logDatabaseOperation('aggregate', 'cranes', Date.now() - aggStart, true);

      // Process results to add status summary
      const processedCranes = cranes.map(crane => {
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
          statusSummary
        };
      });

      const result = {
        cranes: processedCranes,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      };

      // Log successful operation
      logServiceOperation('CraneService', 'getCranesWithStatus', Date.now() - startTime, true);
      return result;

    } catch (error) {
      // Log failed operation
      logServiceOperation('CraneService', 'getCranesWithStatus', Date.now() - startTime, false, error);
      throw error;
    }
  }

  // Get crane details with related data
  static async getCraneDetails(craneId) {
    const startTime = Date.now();
    
    try {
      const craneStart = Date.now();
      const crane = await Crane.findOne({ craneId, isActive: true })
        .populate('managerUserId', 'name email')
        .populate('operators', 'name email');
      logDatabaseOperation('findOne', 'cranes', Date.now() - craneStart, true);

      if (!crane) {
        logServiceOperation('CraneService', 'getCraneDetails', Date.now() - startTime, false, new Error('Crane not found'));
        return null;
      }

      const dataStart = Date.now();
      const [recentTickets, latestTelemetry] = await Promise.all([
        Ticket.findByCrane(craneId).limit(5).sort({ createdAt: -1 }),
        Telemetry.getLatestTelemetry(craneId)
      ]);
      logDatabaseOperation('findByCrane + getLatestTelemetry', 'tickets + telemetries', Date.now() - dataStart, true);

      const result = {
        ...crane.toObject(),
        statusSummary: crane.getStatusSummary(),
        utilization: crane.utilization,
        currentLoad: crane.currentLoad,
        isOverloaded: crane.isOverloaded,
        limitSwitchStatus: crane.limitSwitchStatus,
        recentTickets: recentTickets.map(ticket => ticket.getSummary()),
        latestTelemetry: latestTelemetry ? latestTelemetry.getStatusSummary() : null
      };

      logServiceOperation('CraneService', 'getCraneDetails', Date.now() - startTime, true);
      return result;

    } catch (error) {
      logServiceOperation('CraneService', 'getCraneDetails', Date.now() - startTime, false, error);
      throw error;
    }
  }

  // Create new crane
  static async createCrane(craneData, currentUser) {
    const startTime = Date.now();
    
    try {
      const { craneId, name, location, swl, managerUserId, operators = [], assignedSupervisors = [] } = craneData;

      // Check if crane already exists
      const checkStart = Date.now();
      const existingCrane = await Crane.findOne({ craneId });
      logDatabaseOperation('findOne', 'cranes', Date.now() - checkStart, true);
      
      if (existingCrane) {
        throw new Error('Crane with this ID already exists');
      }

      // Create new crane
      const crane = new Crane({
        craneId,
        name,
        location,
        swl,
        managerUserId,
        operators
      });

      const saveStart = Date.now();
      await crane.save();
      logDatabaseOperation('save', 'cranes', Date.now() - saveStart, true);

      // Handle supervisor assignments
      if (assignedSupervisors.length > 0) {
        const supervisorStart = Date.now();
        await User.updateMany(
          { _id: { $in: assignedSupervisors } },
          { $addToSet: { assignedCranes: craneId } }
        );
        logDatabaseOperation('updateMany', 'users', Date.now() - supervisorStart, true);
      }

      // Update manager's assigned cranes
      const managerStart = Date.now();
      await User.findByIdAndUpdate(
        managerUserId,
        { $addToSet: { assignedCranes: craneId } }
      );
      logDatabaseOperation('findByIdAndUpdate', 'users', Date.now() - managerStart, true);

      // Populate references
      const populateStart = Date.now();
      await crane.populate('managerUserId', 'name email');
      await crane.populate('operators', 'name email');
      logDatabaseOperation('populate', 'cranes', Date.now() - populateStart, true);

      const result = {
        ...crane.toObject(),
        statusSummary: crane.getStatusSummary()
      };

      logServiceOperation('CraneService', 'createCrane', Date.now() - startTime, true);
      return result;

    } catch (error) {
      logServiceOperation('CraneService', 'createCrane', Date.now() - startTime, false, error);
      throw error;
    }
  }

  // Update crane
  static async updateCrane(craneId, updates) {
    // Remove fields that shouldn't be updated
    const { _id, createdAt, updatedAt, lastSeen, online, lastStatusRaw, ...allowedUpdates } = updates;

    const crane = await Crane.findOneAndUpdate(
      { craneId, isActive: true },
      allowedUpdates,
      { new: true, runValidators: true }
    ).populate('managerUserId', 'name email')
     .populate('operators', 'name email');

    if (!crane) return null;

    return {
      ...crane.toObject(),
      statusSummary: crane.getStatusSummary()
    };
  }

  // Delete crane (soft delete)
  static async deleteCrane(craneId) {
    const crane = await Crane.findOneAndUpdate(
      { craneId, isActive: true },
      { isActive: false },
      { new: true }
    );

    if (!crane) {
      throw new Error('Crane not found');
    }

    // Clean up orphaned references
    await User.updateMany(
      { assignedCranes: craneId },
      { $pull: { assignedCranes: craneId } }
    );

    await User.updateMany(
      { managedCranes: craneId },
      { $pull: { managedCranes: craneId } }
    );

    return crane;
  }

  // Get crane telemetry
  static async getCraneTelemetry(craneId, { from, to, limit }) {
    // Verify crane exists
    const crane = await Crane.findOne({ craneId, isActive: true });
    if (!crane) {
      throw new Error('Crane not found');
    }

    const telemetry = await Telemetry.getCraneTelemetry(craneId, from, to, parseInt(limit));
    return telemetry.map(t => t.getStatusSummary());
  }

  // Get telemetry statistics
  static async getTelemetryStats(craneId, { from, to }) {
    const crane = await Crane.findOne({ craneId, isActive: true });
    if (!crane) {
      throw new Error('Crane not found');
    }

    const [stats, utilizationTrend, peakLoadTrend] = await Promise.all([
      Telemetry.getTelemetryStats(craneId, from, to),
      Telemetry.getUtilizationTrend(craneId, 24),
      Telemetry.getPeakLoadTrend(craneId, 7)
    ]);

    return {
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
    };
  }

  // Sync all cranes with latest telemetry
  static async syncAllCranes() {
    const cranes = await Crane.find({ isActive: true });
    
    const syncPromises = cranes.map(async (crane) => {
      try {
        const latestTelemetry = await Telemetry.findOne({ craneId: crane.craneId })
          .sort({ ts: -1 });

        if (latestTelemetry) {
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
        return { success: false, craneId: crane.craneId, error: error.message };
      }
    });

    const results = await Promise.all(syncPromises);
    
    const updatedCount = results.filter(result => result.success).length;
    const failedCount = results.filter(result => !result.success).length;
    const failedCranes = results.filter(result => !result.success).map(r => r.craneId);

    return {
      message: `Successfully synced telemetry data to ${updatedCount} cranes`,
      updatedCount,
      totalCranes: cranes.length,
      failedCount,
      failedCranes: failedCranes.length > 0 ? failedCranes : undefined
    };
  }

  // Get crane tickets
  static async getCraneTickets(craneId, { status, limit }) {
    const crane = await Crane.findOne({ craneId, isActive: true });
    if (!crane) {
      throw new Error('Crane not found');
    }

    const tickets = await Ticket.findByCrane(craneId, status)
      .limit(parseInt(limit))
      .populate('assignedTo', 'name email');

    return tickets.map(ticket => ticket.getSummary());
  }
}

module.exports = CraneService;


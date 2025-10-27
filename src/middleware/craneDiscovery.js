/**
 * Crane Discovery Middleware
 * Handles automatic crane discovery from MQTT data
 */

const Crane = require('../models/Crane');

class CraneDiscovery {
  constructor() {
    this.pendingCranes = new Map(); // Store unknown cranes temporarily
  }

  /**
   * Check if crane exists, if not, create pending entry
   * @param {string} craneId - The crane ID from MQTT data
   * @param {Object} telemetryData - The telemetry data received
   * @returns {Object} - Crane object (existing or pending)
   */
  async discoverCrane(craneId, telemetryData) {
    try {
      // First, try to find existing crane
      let crane = await Crane.findOne({ craneId, isActive: true });
      
      if (crane) {
        return { crane, isNew: false };
      }

      // Check if crane is in pending list
      if (this.pendingCranes.has(craneId)) {
        const pendingCrane = this.pendingCranes.get(craneId);
        pendingCrane.lastSeen = new Date();
        pendingCrane.telemetryCount = (pendingCrane.telemetryCount || 0) + 1;
        return { crane: pendingCrane, isNew: false, isPending: true };
      }

      // Create pending crane entry
      const pendingCrane = {
        craneId,
        name: `Unknown Crane ${craneId}`,
        location: 'Unknown Location',
        swl: telemetryData.swl || 0,
        isActive: false, // Not active until approved
        isPending: true,
        discoveredAt: new Date(),
        lastSeen: new Date(),
        telemetryCount: 1,
        lastTelemetryData: telemetryData,
        // Extract location from telemetry if available
        locationData: this.extractLocationFromTelemetry(telemetryData)
      };

      this.pendingCranes.set(craneId, pendingCrane);

      // Emit discovery event
      const io = require('../index').get('io');
      if (io) {
        io.emit('crane:discovered', {
          craneId,
          pendingCrane,
          message: `New crane ${craneId} discovered from MQTT data`
        });
      }

      console.log(`🔍 New crane discovered: ${craneId}`);
      return { crane: pendingCrane, isNew: true, isPending: true };

    } catch (error) {
      console.error('Error in crane discovery:', error);
      return null;
    }
  }

  /**
   * Extract location data from telemetry if available
   * @param {Object} telemetryData - The telemetry data
   * @returns {Object} - Location data object
   */
  extractLocationFromTelemetry(telemetryData) {
    // Check if telemetry contains location data from GSM/GPS parsing
    if (telemetryData.locationData && telemetryData.locationData.coordinates) {
      return {
        coordinates: telemetryData.locationData.coordinates,
        locationSource: telemetryData.locationData.locationSource || 'gsm_triangulation',
        locationMethod: telemetryData.locationData.locationMethod || 'gsm',
        locationAccuracy: telemetryData.locationData.locationAccuracy || 100,
        city: telemetryData.locationData.city || null
      };
    }

    // Legacy support for direct latitude/longitude fields
    if (telemetryData.latitude && telemetryData.longitude) {
      return {
        coordinates: [telemetryData.longitude, telemetryData.latitude],
        locationSource: 'gps_hardware',
        locationMethod: 'gps',
        locationAccuracy: 5,
        city: null
      };
    }

    // No location data available
    return null;
  }

  /**
   * Approve pending crane and create official record
   * @param {string} craneId - The crane ID to approve
   * @param {Object} craneData - Additional crane data from admin
   * @returns {Object} - Created crane object
   */
  async approvePendingCrane(craneId, craneData) {
    try {
      const pendingCrane = this.pendingCranes.get(craneId);
      if (!pendingCrane) {
        throw new Error('Pending crane not found');
      }

      // Create official crane record
      const crane = new Crane({
        craneId: pendingCrane.craneId,
        name: craneData.name || pendingCrane.name,
        location: craneData.location || pendingCrane.location,
        swl: craneData.swl || pendingCrane.swl,
        managerUserId: craneData.managerUserId,
        operators: craneData.operators || [],
        assignedSupervisors: craneData.assignedSupervisors || [],
        locationData: craneData.locationData || pendingCrane.locationData || {
          locationSource: 'city_default',
          locationMethod: 'estimated',
          city: craneData.location || pendingCrane.location
        },
        isActive: true,
        isPending: false
      });

      await crane.save();

      // Remove from pending list
      this.pendingCranes.delete(craneId);

      // Emit approval event
      const io = require('../index').get('io');
      if (io) {
        io.emit('crane:approved', {
          craneId,
          crane,
          message: `Crane ${craneId} has been approved and activated`
        });
      }

      console.log(`✅ Crane approved and activated: ${craneId}`);
      return crane;

    } catch (error) {
      console.error('Error approving pending crane:', error);
      throw error;
    }
  }

  /**
   * Reject pending crane
   * @param {string} craneId - The crane ID to reject
   * @param {string} reason - Reason for rejection
   */
  rejectPendingCrane(craneId, reason = 'Not authorized') {
    this.pendingCranes.delete(craneId);

    // Emit rejection event
    const io = require('../index').get('io');
    if (io) {
      io.emit('crane:rejected', {
        craneId,
        reason,
        message: `Crane ${craneId} has been rejected: ${reason}`
      });
    }

    console.log(`❌ Crane rejected: ${craneId} - ${reason}`);
  }

  /**
   * Get all pending cranes
   * @returns {Array} - Array of pending cranes
   */
  getPendingCranes() {
    return Array.from(this.pendingCranes.values());
  }

  /**
   * Clean up old pending cranes (older than 24 hours)
   */
  cleanupOldPendingCranes() {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    for (const [craneId, pendingCrane] of this.pendingCranes.entries()) {
      if (pendingCrane.discoveredAt < twentyFourHoursAgo) {
        this.pendingCranes.delete(craneId);
        console.log(`🧹 Cleaned up old pending crane: ${craneId}`);
      }
    }
  }
}

module.exports = new CraneDiscovery();

const mongoose = require('mongoose');
const os = require('os');
const { logger } = require('../middleware/errorHandler');
const cacheService = require('./cacheService');

class HealthService {
  // Basic health check (liveness probe)
  static async getBasicHealth() {
    const startTime = Date.now();
    
    try {
      const health = {
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        responseTime: `${Date.now() - startTime}ms`
      };

      logger.info('Health Check - Basic', { status: 'OK', responseTime: Date.now() - startTime });
      return health;
    } catch (error) {
      logger.error('Health Check - Basic Failed', { error: error.message });
      return {
        status: 'ERROR',
        timestamp: new Date().toISOString(),
        error: error.message,
        responseTime: `${Date.now() - startTime}ms`
      };
    }
  }

  // Comprehensive health check (readiness probe)
  static async getDetailedHealth() {
    const startTime = Date.now();
    const health = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      responseTime: `${Date.now() - startTime}ms`,
      services: {},
      system: {},
      checks: []
    };

    try {
      // Check database connectivity
      const dbHealth = await this.checkDatabase();
      health.services.database = dbHealth;
      health.checks.push({
        name: 'database',
        status: dbHealth.status,
        duration: dbHealth.duration,
        message: dbHealth.message
      });

      // Check MQTT connectivity
      const mqttHealth = await this.checkMQTT();
      health.services.mqtt = mqttHealth;
      health.checks.push({
        name: 'mqtt',
        status: mqttHealth.status,
        duration: mqttHealth.duration,
        message: mqttHealth.message
      });

      // Check Redis connectivity
      const redisHealth = await this.checkRedis();
      health.services.redis = redisHealth;
      health.checks.push({
        name: 'redis',
        status: redisHealth.status,
        duration: redisHealth.duration,
        message: redisHealth.message
      });

      // Check system resources
      const systemHealth = this.checkSystemResources();
      health.system = systemHealth;
      health.checks.push({
        name: 'system',
        status: systemHealth.status,
        duration: '0ms',
        message: systemHealth.message
      });

      // Check external dependencies
      const externalHealth = await this.checkExternalDependencies();
      health.services.external = externalHealth;
      health.checks.push({
        name: 'external',
        status: externalHealth.status,
        duration: externalHealth.duration,
        message: externalHealth.message
      });

      // Determine overall health status
      const allChecksPassed = health.checks.every(check => check.status === 'OK');
      health.status = allChecksPassed ? 'OK' : 'DEGRADED';

      // Log health check result
      logger.info('Health Check - Detailed', {
        status: health.status,
        checks: health.checks.length,
        passed: health.checks.filter(c => c.status === 'OK').length,
        responseTime: Date.now() - startTime
      });

      return health;
    } catch (error) {
      logger.error('Health Check - Detailed Failed', { error: error.message });
      return {
        status: 'ERROR',
        timestamp: new Date().toISOString(),
        error: error.message,
        responseTime: `${Date.now() - startTime}ms`
      };
    }
  }

  // Database health check
  static async checkDatabase() {
    const startTime = Date.now();
    
    try {
      const dbState = mongoose.connection.readyState;
      
      if (dbState !== 1) {
        return {
          status: 'ERROR',
          state: ['disconnected', 'connected', 'connecting', 'disconnecting'][dbState],
          duration: `${Date.now() - startTime}ms`,
          message: 'Database not connected'
        };
      }

      // Test database with a simple query
      await mongoose.connection.db.admin().ping();
      
      return {
        status: 'OK',
        state: 'connected',
        duration: `${Date.now() - startTime}ms`,
        message: 'Database connection healthy',
        collections: await mongoose.connection.db.listCollections().toArray().then(cols => cols.length)
      };
    } catch (error) {
      return {
        status: 'ERROR',
        state: 'error',
        duration: `${Date.now() - startTime}ms`,
        message: `Database error: ${error.message}`,
        error: error.message
      };
    }
  }

  // MQTT health check
  static async checkMQTT() {
    const startTime = Date.now();
    
    try {
      const mqttClient = global.mqttClient;
      
      if (!mqttClient) {
        return {
          status: 'ERROR',
          connected: false,
          duration: `${Date.now() - startTime}ms`,
          message: 'MQTT client not initialized'
        };
      }

      const isConnected = mqttClient.isConnected || false;
      
      return {
        status: isConnected ? 'OK' : 'ERROR',
        connected: isConnected,
        duration: `${Date.now() - startTime}ms`,
        message: isConnected ? 'MQTT broker connection healthy' : 'MQTT broker connection failed',
        broker: process.env.MQTT_BROKER_URL || 'Not configured'
      };
    } catch (error) {
      return {
        status: 'ERROR',
        connected: false,
        duration: `${Date.now() - startTime}ms`,
        message: `MQTT error: ${error.message}`,
        error: error.message
      };
    }
  }

  // System resources health check
  static checkSystemResources() {
    try {
      const memUsage = process.memoryUsage();
      const memUsedMB = memUsage.heapUsed / 1024 / 1024;
      const memTotalMB = memUsage.heapTotal / 1024 / 1024;
      const memRSSMB = memUsage.rss / 1024 / 1024;
      
      const cpuUsage = process.cpuUsage();
      const loadAvg = os.loadavg();
      
      // Memory thresholds
      const memoryThreshold = 500; // 500MB
      const memoryCritical = 800; // 800MB
      
      let memoryStatus = 'OK';
      if (memUsedMB > memoryCritical) {
        memoryStatus = 'CRITICAL';
      } else if (memUsedMB > memoryThreshold) {
        memoryStatus = 'WARNING';
      }

      // CPU load thresholds
      const cpuThreshold = 0.8; // 80% load
      const cpuStatus = loadAvg[0] > cpuThreshold ? 'WARNING' : 'OK';

      const overallStatus = (memoryStatus === 'CRITICAL' || cpuStatus === 'WARNING') ? 'WARNING' : 'OK';

      return {
        status: overallStatus,
        memory: {
          used: Math.round(memUsedMB),
          total: Math.round(memTotalMB),
          rss: Math.round(memRSSMB),
          external: Math.round(memUsage.external / 1024 / 1024),
          status: memoryStatus,
          threshold: memoryThreshold
        },
        cpu: {
          user: cpuUsage.user,
          system: cpuUsage.system,
          loadAverage: loadAvg,
          status: cpuStatus,
          threshold: cpuThreshold
        },
        platform: os.platform(),
        arch: os.arch(),
        uptime: os.uptime(),
        message: overallStatus === 'OK' ? 'System resources healthy' : 'System resources under pressure'
      };
    } catch (error) {
      return {
        status: 'ERROR',
        message: `System check failed: ${error.message}`,
        error: error.message
      };
    }
  }

  // Redis health check
  static async checkRedis() {
    const startTime = Date.now();
    
    try {
      const redisHealth = await cacheService.healthCheck();
      
      return {
        status: redisHealth.status,
        connected: redisHealth.connected,
        duration: `${Date.now() - startTime}ms`,
        message: redisHealth.message,
        responseTime: redisHealth.responseTime,
        stats: redisHealth.stats
      };
    } catch (error) {
      return {
        status: 'ERROR',
        connected: false,
        duration: `${Date.now() - startTime}ms`,
        message: `Redis error: ${error.message}`,
        error: error.message
      };
    }
  }

  // External dependencies health check
  static async checkExternalDependencies() {
    const startTime = Date.now();
    
    try {
      const dependencies = {
        status: 'OK',
        duration: `${Date.now() - startTime}ms`,
        message: 'All external dependencies healthy',
        services: {}
      };

      // Check if we have any external API dependencies
      // This is where you would add checks for external services
      // For now, we'll just return OK since Tower Dynamics is mostly self-contained
      
      return dependencies;
    } catch (error) {
      return {
        status: 'ERROR',
        duration: `${Date.now() - startTime}ms`,
        message: `External dependencies check failed: ${error.message}`,
        error: error.message
      };
    }
  }

  // Kubernetes-style readiness probe
  static async getReadiness() {
    const health = await this.getDetailedHealth();
    
    // Readiness means the service is ready to accept traffic
    const isReady = health.status === 'OK' && 
                   health.services.database?.status === 'OK' &&
                   health.services.mqtt?.status === 'OK';
    
    return {
      status: isReady ? 'READY' : 'NOT_READY',
      timestamp: new Date().toISOString(),
      checks: health.checks,
      message: isReady ? 'Service is ready to accept traffic' : 'Service is not ready'
    };
  }

  // Kubernetes-style liveness probe
  static async getLiveness() {
    const health = await this.getBasicHealth();
    
    // Liveness means the service is alive (not crashed)
    const isAlive = health.status === 'OK';
    
    return {
      status: isAlive ? 'ALIVE' : 'DEAD',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      message: isAlive ? 'Service is alive' : 'Service is not responding'
    };
  }
}

module.exports = HealthService;

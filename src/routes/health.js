const express = require('express');
const HealthService = require('../services/healthService');
const { logger } = require('../middleware/errorHandler');
const { 
  smartCache, 
  cacheMiddleware,
  cacheConfigs 
} = require('../middleware/cache');
const cacheService = require('../services/cacheService');

const router = express.Router();

// Basic health check (liveness probe)
router.get('/', cacheMiddleware(cacheConfigs.health), async (req, res) => {
  try {
    const health = await HealthService.getBasicHealth();
    const statusCode = health.status === 'OK' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    logger.error('Health check endpoint error', { error: error.message });
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Detailed health check (readiness probe)
router.get('/detailed', cacheMiddleware(cacheConfigs.health), async (req, res) => {
  try {
    const health = await HealthService.getDetailedHealth();
    const statusCode = health.status === 'OK' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    logger.error('Detailed health check endpoint error', { error: error.message });
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Kubernetes readiness probe
router.get('/ready', cacheMiddleware(cacheConfigs.health), async (req, res) => {
  try {
    const readiness = await HealthService.getReadiness();
    const statusCode = readiness.status === 'READY' ? 200 : 503;
    res.status(statusCode).json(readiness);
  } catch (error) {
    logger.error('Readiness probe error', { error: error.message });
    res.status(503).json({
      status: 'NOT_READY',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Kubernetes liveness probe
router.get('/live', cacheMiddleware(cacheConfigs.health), async (req, res) => {
  try {
    const liveness = await HealthService.getLiveness();
    const statusCode = liveness.status === 'ALIVE' ? 200 : 503;
    res.status(statusCode).json(liveness);
  } catch (error) {
    logger.error('Liveness probe error', { error: error.message });
    res.status(503).json({
      status: 'DEAD',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Database health check
router.get('/database', cacheMiddleware(cacheConfigs.health), async (req, res) => {
  try {
    const dbHealth = await HealthService.checkDatabase();
    const statusCode = dbHealth.status === 'OK' ? 200 : 503;
    res.status(statusCode).json(dbHealth);
  } catch (error) {
    logger.error('Database health check error', { error: error.message });
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// MQTT health check
router.get('/mqtt', cacheMiddleware(cacheConfigs.health), async (req, res) => {
  try {
    const mqttHealth = await HealthService.checkMQTT();
    const statusCode = mqttHealth.status === 'OK' ? 200 : 503;
    res.status(statusCode).json(mqttHealth);
  } catch (error) {
    logger.error('MQTT health check error', { error: error.message });
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// System resources health check
router.get('/system', cacheMiddleware(cacheConfigs.health), async (req, res) => {
  try {
    const systemHealth = HealthService.checkSystemResources();
    const statusCode = systemHealth.status === 'OK' ? 200 : 503;
    res.status(statusCode).json(systemHealth);
  } catch (error) {
    logger.error('System health check error', { error: error.message });
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Redis health check
router.get('/redis', cacheMiddleware(cacheConfigs.health), async (req, res) => {
  try {
    const redisHealth = await HealthService.checkRedis();
    const statusCode = redisHealth.status === 'OK' ? 200 : 503;
    res.status(statusCode).json(redisHealth);
  } catch (error) {
    logger.error('Redis health check error', { error: error.message });
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Cache statistics endpoint
router.get('/cache/stats', async (req, res) => {
  try {
    const stats = cacheService.getStats();
    res.json({
      success: true,
      stats: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Cache stats error', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Health check metrics (for monitoring tools)
router.get('/metrics', cacheMiddleware(cacheConfigs.health), async (req, res) => {
  try {
    const health = await HealthService.getDetailedHealth();
    
    // Format for Prometheus-style metrics
    const metrics = {
      tower_dynamics_health_status: health.status === 'OK' ? 1 : 0,
      tower_dynamics_uptime_seconds: process.uptime(),
      tower_dynamics_memory_used_bytes: process.memoryUsage().heapUsed,
      tower_dynamics_memory_total_bytes: process.memoryUsage().heapTotal,
      tower_dynamics_database_status: health.services?.database?.status === 'OK' ? 1 : 0,
      tower_dynamics_mqtt_status: health.services?.mqtt?.status === 'OK' ? 1 : 0,
      tower_dynamics_redis_status: health.services?.redis?.status === 'OK' ? 1 : 0,
      tower_dynamics_system_status: health.system?.status === 'OK' ? 1 : 0,
      tower_dynamics_cache_hits: cacheService.getStats().hits,
      tower_dynamics_cache_misses: cacheService.getStats().misses,
      tower_dynamics_cache_hit_rate: cacheService.getStats().hitRate,
      timestamp: new Date().toISOString()
    };

    res.json(metrics);
  } catch (error) {
    logger.error('Health metrics error', { error: error.message });
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

module.exports = router;

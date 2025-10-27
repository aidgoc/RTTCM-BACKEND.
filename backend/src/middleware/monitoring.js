const os = require('os');
const mongoose = require('mongoose');

// System metrics collection
const getSystemMetrics = () => {
  const memUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();
  
  return {
    timestamp: new Date().toISOString(),
    process: {
      pid: process.pid,
      uptime: process.uptime(),
      memory: {
        rss: Math.round(memUsage.rss / 1024 / 1024), // MB
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
        external: Math.round(memUsage.external / 1024 / 1024), // MB
        arrayBuffers: Math.round(memUsage.arrayBuffers / 1024 / 1024) // MB
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      }
    },
    system: {
      platform: os.platform(),
      arch: os.arch(),
      totalMemory: Math.round(os.totalmem() / 1024 / 1024), // MB
      freeMemory: Math.round(os.freemem() / 1024 / 1024), // MB
      loadAverage: os.loadavg(),
      uptime: os.uptime()
    },
    node: {
      version: process.version,
      versions: process.versions
    }
  };
};

// Database health check
const checkDatabaseHealth = async () => {
  try {
    const state = mongoose.connection.readyState;
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };

    if (state !== 1) {
      return {
        status: 'unhealthy',
        message: `Database is ${states[state]}`,
        state: states[state]
      };
    }

    // Test database connection with a simple query
    await mongoose.connection.db.admin().ping();
    
    return {
      status: 'healthy',
      message: 'Database connection is active',
      state: states[state]
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: 'Database connection failed',
      error: error.message
    };
  }
};

// MQTT health check
const checkMQTTHealth = (mqttClient) => {
  return {
    status: mqttClient.isConnected ? 'healthy' : 'unhealthy',
    message: mqttClient.isConnected ? 'MQTT connected' : 'MQTT disconnected',
    connected: mqttClient.isConnected,
    broker: process.env.MQTT_BROKER_URL || 'Not configured'
  };
};

// Comprehensive health check
const comprehensiveHealthCheck = async (mqttClient) => {
  const startTime = Date.now();
  
  try {
    const [dbHealth, mqttHealth] = await Promise.all([
      checkDatabaseHealth(),
      Promise.resolve(checkMQTTHealth(mqttClient))
    ]);

    const responseTime = Date.now() - startTime;
    const systemMetrics = getSystemMetrics();

    const overallStatus = (dbHealth.status === 'healthy' && mqttHealth.status === 'healthy') 
      ? 'healthy' 
      : 'unhealthy';

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      services: {
        database: dbHealth,
        mqtt: mqttHealth
      },
      system: systemMetrics,
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
      services: {
        database: { status: 'unknown', message: 'Health check failed' },
        mqtt: { status: 'unknown', message: 'Health check failed' }
      }
    };
  }
};

// Performance monitoring middleware
const performanceMonitor = (req, res, next) => {
  const startTime = Date.now();
  const startMemory = process.memoryUsage();

  res.on('finish', () => {
    const endTime = Date.now();
    const endMemory = process.memoryUsage();
    const duration = endTime - startTime;
    
    const memoryDelta = {
      rss: endMemory.rss - startMemory.rss,
      heapUsed: endMemory.heapUsed - startMemory.heapUsed
    };

    // Log slow requests (> 1 second)
    if (duration > 1000) {
      console.warn('Slow request detected', {
        method: req.method,
        url: req.url,
        duration: `${duration}ms`,
        memoryDelta: `${Math.round(memoryDelta.rss / 1024)}KB`,
        status: res.statusCode
      });
    }

    // Log high memory usage requests
    if (memoryDelta.heapUsed > 10 * 1024 * 1024) { // 10MB
      console.warn('High memory usage request', {
        method: req.method,
        url: req.url,
        memoryDelta: `${Math.round(memoryDelta.heapUsed / 1024 / 1024)}MB`,
        status: res.statusCode
      });
    }
  });

  next();
};

// Error rate monitoring
let errorCount = 0;
let requestCount = 0;
const errorRateWindow = 5 * 60 * 1000; // 5 minutes
let lastReset = Date.now();

const trackError = () => {
  errorCount++;
  requestCount++;
  
  // Reset counters every 5 minutes
  if (Date.now() - lastReset > errorRateWindow) {
    errorCount = 0;
    requestCount = 0;
    lastReset = Date.now();
  }
};

const trackRequest = () => {
  requestCount++;
};

const getErrorRate = () => {
  if (requestCount === 0) return 0;
  return (errorCount / requestCount) * 100;
};

// Alert thresholds
const ALERT_THRESHOLDS = {
  ERROR_RATE: 5, // 5% error rate
  RESPONSE_TIME: 2000, // 2 seconds
  MEMORY_USAGE: 500, // 500MB
  CPU_USAGE: 80 // 80%
};

// Check if alerts should be triggered
const checkAlerts = (metrics) => {
  const alerts = [];
  
  if (getErrorRate() > ALERT_THRESHOLDS.ERROR_RATE) {
    alerts.push({
      type: 'error_rate',
      message: `High error rate detected: ${getErrorRate().toFixed(2)}%`,
      severity: 'warning'
    });
  }
  
  if (metrics.process.memory.heapUsed > ALERT_THRESHOLDS.MEMORY_USAGE) {
    alerts.push({
      type: 'memory_usage',
      message: `High memory usage: ${metrics.process.memory.heapUsed}MB`,
      severity: 'warning'
    });
  }
  
  return alerts;
};

module.exports = {
  getSystemMetrics,
  checkDatabaseHealth,
  checkMQTTHealth,
  comprehensiveHealthCheck,
  performanceMonitor,
  trackError,
  trackRequest,
  getErrorRate,
  checkAlerts,
  ALERT_THRESHOLDS
};

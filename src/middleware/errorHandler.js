const winston = require('winston');
const { v4: uuidv4 } = require('uuid');

// Enhanced structured logging configuration
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
      return JSON.stringify({
        timestamp,
        level,
        message,
        stack,
        ...meta,
        service: 'tower-dynamics-backend',
        environment: process.env.NODE_ENV || 'development'
      });
    })
  ),
  defaultMeta: { service: 'tower-dynamics-backend' },
  transports: [
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true
    }),
    new winston.transports.File({ 
      filename: 'logs/performance.log', 
      level: 'info',
      maxsize: 10485760, // 10MB
      maxFiles: 3,
      tailable: true
    }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Add request ID to all logs
const addRequestId = (req, res, next) => {
  req.id = req.id || uuidv4();
  next();
};

// Enhanced error handler with better context and categorization
const errorHandler = (err, req, res, next) => {
  // Determine error severity
  const getErrorSeverity = (error) => {
    if (error.name === 'ValidationError' || error.name === 'CastError') return 'low';
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') return 'medium';
    if (error.name === 'MongoNetworkError' || error.name === 'MongoTimeoutError') return 'high';
    if (error.statusCode >= 500) return 'critical';
    return 'medium';
  };

  const severity = getErrorSeverity(err);
  const requestId = req.id || 'unknown';

  // Enhanced error context
  const errorContext = {
    requestId,
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack,
      code: err.code,
      statusCode: err.statusCode || err.status
    },
    request: {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      headers: {
        'content-type': req.get('content-type'),
        'authorization': req.get('authorization') ? 'Bearer [REDACTED]' : undefined
      }
    },
    user: req.user ? {
      id: req.user._id,
      role: req.user.role,
      email: req.user.email
    } : null,
    timestamp: new Date().toISOString(),
    severity,
    environment: process.env.NODE_ENV || 'development'
  };

  // Log based on severity
  if (severity === 'critical') {
    logger.error('CRITICAL ERROR', errorContext);
  } else if (severity === 'high') {
    logger.error('HIGH SEVERITY ERROR', errorContext);
  } else {
    logger.warn('Application Error', errorContext);
  }

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Invalid input data',
      details: isDevelopment ? err.details : undefined
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({
      error: 'Invalid ID',
      message: 'The provided ID is not valid'
    });
  }

  if (err.name === 'MongoError' && err.code === 11000) {
    return res.status(409).json({
      error: 'Duplicate Entry',
      message: 'A record with this information already exists'
    });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Invalid Token',
      message: 'Authentication token is invalid'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token Expired',
      message: 'Authentication token has expired'
    });
  }

  // Rate limiting errors
  if (err.status === 429) {
    return res.status(429).json({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded, please try again later',
      retryAfter: err.retryAfter
    });
  }

  // Database connection errors
  if (err.name === 'MongoNetworkError' || err.name === 'MongoTimeoutError') {
    return res.status(503).json({
      error: 'Service Unavailable',
      message: 'Database connection failed, please try again later'
    });
  }

  // Default error response
  const statusCode = err.statusCode || err.status || 500;
  const message = isDevelopment ? err.message : 'Internal Server Error';
  
  res.status(statusCode).json({
    error: 'Internal Server Error',
    message,
    ...(isDevelopment && { stack: err.stack }),
    requestId: requestId,
    timestamp: new Date().toISOString()
  });
};

// Async error wrapper
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Enhanced request logging middleware with performance tracking
const requestLogger = (req, res, next) => {
  const start = Date.now();
  const requestId = req.id || uuidv4();
  req.id = requestId;
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      requestId,
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      user: req.user ? {
        id: req.user._id,
        role: req.user.role,
        email: req.user.email
      } : null,
      timestamp: new Date().toISOString(),
      memoryUsage: process.memoryUsage(),
      performance: {
        duration,
        slow: duration > 1000, // Flag slow requests
        verySlow: duration > 5000 // Flag very slow requests
      }
    };

    // Log based on status and performance
    if (res.statusCode >= 500) {
      logger.error('HTTP Server Error', logData);
    } else if (res.statusCode >= 400) {
      logger.warn('HTTP Client Error', logData);
    } else if (duration > 5000) {
      logger.warn('Very Slow Request', logData);
    } else if (duration > 1000) {
      logger.info('Slow Request', logData);
    } else {
      logger.info('HTTP Request', logData);
    }

    // Log performance metrics separately
    if (duration > 100) {
      logger.info('Performance Metric', {
        requestId,
        operation: `${req.method} ${req.url}`,
        duration,
        status: res.statusCode,
        timestamp: new Date().toISOString()
      });
    }
  });

  next();
};

// Health check endpoint
const healthCheck = (req, res) => {
  const health = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  };

  res.json(health);
};

// Graceful shutdown handler
const gracefulShutdown = (server) => {
  const shutdown = (signal) => {
    logger.info(`Received ${signal}, starting graceful shutdown`);
    
    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });

    // Force close after 30 seconds
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 30000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

// Database operation logger
const logDatabaseOperation = (operation, collection, duration, success, error = null) => {
  const logData = {
    operation,
    collection,
    duration: `${duration}ms`,
    success,
    timestamp: new Date().toISOString(),
    memoryUsage: process.memoryUsage()
  };

  if (error) {
    logData.error = {
      name: error.name,
      message: error.message,
      code: error.code
    };
    logger.error('Database Operation Failed', logData);
  } else {
    logger.info('Database Operation', logData);
  }
};

// MQTT operation logger
const logMQTTOperation = (operation, topic, success, error = null) => {
  const logData = {
    operation,
    topic,
    success,
    timestamp: new Date().toISOString()
  };

  if (error) {
    logData.error = {
      name: error.name,
      message: error.message
    };
    logger.error('MQTT Operation Failed', logData);
  } else {
    logger.info('MQTT Operation', logData);
  }
};

// Service operation logger
const logServiceOperation = (service, method, duration, success, error = null) => {
  const logData = {
    service,
    method,
    duration: `${duration}ms`,
    success,
    timestamp: new Date().toISOString(),
    memoryUsage: process.memoryUsage()
  };

  if (error) {
    logData.error = {
      name: error.name,
      message: error.message
    };
    logger.error('Service Operation Failed', logData);
  } else {
    logger.info('Service Operation', logData);
  }
};

module.exports = {
  logger,
  errorHandler,
  asyncHandler,
  requestLogger,
  addRequestId,
  healthCheck,
  gracefulShutdown,
  logDatabaseOperation,
  logMQTTOperation,
  logServiceOperation
};

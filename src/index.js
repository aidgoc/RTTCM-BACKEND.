const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const { createServer } = require('http');
const { Server } = require('socket.io');

// Load and validate environment variables FIRST
require('dotenv').config();
const { env } = require('./config/envValidation');

const { 
  logger, 
  errorHandler, 
  requestLogger, 
  addRequestId,
  healthCheck, 
  gracefulShutdown 
} = require('./middleware/errorHandler');

const mqttClient = require('./mqttClient');
const cacheService = require('./services/cacheService');
const authRoutes = require('./routes/auth');
const craneRoutes = require('./routes/cranes');
const ticketRoutes = require('./routes/tickets');
const userRoutes = require('./routes/users');
const simRoutes = require('./routes/simulation');
const limitTestRoutes = require('./routes/limitTests');
const settingsRoutes = require('./routes/settings');
const craneAssignmentRoutes = require('./routes/crane-assignments');
// New simplified RBAC routes
const ticketsNewRoutes = require('./routes/tickets-new');
const assignmentsNewRoutes = require('./routes/assignments-new');
const healthRoutes = require('./routes/health');
const { authenticateToken } = require('./middleware/auth');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: env.FRONTEND_URL,
    methods: ["GET", "POST"],
    credentials: true
  }
});

// =============================================================================
// COMPREHENSIVE SECURITY HEADERS WITH HELMET.JS
// =============================================================================

// Enhanced Helmet configuration for production-grade security
app.use(helmet({
  // Content Security Policy - Prevent XSS attacks
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      connectSrc: ["'self'", "ws:", "wss:", env.MQTT_BROKER_URL],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: [],
      blockAllMixedContent: []
    },
    reportOnly: false
  },
  
  // Cross-Origin Embedder Policy - Prevent data leakage
  crossOriginEmbedderPolicy: { policy: "require-corp" },
  
  // Cross-Origin Opener Policy - Prevent window.opener attacks
  crossOriginOpenerPolicy: { policy: "same-origin" },
  
  // Cross-Origin Resource Policy - Control resource access
  crossOriginResourcePolicy: { policy: "cross-origin" },
  
  // DNS Prefetch Control - Prevent DNS prefetching
  dnsPrefetchControl: { allow: false },
  
  // Expect-CT - Certificate Transparency
  expectCt: {
    maxAge: 86400,
    enforce: true,
    reportUri: '/api/security/ct-report'
  },
  
  // Feature Policy - Control browser features
  featurePolicy: {
    camera: ["'none'"],
    microphone: ["'none'"],
    geolocation: ["'none'"],
    payment: ["'none'"],
    usb: ["'none'"],
    magnetometer: ["'none'"],
    gyroscope: ["'none'"],
    accelerometer: ["'none'"]
  },
  
  // Hide X-Powered-By header
  hidePoweredBy: true,
  
  // HSTS - Force HTTPS
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  
  // IE No Open - Prevent IE from executing downloads
  ieNoOpen: true,
  
  // No Sniff - Prevent MIME type sniffing
  noSniff: true,
  
  // Origin Agent Cluster - Isolate origins
  originAgentCluster: true,
  
  // Permissions Policy - Control permissions
  permissionsPolicy: {
    camera: [],
    microphone: [],
    geolocation: [],
    payment: [],
    usb: [],
    magnetometer: [],
    gyroscope: [],
    accelerometer: []
  },
  
  // Referrer Policy - Control referrer information
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  
  // XSS Filter - Enable XSS filtering
  xssFilter: true
}));

// Additional security headers not covered by Helmet
app.use((req, res, next) => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // XSS Protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Content Security Policy Report Only (for monitoring)
  res.setHeader('Content-Security-Policy-Report-Only', 
    "default-src 'self'; report-uri /api/security/csp-report"
  );
  
  // Remove server information
  res.removeHeader('X-Powered-By');
  
  // Cache control for sensitive endpoints
  if (req.path.startsWith('/api/auth') || req.path.startsWith('/api/users')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  
  next();
});

// =============================================================================
// ENHANCED CORS CONFIGURATION FOR PRODUCTION SECURITY
// =============================================================================

// Advanced CORS configuration with security best practices
app.use(cors({
  // Origin configuration - restrict to specific domains
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // Define allowed origins
    const allowedOrigins = [
      env.CORS_ORIGIN,
      env.FRONTEND_URL,
      'http://localhost:3000',
      'http://localhost:3001',
      'https://yourdomain.com', // Replace with your production domain
      'https://www.yourdomain.com' // Replace with your production domain
    ];
    
    // Check if origin is allowed
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn('CORS blocked request from unauthorized origin', {
        origin: origin,
        allowedOrigins: allowedOrigins,
        userAgent: origin
      });
      callback(new Error('Not allowed by CORS'));
    }
  },
  
  // Credentials handling
  credentials: true,
  
  // Allowed HTTP methods
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
  
  // Allowed headers
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-API-Key',
    'X-Request-ID',
    'X-Forwarded-For',
    'X-Real-IP',
    'Accept',
    'Accept-Language',
    'Accept-Encoding',
    'Cache-Control',
    'Pragma'
  ],
  
  // Exposed headers
  exposedHeaders: [
    'X-Total-Count',
    'X-Page-Count',
    'X-Rate-Limit-Limit',
    'X-Rate-Limit-Remaining',
    'X-Rate-Limit-Reset',
    'X-Request-ID',
    'X-Response-Time'
  ],
  
  // Preflight cache duration
  maxAge: 86400, // 24 hours
  
  // Options success status
  optionsSuccessStatus: 200,
  
  // Preflight continue
  preflightContinue: false
}));

// Additional CORS security middleware
app.use((req, res, next) => {
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD');
    res.header('Access-Control-Allow-Headers', req.headers['access-control-request-headers'] || '');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Max-Age', '86400');
    return res.status(200).end();
  }
  
  // Add CORS headers to all responses
  res.header('Access-Control-Allow-Origin', req.headers.origin || env.CORS_ORIGIN);
  res.header('Access-Control-Allow-Credentials', 'true');
  
  next();
});

// Compression middleware
app.use(compression());

// Add request ID to all requests
app.use(addRequestId);

// Request logging
app.use(requestLogger);

// =============================================================================
// ADDITIONAL SECURITY MIDDLEWARE
// =============================================================================

// Import security middleware
const {
  ipFilter,
  requestSizeLimiter,
  userAgentValidator,
  methodValidator,
  requestTimeout,
  securityLogger,
  inputSanitizer,
  securityHeaders
} = require('./middleware/security');

// Apply additional security middleware
app.use(ipFilter);                    // IP filtering
app.use(requestSizeLimiter);          // Request size limiting
app.use(userAgentValidator);          // User-Agent validation
app.use(methodValidator);             // HTTP method validation
app.use(requestTimeout(30000));       // Request timeout (30 seconds)
app.use(securityLogger);              // Security event logging
app.use(inputSanitizer);              // Input sanitization
app.use(securityHeaders);             // Additional security headers

// =============================================================================
// ENHANCED RATE LIMITING FOR PRODUCTION SECURITY
// =============================================================================

// General rate limiter for all routes
const generalLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  message: {
    error: 'Too many requests, please try again later',
    retryAfter: Math.ceil(env.RATE_LIMIT_WINDOW_MS / 1000),
    timestamp: new Date().toISOString()
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for health checks and static files
  skip: (req) => {
    return req.path.startsWith('/health') || 
           req.path === '/api/mqtt/status' ||
           req.path.startsWith('/static/') ||
           req.path.startsWith('/assets/');
  },
  // Custom key generator for better tracking
  keyGenerator: (req) => {
    return req.ip + ':' + req.get('User-Agent')?.slice(0, 50) || req.ip;
  },
  // Custom handler for rate limit exceeded
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString()
    });
    
    res.status(429).json({
      error: 'Too many requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: Math.ceil(env.RATE_LIMIT_WINDOW_MS / 1000),
      timestamp: new Date().toISOString()
    });
  }
});

// Strict rate limiter for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 2 * 60 * 1000, // 2 minutes
  max: 5, // 5 attempts per 2 minutes
  message: {
    error: 'Too many authentication attempts',
    retryAfter: 120, // 2 minutes in seconds
    timestamp: new Date().toISOString()
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip,
  handler: (req, res) => {
    logger.warn('Authentication rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
      timestamp: new Date().toISOString()
    });
    
    res.status(429).json({
      error: 'Too many authentication attempts',
      message: 'Please wait 2 minutes before trying again.',
      retryAfter: 120,
      timestamp: new Date().toISOString()
    });
  }
});

// API rate limiter for API endpoints
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: {
    error: 'API rate limit exceeded',
    retryAfter: 60,
    timestamp: new Date().toISOString()
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip,
  handler: (req, res) => {
    logger.warn('API rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString()
    });
    
    res.status(429).json({
      error: 'API rate limit exceeded',
      message: 'Too many API requests. Please slow down.',
      retryAfter: 60,
      timestamp: new Date().toISOString()
    });
  }
});

// Apply rate limiting based on route patterns
app.use((req, res, next) => {
  // Skip rate limiting for health checks and static files
  if (req.path.startsWith('/health') || 
      req.path === '/api/mqtt/status' ||
      req.path.startsWith('/static/') ||
      req.path.startsWith('/assets/')) {
    return next();
  }
  
  // Skip rate limiting for authentication endpoints in development
  if (req.path.startsWith('/api/auth') && process.env.NODE_ENV === 'development') {
    return next();
  }
  
  // Apply strict rate limiting to authentication endpoints in production
  if (req.path.startsWith('/api/auth')) {
    return authLimiter(req, res, next);
  }
  
  // Apply API rate limiting to API endpoints
  if (req.path.startsWith('/api/')) {
    return apiLimiter(req, res, next);
  }
  
  // Apply general rate limiting to all other routes
  return generalLimiter(req, res, next);
});

// Body parsing middleware
app.use(express.json({ limit: `${env.MAX_FILE_SIZE}mb` }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/cranes', authenticateToken, craneRoutes);
app.use('/api/tickets', authenticateToken, ticketRoutes);
app.use('/api/users', authenticateToken, userRoutes);
app.use('/api/sim', authenticateToken, simRoutes);
app.use('/api/limit-tests', authenticateToken, limitTestRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/crane-assignments', authenticateToken, craneAssignmentRoutes);
// New simplified RBAC routes
app.use('/api/tickets-new', authenticateToken, ticketsNewRoutes);
app.use('/api/assignments', authenticateToken, assignmentsNewRoutes);
// Database index management routes (admin only)
app.use('/api/indexes', require('./routes/indexes'));
// Security monitoring routes (admin only)
app.use('/api/security', require('./routes/security'));

// Health check routes (no authentication required)
app.use('/health', healthRoutes);

// Legacy health check endpoint (for backward compatibility)
app.get('/health-legacy', healthCheck);

// MQTT status endpoint
app.get('/api/mqtt/status', (req, res) => {
  res.json({ 
    connected: mqttClient.isConnected,
    broker: env.MQTT_BROKER_URL,
    timestamp: new Date().toISOString()
  });
});

// Socket.IO authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication error'));
  }
  
  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;
    socket.userRole = decoded.role;
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`User ${socket.userId} connected via WebSocket`);
  
  socket.on('disconnect', () => {
    console.log(`User ${socket.userId} disconnected`);
  });
});

// Make io available to other modules
app.set('io', io);

// Root endpoint (for health checkers and browsers)
app.get('/', (req, res) => {
  res.json({
    service: 'Tower Dynamics API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      api: '/api/*'
    },
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Database connection with production settings
const mongoOptions = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  bufferCommands: false,
  retryWrites: true,
  w: 'majority'
};

mongoose.connect(env.MONGO_URI, mongoOptions)
  .then(() => {
    logger.info('Connected to MongoDB', { 
      uri: env.MONGO_URI.replace(/\/\/.*@/, '//***@'), // Hide credentials in logs
      environment: env.NODE_ENV 
    });
    
    // Start MQTT client after DB connection
    if (env.ENABLE_MQTT) {
      mqttClient.connect();
    }
    
    // Initialize Redis cache service
    if (env.ENABLE_REDIS) {
      logger.info('Redis caching enabled', {
        host: env.REDIS_HOST,
        port: env.REDIS_PORT,
        db: env.REDIS_DB
      });
    }
    
    // Start server
    server.listen(env.PORT, () => {
      logger.info(`Server running on port ${env.PORT}`, { 
        port: env.PORT, 
        environment: env.NODE_ENV,
        pid: process.pid 
      });
    });
  })
  .catch((error) => {
    logger.error('MongoDB connection error', { error: error.message, stack: error.stack });
    process.exit(1);
  });

// Graceful shutdown
gracefulShutdown(server);

module.exports = app;

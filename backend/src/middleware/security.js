const { logger } = require('./errorHandler');
const rateLimit = require('express-rate-limit');

/**
 * Additional Security Middleware
 * Provides comprehensive security protections beyond basic headers
 */

// IP whitelist/blacklist middleware
const ipFilter = (req, res, next) => {
  const clientIP = req.ip || req.connection.remoteAddress;
  
  // Define blocked IPs (in production, this would come from a database or config)
  const blockedIPs = [
    // Add known malicious IPs here
    '192.168.1.100', // Example blocked IP
  ];
  
  // Define whitelisted IPs (optional - for admin access)
  const whitelistedIPs = [
    '127.0.0.1',
    '::1',
    '::ffff:127.0.0.1'
  ];
  
  // Check if IP is blocked
  if (blockedIPs.includes(clientIP)) {
    logger.warn('Blocked IP attempted access', {
      ip: clientIP,
      userAgent: req.get('User-Agent'),
      path: req.path,
      timestamp: new Date().toISOString()
    });
    
    return res.status(403).json({
      error: 'Access Denied',
      message: 'Your IP address has been blocked',
      timestamp: new Date().toISOString()
    });
  }
  
  next();
};

// Request size limiter middleware
const requestSizeLimiter = (req, res, next) => {
  const contentLength = parseInt(req.get('Content-Length') || '0');
  const maxSize = 10 * 1024 * 1024; // 10MB
  
  if (contentLength > maxSize) {
    logger.warn('Request size exceeded', {
      ip: req.ip,
      contentLength: contentLength,
      maxSize: maxSize,
      path: req.path,
      timestamp: new Date().toISOString()
    });
    
    return res.status(413).json({
      error: 'Payload Too Large',
      message: 'Request size exceeds maximum allowed size',
      maxSize: maxSize,
      timestamp: new Date().toISOString()
    });
  }
  
  next();
};

// User-Agent validation middleware
const userAgentValidator = (req, res, next) => {
  const userAgent = req.get('User-Agent');
  
  // Block requests with suspicious or missing User-Agent
  if (!userAgent || userAgent.length < 10) {
    logger.warn('Suspicious User-Agent detected', {
      ip: req.ip,
      userAgent: userAgent,
      path: req.path,
      timestamp: new Date().toISOString()
    });
    
    return res.status(400).json({
      error: 'Invalid Request',
      message: 'User-Agent header is required and must be valid',
      timestamp: new Date().toISOString()
    });
  }
  
  // Block known malicious User-Agents
  const maliciousUserAgents = [
    'sqlmap',
    'nikto',
    'nmap',
    'masscan',
    'zap',
    'burp',
    'w3af',
    'acunetix',
    'nessus',
    'openvas'
  ];
  
  const isMalicious = maliciousUserAgents.some(agent => 
    userAgent.toLowerCase().includes(agent.toLowerCase())
  );
  
  if (isMalicious) {
    logger.warn('Malicious User-Agent detected', {
      ip: req.ip,
      userAgent: userAgent,
      path: req.path,
      timestamp: new Date().toISOString()
    });
    
    return res.status(403).json({
      error: 'Access Denied',
      message: 'Malicious User-Agent detected',
      timestamp: new Date().toISOString()
    });
  }
  
  next();
};

// Request method validation middleware
const methodValidator = (req, res, next) => {
  const allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'];
  
  if (!allowedMethods.includes(req.method)) {
    logger.warn('Invalid HTTP method', {
      ip: req.ip,
      method: req.method,
      path: req.path,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });
    
    return res.status(405).json({
      error: 'Method Not Allowed',
      message: `HTTP method ${req.method} is not allowed`,
      allowedMethods: allowedMethods,
      timestamp: new Date().toISOString()
    });
  }
  
  next();
};

// Request timeout middleware
const requestTimeout = (timeout = 30000) => {
  return (req, res, next) => {
    req.setTimeout(timeout, () => {
      logger.warn('Request timeout', {
        ip: req.ip,
        path: req.path,
        method: req.method,
        timeout: timeout,
        timestamp: new Date().toISOString()
      });
      
      if (!res.headersSent) {
        res.status(408).json({
          error: 'Request Timeout',
          message: 'Request took too long to process',
          timeout: timeout,
          timestamp: new Date().toISOString()
        });
      }
    });
    
    next();
  };
};

// Security event logger middleware
const securityLogger = (req, res, next) => {
  // Log security-relevant events
  const securityEvents = [
    'authentication',
    'authorization',
    'data_access',
    'configuration_change',
    'user_management'
  ];
  
  // Check if this is a security-relevant endpoint
  const isSecurityEvent = securityEvents.some(event => 
    req.path.toLowerCase().includes(event)
  );
  
  if (isSecurityEvent) {
    logger.info('Security event detected', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
      method: req.method,
      userId: req.user?.id || 'anonymous',
      timestamp: new Date().toISOString()
    });
  }
  
  next();
};

// CSRF protection middleware (basic implementation)
const csrfProtection = (req, res, next) => {
  // Skip CSRF for GET, HEAD, OPTIONS
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  
  // Skip CSRF for API endpoints (if using API keys)
  if (req.path.startsWith('/api/') && req.get('X-API-Key')) {
    return next();
  }
  
  // Check for CSRF token in headers
  const csrfToken = req.get('X-CSRF-Token');
  const sessionToken = req.session?.csrfToken;
  
  if (!csrfToken || !sessionToken || csrfToken !== sessionToken) {
    logger.warn('CSRF token validation failed', {
      ip: req.ip,
      path: req.path,
      method: req.method,
      hasToken: !!csrfToken,
      hasSessionToken: !!sessionToken,
      timestamp: new Date().toISOString()
    });
    
    return res.status(403).json({
      error: 'CSRF Token Mismatch',
      message: 'Invalid or missing CSRF token',
      timestamp: new Date().toISOString()
    });
  }
  
  next();
};

// Input sanitization middleware
const inputSanitizer = (req, res, next) => {
  // Sanitize request body
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  
  // Sanitize query parameters
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }
  
  // Sanitize URL parameters
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeObject(req.params);
  }
  
  next();
};

// Helper function to sanitize objects
const sanitizeObject = (obj) => {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      // Remove potentially dangerous characters
      sanitized[key] = value
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .trim();
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
};

// Security headers middleware
const securityHeaders = (req, res, next) => {
  // Add additional security headers
  res.setHeader('X-Request-ID', req.id || 'unknown');
  res.setHeader('X-Response-Time', Date.now() - req.startTime);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  // Remove server information
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');
  
  next();
};

module.exports = {
  ipFilter,
  requestSizeLimiter,
  userAgentValidator,
  methodValidator,
  requestTimeout,
  securityLogger,
  csrfProtection,
  inputSanitizer,
  securityHeaders
};

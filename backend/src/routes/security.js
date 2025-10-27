const express = require('express');
const { logger } = require('../middleware/errorHandler');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Apply authentication and admin role requirement to all routes
router.use(authenticateToken);
router.use(requireRole(['admin']));

// Security event storage (in production, this would be a database)
const securityEvents = [];
const blockedIPs = [];
const rateLimitViolations = [];

// Get security events
router.get('/events', asyncHandler(async (req, res) => {
  const { limit = 100, offset = 0, type, severity } = req.query;
  
  let filteredEvents = securityEvents;
  
  if (type) {
    filteredEvents = filteredEvents.filter(event => event.type === type);
  }
  
  if (severity) {
    filteredEvents = filteredEvents.filter(event => event.severity === severity);
  }
  
  const paginatedEvents = filteredEvents
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(offset, offset + parseInt(limit));
  
  res.json({
    success: true,
    events: paginatedEvents,
    total: filteredEvents.length,
    pagination: {
      limit: parseInt(limit),
      offset: parseInt(offset),
      hasMore: offset + parseInt(limit) < filteredEvents.length
    }
  });
}));

// Get blocked IPs
router.get('/blocked-ips', asyncHandler(async (req, res) => {
  res.json({
    success: true,
    blockedIPs: blockedIPs,
    total: blockedIPs.length
  });
}));

// Add IP to blocklist
router.post('/block-ip', asyncHandler(async (req, res) => {
  const { ip, reason, duration } = req.body;
  
  if (!ip) {
    return res.status(400).json({
      success: false,
      error: 'IP address is required'
    });
  }
  
  const blockEntry = {
    ip: ip,
    reason: reason || 'Manual block',
    blockedBy: req.user.id,
    blockedAt: new Date().toISOString(),
    duration: duration || null, // null means permanent
    expiresAt: duration ? new Date(Date.now() + duration * 1000).toISOString() : null
  };
  
  blockedIPs.push(blockEntry);
  
  logger.info('IP blocked', {
    ip: ip,
    reason: reason,
    blockedBy: req.user.id,
    timestamp: new Date().toISOString()
  });
  
  res.json({
    success: true,
    message: 'IP address blocked successfully',
    blockEntry: blockEntry
  });
}));

// Remove IP from blocklist
router.delete('/unblock-ip/:ip', asyncHandler(async (req, res) => {
  const { ip } = req.params;
  
  const index = blockedIPs.findIndex(entry => entry.ip === ip);
  
  if (index === -1) {
    return res.status(404).json({
      success: false,
      error: 'IP address not found in blocklist'
    });
  }
  
  const unblockedEntry = blockedIPs.splice(index, 1)[0];
  
  logger.info('IP unblocked', {
    ip: ip,
    unblockedBy: req.user.id,
    timestamp: new Date().toISOString()
  });
  
  res.json({
    success: true,
    message: 'IP address unblocked successfully',
    unblockedEntry: unblockedEntry
  });
}));

// Get rate limit violations
router.get('/rate-limit-violations', asyncHandler(async (req, res) => {
  const { limit = 100, offset = 0 } = req.query;
  
  const paginatedViolations = rateLimitViolations
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(offset, offset + parseInt(limit));
  
  res.json({
    success: true,
    violations: paginatedViolations,
    total: rateLimitViolations.length,
    pagination: {
      limit: parseInt(limit),
      offset: parseInt(offset),
      hasMore: offset + parseInt(limit) < rateLimitViolations.length
    }
  });
}));

// Get security statistics
router.get('/stats', asyncHandler(async (req, res) => {
  const now = new Date();
  const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  const stats = {
    totalEvents: securityEvents.length,
    eventsLast24Hours: securityEvents.filter(e => new Date(e.timestamp) > last24Hours).length,
    eventsLast7Days: securityEvents.filter(e => new Date(e.timestamp) > last7Days).length,
    totalBlockedIPs: blockedIPs.length,
    activeBlockedIPs: blockedIPs.filter(ip => !ip.expiresAt || new Date(ip.expiresAt) > now).length,
    totalRateLimitViolations: rateLimitViolations.length,
    violationsLast24Hours: rateLimitViolations.filter(v => new Date(v.timestamp) > last24Hours).length,
    topEventTypes: getTopEventTypes(securityEvents),
    topBlockedIPs: getTopBlockedIPs(securityEvents),
    securityScore: calculateSecurityScore(securityEvents, rateLimitViolations)
  };
  
  res.json({
    success: true,
    stats: stats
  });
}));

// CSP violation report endpoint
router.post('/csp-report', asyncHandler(async (req, res) => {
  const report = req.body;
  
  logger.warn('CSP violation reported', {
    report: report,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });
  
  // Store CSP violation
  securityEvents.push({
    type: 'csp_violation',
    severity: 'medium',
    details: report,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });
  
  res.status(204).send();
}));

// CT (Certificate Transparency) report endpoint
router.post('/ct-report', asyncHandler(async (req, res) => {
  const report = req.body;
  
  logger.warn('Certificate Transparency violation reported', {
    report: report,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });
  
  // Store CT violation
  securityEvents.push({
    type: 'ct_violation',
    severity: 'high',
    details: report,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });
  
  res.status(204).send();
}));

// Security health check
router.get('/health', asyncHandler(async (req, res) => {
  const health = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    security: {
      headersEnabled: true,
      rateLimitingEnabled: true,
      corsEnabled: true,
      csrfProtectionEnabled: true,
      inputSanitizationEnabled: true
    },
    metrics: {
      totalEvents: securityEvents.length,
      blockedIPs: blockedIPs.length,
      rateLimitViolations: rateLimitViolations.length
    }
  };
  
  res.json(health);
}));

// Helper functions
function getTopEventTypes(events) {
  const typeCount = {};
  events.forEach(event => {
    typeCount[event.type] = (typeCount[event.type] || 0) + 1;
  });
  
  return Object.entries(typeCount)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([type, count]) => ({ type, count }));
}

function getTopBlockedIPs(events) {
  const ipCount = {};
  events.forEach(event => {
    if (event.ip) {
      ipCount[event.ip] = (ipCount[event.ip] || 0) + 1;
    }
  });
  
  return Object.entries(ipCount)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([ip, count]) => ({ ip, count }));
}

function calculateSecurityScore(events, violations) {
  // Simple security score calculation
  const totalEvents = events.length;
  const totalViolations = violations.length;
  
  if (totalEvents === 0) return 100;
  
  const eventPenalty = Math.min(totalEvents * 2, 50);
  const violationPenalty = Math.min(totalViolations * 5, 30);
  
  return Math.max(0, 100 - eventPenalty - violationPenalty);
}

module.exports = router;

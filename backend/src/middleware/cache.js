const cacheService = require('../services/cacheService');
const { logger } = require('./errorHandler');
const { env } = require('../config/envValidation');

/**
 * Caching Middleware
 * Provides intelligent caching for API endpoints
 * Supports different caching strategies and TTL configurations
 */

/**
 * Generate cache key from request
 */
const generateCacheKey = (req) => {
  const { method, originalUrl, query, user } = req;
  
  // Base key components
  const components = [
    method.toLowerCase(),
    originalUrl.replace(/\/$/, ''), // Remove trailing slash
  ];
  
  // Add query parameters if present
  if (query && Object.keys(query).length > 0) {
    const sortedQuery = Object.keys(query)
      .sort()
      .map(key => `${key}=${query[key]}`)
      .join('&');
    components.push(sortedQuery);
  }
  
  // Add user context if authenticated
  if (user && user._id) {
    components.push(`user:${user._id}`);
  }
  
  return components.join(':');
};

/**
 * Cache middleware factory
 */
const cacheMiddleware = (options = {}) => {
  const {
    namespace = 'api',
    ttl = null,
    skipCache = false,
    keyGenerator = generateCacheKey,
    condition = null,
    varyBy = []
  } = options;

  return async (req, res, next) => {
    // Skip caching if disabled
    if (!env.ENABLE_REDIS || skipCache) {
      return next();
    }

    // Skip non-GET requests by default
    if (req.method !== 'GET') {
      return next();
    }

    // Check custom condition
    if (condition && !condition(req)) {
      return next();
    }

    try {
      const cacheKey = keyGenerator(req);
      
      // Try to get from cache
      const cachedData = await cacheService.get(namespace, cacheKey);
      
      if (cachedData) {
        logger.debug('Cache hit for API endpoint', {
          method: req.method,
          url: req.originalUrl,
          cacheKey,
          namespace
        });
        
        return res.json(cachedData);
      }

      // Cache miss - intercept response
      const originalJson = res.json;
      const originalSend = res.send;
      
      res.json = function(data) {
        // Store in cache
        cacheService.set(namespace, cacheKey, data, ttl)
          .then(success => {
            if (success) {
              logger.debug('Data cached for API endpoint', {
                method: req.method,
                url: req.originalUrl,
                cacheKey,
                namespace,
                ttl: ttl || env.REDIS_TTL_DEFAULT
              });
            }
          })
          .catch(error => {
            logger.warn('Failed to cache API response', {
              method: req.method,
              url: req.originalUrl,
              error: error.message
            });
          });
        
        return originalJson.call(this, data);
      };

      res.send = function(data) {
        // Only cache JSON responses
        if (res.get('Content-Type')?.includes('application/json')) {
          try {
            const jsonData = JSON.parse(data);
            cacheService.set(namespace, cacheKey, jsonData, ttl)
              .then(success => {
                if (success) {
                  logger.debug('Data cached for API endpoint (send)', {
                    method: req.method,
                    url: req.originalUrl,
                    cacheKey,
                    namespace
                  });
                }
              })
              .catch(error => {
                logger.warn('Failed to cache API response (send)', {
                  method: req.method,
                  url: req.originalUrl,
                  error: error.message
                });
              });
          } catch (parseError) {
            // Not JSON data, don't cache
          }
        }
        
        return originalSend.call(this, data);
      };

      next();
    } catch (error) {
      logger.error('Cache middleware error', {
        method: req.method,
        url: req.originalUrl,
        error: error.message
      });
      next();
    }
  };
};

/**
 * Cache invalidation middleware
 */
const cacheInvalidation = (options = {}) => {
  const {
    namespaces = ['api'],
    patterns = [],
    condition = null
  } = options;

  return async (req, res, next) => {
    // Skip if caching disabled
    if (!env.ENABLE_REDIS) {
      return next();
    }

    // Check condition
    if (condition && !condition(req)) {
      return next();
    }

    // Intercept response to invalidate cache after successful operation
    const originalJson = res.json;
    const originalSend = res.send;
    
    res.json = function(data) {
      // Only invalidate on successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        invalidateCache(req, namespaces, patterns);
      }
      return originalJson.call(this, data);
    };

    res.send = function(data) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        invalidateCache(req, namespaces, patterns);
      }
      return originalSend.call(this, data);
    };

    next();
  };
};

/**
 * Invalidate cache based on patterns
 */
const invalidateCache = async (req, namespaces, patterns) => {
  try {
    for (const namespace of namespaces) {
      for (const pattern of patterns) {
        const deletedCount = await cacheService.delPattern(namespace, pattern);
        if (deletedCount > 0) {
          logger.info('Cache invalidated', {
            namespace,
            pattern,
            deletedCount,
            method: req.method,
            url: req.originalUrl
          });
        }
      }
    }
  } catch (error) {
    logger.error('Cache invalidation error', {
      error: error.message,
      method: req.method,
      url: req.originalUrl
    });
  }
};

/**
 * Predefined cache configurations
 */
const cacheConfigs = {
  // Crane data caching (5 minutes)
  crane: {
    namespace: 'crane',
    ttl: env.REDIS_TTL_CRANE,
    condition: (req) => req.path.includes('/cranes')
  },

  // User data caching (1 hour)
  user: {
    namespace: 'user',
    ttl: env.REDIS_TTL_USER,
    condition: (req) => req.path.includes('/users') || req.path.includes('/auth')
  },

  // Health check caching (30 seconds)
  health: {
    namespace: 'health',
    ttl: env.REDIS_TTL_HEALTH,
    condition: (req) => req.path.includes('/health')
  },

  // Settings caching (30 minutes)
  settings: {
    namespace: 'settings',
    ttl: env.REDIS_TTL_SETTINGS,
    condition: (req) => req.path.includes('/settings')
  },

  // Telemetry data caching (1 minute)
  telemetry: {
    namespace: 'telemetry',
    ttl: 60, // 1 minute
    condition: (req) => req.path.includes('/telemetry')
  },

  // Ticket data caching (5 minutes)
  ticket: {
    namespace: 'ticket',
    ttl: 300, // 5 minutes
    condition: (req) => req.path.includes('/tickets')
  }
};

/**
 * Cache invalidation configurations
 */
const invalidationConfigs = {
  // Invalidate crane cache when crane data changes
  crane: {
    namespaces: ['crane', 'api'],
    patterns: ['*crane*', '*cranes*'],
    condition: (req) => 
      req.method !== 'GET' && 
      (req.path.includes('/cranes') || req.path.includes('/crane-assignments'))
  },

  // Invalidate user cache when user data changes
  user: {
    namespaces: ['user', 'api'],
    patterns: ['*user*', '*users*', '*auth*'],
    condition: (req) => 
      req.method !== 'GET' && 
      (req.path.includes('/users') || req.path.includes('/auth'))
  },

  // Invalidate settings cache when settings change
  settings: {
    namespaces: ['settings', 'api'],
    patterns: ['*settings*', '*setting*'],
    condition: (req) => 
      req.method !== 'GET' && req.path.includes('/settings')
  },

  // Invalidate ticket cache when ticket data changes
  ticket: {
    namespaces: ['ticket', 'api'],
    patterns: ['*ticket*', '*tickets*'],
    condition: (req) => 
      req.method !== 'GET' && req.path.includes('/tickets')
  }
};

/**
 * Smart cache middleware that auto-detects endpoint type
 */
const smartCache = (req, res, next) => {
  // Find matching cache config
  const config = Object.values(cacheConfigs).find(config => 
    config.condition && config.condition(req)
  );

  if (config) {
    return cacheMiddleware(config)(req, res, next);
  }

  // Default API caching
  return cacheMiddleware({
    namespace: 'api',
    ttl: env.REDIS_TTL_DEFAULT
  })(req, res, next);
};

/**
 * Smart cache invalidation that auto-detects endpoint type
 */
const smartInvalidation = (req, res, next) => {
  // Find matching invalidation config
  const config = Object.values(invalidationConfigs).find(config => 
    config.condition && config.condition(req)
  );

  if (config) {
    return cacheInvalidation(config)(req, res, next);
  }

  next();
};

module.exports = {
  cacheMiddleware,
  cacheInvalidation,
  smartCache,
  smartInvalidation,
  cacheConfigs,
  invalidationConfigs,
  generateCacheKey
};

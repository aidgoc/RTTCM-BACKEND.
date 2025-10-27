const Redis = require('ioredis');
const { logger } = require('../middleware/errorHandler');
const { env } = require('../config/envValidation');

/**
 * Redis Cache Service
 * Provides comprehensive caching functionality with Redis
 * Includes connection management, error handling, and performance monitoring
 */

class CacheService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.connectionAttempts = 0;
    this.maxConnectionAttempts = 5;
    this.reconnectDelay = 1000; // 1 second
    this.stats = {
      hits: 0,
      misses: 0,
      errors: 0,
      operations: 0
    };
    
    this.initialize();
  }

  /**
   * Initialize Redis connection
   */
  async initialize() {
    if (!env.ENABLE_REDIS) {
      logger.info('Redis caching is disabled');
      return;
    }

    try {
      const redisConfig = {
        host: env.REDIS_HOST,
        port: env.REDIS_PORT,
        db: env.REDIS_DB,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        keepAlive: 30000,
        connectTimeout: 10000,
        commandTimeout: 5000,
        retryDelayOnClusterDown: 300,
        enableOfflineQueue: false
      };

      // Add password if provided
      if (env.REDIS_PASSWORD) {
        redisConfig.password = env.REDIS_PASSWORD;
      }

      this.client = new Redis(redisConfig);

      // Event handlers
      this.client.on('connect', () => {
        this.isConnected = true;
        this.connectionAttempts = 0;
        logger.info('Redis connected successfully', {
          host: env.REDIS_HOST,
          port: env.REDIS_PORT,
          db: env.REDIS_DB
        });
      });

      this.client.on('error', (error) => {
        this.isConnected = false;
        this.stats.errors++;
        logger.error('Redis connection error', {
          error: error.message,
          attempts: this.connectionAttempts
        });
        this.handleReconnection();
      });

      this.client.on('close', () => {
        this.isConnected = false;
        logger.warn('Redis connection closed');
        this.handleReconnection();
      });

      this.client.on('reconnecting', () => {
        logger.info('Redis reconnecting...', {
          attempts: this.connectionAttempts
        });
      });

      // Connect to Redis
      await this.client.connect();
      
    } catch (error) {
      logger.error('Failed to initialize Redis', {
        error: error.message,
        config: {
          host: env.REDIS_HOST,
          port: env.REDIS_PORT,
          db: env.REDIS_DB
        }
      });
      this.handleReconnection();
    }
  }

  /**
   * Handle reconnection logic
   */
  async handleReconnection() {
    if (this.connectionAttempts >= this.maxConnectionAttempts) {
      logger.error('Max Redis connection attempts reached, giving up');
      return;
    }

    this.connectionAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.connectionAttempts - 1);
    
    logger.info('Attempting Redis reconnection', {
      attempt: this.connectionAttempts,
      delay: delay
    });

    setTimeout(() => {
      this.initialize();
    }, delay);
  }

  /**
   * Check if Redis is available
   */
  isAvailable() {
    return this.isConnected && this.client && env.ENABLE_REDIS;
  }

  /**
   * Generate cache key with namespace
   */
  generateKey(namespace, key) {
    return `tower_dynamics:${namespace}:${key}`;
  }

  /**
   * Get value from cache
   */
  async get(namespace, key) {
    if (!this.isAvailable()) {
      this.stats.misses++;
      return null;
    }

    try {
      const cacheKey = this.generateKey(namespace, key);
      const value = await this.client.get(cacheKey);
      
      this.stats.operations++;
      
      if (value) {
        this.stats.hits++;
        logger.debug('Cache hit', { namespace, key, cacheKey });
        return JSON.parse(value);
      } else {
        this.stats.misses++;
        logger.debug('Cache miss', { namespace, key, cacheKey });
        return null;
      }
    } catch (error) {
      this.stats.errors++;
      logger.error('Cache get error', {
        namespace,
        key,
        error: error.message
      });
      return null;
    }
  }

  /**
   * Set value in cache with TTL
   */
  async set(namespace, key, value, ttl = null) {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const cacheKey = this.generateKey(namespace, key);
      const serializedValue = JSON.stringify(value);
      
      // Use default TTL if not provided
      const actualTTL = ttl || env.REDIS_TTL_DEFAULT;
      
      await this.client.setex(cacheKey, actualTTL, serializedValue);
      this.stats.operations++;
      
      logger.debug('Cache set', {
        namespace,
        key,
        cacheKey,
        ttl: actualTTL
      });
      
      return true;
    } catch (error) {
      this.stats.errors++;
      logger.error('Cache set error', {
        namespace,
        key,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Delete value from cache
   */
  async del(namespace, key) {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const cacheKey = this.generateKey(namespace, key);
      const result = await this.client.del(cacheKey);
      this.stats.operations++;
      
      logger.debug('Cache delete', {
        namespace,
        key,
        cacheKey,
        deleted: result > 0
      });
      
      return result > 0;
    } catch (error) {
      this.stats.errors++;
      logger.error('Cache delete error', {
        namespace,
        key,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Delete multiple keys by pattern
   */
  async delPattern(namespace, pattern) {
    if (!this.isAvailable()) {
      return 0;
    }

    try {
      const searchPattern = this.generateKey(namespace, pattern);
      const keys = await this.client.keys(searchPattern);
      
      if (keys.length === 0) {
        return 0;
      }

      const result = await this.client.del(...keys);
      this.stats.operations++;
      
      logger.info('Cache pattern delete', {
        namespace,
        pattern,
        keysDeleted: result
      });
      
      return result;
    } catch (error) {
      this.stats.errors++;
      logger.error('Cache pattern delete error', {
        namespace,
        pattern,
        error: error.message
      });
      return 0;
    }
  }

  /**
   * Check if key exists in cache
   */
  async exists(namespace, key) {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const cacheKey = this.generateKey(namespace, key);
      const result = await this.client.exists(cacheKey);
      this.stats.operations++;
      
      return result === 1;
    } catch (error) {
      this.stats.errors++;
      logger.error('Cache exists error', {
        namespace,
        key,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Get TTL for a key
   */
  async ttl(namespace, key) {
    if (!this.isAvailable()) {
      return -1;
    }

    try {
      const cacheKey = this.generateKey(namespace, key);
      const result = await this.client.ttl(cacheKey);
      this.stats.operations++;
      
      return result;
    } catch (error) {
      this.stats.errors++;
      logger.error('Cache TTL error', {
        namespace,
        key,
        error: error.message
      });
      return -1;
    }
  }

  /**
   * Increment a numeric value
   */
  async incr(namespace, key, increment = 1) {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const cacheKey = this.generateKey(namespace, key);
      const result = await this.client.incrby(cacheKey, increment);
      this.stats.operations++;
      
      logger.debug('Cache increment', {
        namespace,
        key,
        increment,
        result
      });
      
      return result;
    } catch (error) {
      this.stats.errors++;
      logger.error('Cache increment error', {
        namespace,
        key,
        error: error.message
      });
      return null;
    }
  }

  /**
   * Set expiration for a key
   */
  async expire(namespace, key, ttl) {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const cacheKey = this.generateKey(namespace, key);
      const result = await this.client.expire(cacheKey, ttl);
      this.stats.operations++;
      
      return result === 1;
    } catch (error) {
      this.stats.errors++;
      logger.error('Cache expire error', {
        namespace,
        key,
        ttl,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      ...this.stats,
      isConnected: this.isConnected,
      isEnabled: env.ENABLE_REDIS,
      hitRate: this.stats.operations > 0 ? 
        (this.stats.hits / this.stats.operations * 100).toFixed(2) + '%' : '0%'
    };
  }

  /**
   * Reset cache statistics
   */
  resetStats() {
    this.stats = {
      hits: 0,
      misses: 0,
      errors: 0,
      operations: 0
    };
    logger.info('Cache statistics reset');
  }

  /**
   * Get Redis info
   */
  async getInfo() {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const info = await this.client.info();
      return info;
    } catch (error) {
      logger.error('Cache info error', { error: error.message });
      return null;
    }
  }

  /**
   * Flush all cache data
   */
  async flushAll() {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      await this.client.flushdb();
      this.stats.operations++;
      
      logger.warn('Cache flushed', { namespace: 'all' });
      return true;
    } catch (error) {
      this.stats.errors++;
      logger.error('Cache flush error', { error: error.message });
      return false;
    }
  }

  /**
   * Close Redis connection
   */
  async close() {
    if (this.client) {
      try {
        await this.client.quit();
        this.isConnected = false;
        logger.info('Redis connection closed');
      } catch (error) {
        logger.error('Error closing Redis connection', { error: error.message });
      }
    }
  }

  /**
   * Health check for Redis
   */
  async healthCheck() {
    if (!this.isAvailable()) {
      return {
        status: 'ERROR',
        message: 'Redis not available',
        connected: false
      };
    }

    try {
      const start = Date.now();
      await this.client.ping();
      const responseTime = Date.now() - start;

      return {
        status: 'OK',
        message: 'Redis is healthy',
        connected: true,
        responseTime: `${responseTime}ms`,
        stats: this.getStats()
      };
    } catch (error) {
      return {
        status: 'ERROR',
        message: `Redis health check failed: ${error.message}`,
        connected: false,
        error: error.message
      };
    }
  }
}

// Create singleton instance
const cacheService = new CacheService();

module.exports = cacheService;

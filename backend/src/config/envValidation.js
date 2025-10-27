const Joi = require('joi');

/**
 * Environment Variable Validation Service
 * Validates all required environment variables on startup
 * Fails fast with clear error messages if validation fails
 */

// Environment variable schema
const envSchema = Joi.object({
  // Application Configuration
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test', 'staging')
    .default('development')
    .description('Application environment'),

  PORT: Joi.number()
    .port()
    .default(3001)
    .description('Server port'),

  // Database Configuration
  MONGO_URI: Joi.string()
    .uri({ scheme: ['mongodb', 'mongodb+srv'] })
    .required()
    .description('MongoDB connection URI'),

  MONGO_USERNAME: Joi.string()
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.required(),
      otherwise: Joi.optional()
    })
    .description('MongoDB username (required in production)'),

  MONGO_PASSWORD: Joi.string()
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.required(),
      otherwise: Joi.optional()
    })
    .description('MongoDB password (required in production)'),

  // JWT Configuration
  JWT_SECRET: Joi.string()
    .min(32)
    .required()
    .description('JWT secret key (minimum 32 characters)'),

  JWT_EXPIRES_IN: Joi.string()
    .default('24h')
    .description('JWT token expiration time'),

  // MQTT Configuration
  MQTT_BROKER_URL: Joi.string()
    .uri({ scheme: ['mqtt', 'mqtts', 'ws', 'wss'] })
    .default('mqtt://localhost:1883')
    .description('MQTT broker URL'),

  MQTT_USERNAME: Joi.string()
    .optional()
    .description('MQTT username'),

  MQTT_PASSWORD: Joi.string()
    .optional()
    .description('MQTT password'),

  // CORS Configuration
  FRONTEND_URL: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .default('http://localhost:3000')
    .description('Frontend URL for CORS'),

  CORS_ORIGIN: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .default('http://localhost:3000')
    .description('CORS origin URL'),

  // Logging Configuration
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'debug')
    .default('info')
    .description('Logging level'),

  // Security Configuration
  BCRYPT_ROUNDS: Joi.number()
    .integer()
    .min(10)
    .max(15)
    .default(12)
    .description('BCrypt salt rounds'),

  RATE_LIMIT_WINDOW_MS: Joi.number()
    .integer()
    .min(1000)
    .default(60000)
    .description('Rate limit window in milliseconds'),

  RATE_LIMIT_MAX_REQUESTS: Joi.number()
    .integer()
    .min(1)
    .default(100)
    .description('Maximum requests per window'),

  // File Upload Configuration
  MAX_FILE_SIZE: Joi.number()
    .integer()
    .min(1024)
    .default(10485760)
    .description('Maximum file size in bytes (10MB default)'),

  // Backup Configuration
  BACKUP_DIR: Joi.string()
    .default('/backups/mongodb')
    .description('Backup directory path'),

  BACKUP_RETENTION_DAYS: Joi.number()
    .integer()
    .min(1)
    .max(365)
    .default(7)
    .description('Backup retention days'),

  // Monitoring Configuration
  HEALTH_CHECK_TIMEOUT: Joi.number()
    .integer()
    .min(1000)
    .max(30000)
    .default(5000)
    .description('Health check timeout in milliseconds'),

  // Email Configuration (for alerts)
  SMTP_HOST: Joi.string()
    .optional()
    .description('SMTP host for email alerts'),

  SMTP_PORT: Joi.number()
    .port()
    .optional()
    .description('SMTP port'),

  SMTP_USER: Joi.string()
    .email()
    .optional()
    .description('SMTP username'),

  SMTP_PASS: Joi.string()
    .optional()
    .description('SMTP password'),

  SMTP_FROM: Joi.string()
    .email()
    .optional()
    .description('SMTP from email'),

  ALERT_EMAIL: Joi.string()
    .email()
    .optional()
    .description('Alert recipient email'),

  // External Services
  SENTRY_DSN: Joi.string()
    .uri({ scheme: ['https'] })
    .optional()
    .description('Sentry DSN for error tracking'),

  // Redis Configuration (for caching)
  REDIS_URL: Joi.string()
    .uri({ scheme: ['redis', 'rediss'] })
    .default('redis://localhost:6379')
    .description('Redis connection URL'),

  REDIS_HOST: Joi.string()
    .default('localhost')
    .description('Redis host'),

  REDIS_PORT: Joi.number()
    .port()
    .default(6379)
    .description('Redis port'),

  REDIS_PASSWORD: Joi.string()
    .optional()
    .description('Redis password'),

  REDIS_DB: Joi.number()
    .integer()
    .min(0)
    .max(15)
    .default(0)
    .description('Redis database number'),

  REDIS_TTL_DEFAULT: Joi.number()
    .integer()
    .min(1)
    .default(300)
    .description('Default cache TTL in seconds'),

  REDIS_TTL_CRANE: Joi.number()
    .integer()
    .min(1)
    .default(300)
    .description('Crane data cache TTL in seconds'),

  REDIS_TTL_USER: Joi.number()
    .integer()
    .min(1)
    .default(3600)
    .description('User data cache TTL in seconds'),

  REDIS_TTL_HEALTH: Joi.number()
    .integer()
    .min(1)
    .default(30)
    .description('Health check cache TTL in seconds'),

  REDIS_TTL_SETTINGS: Joi.number()
    .integer()
    .min(1)
    .default(1800)
    .description('Settings cache TTL in seconds'),

  ENABLE_REDIS: Joi.boolean()
    .default(true)
    .description('Enable Redis caching'),

  // SSL Configuration
  SSL_CERT_PATH: Joi.string()
    .optional()
    .description('SSL certificate file path'),

  SSL_KEY_PATH: Joi.string()
    .optional()
    .description('SSL private key file path'),

  // API Keys
  API_KEY: Joi.string()
    .min(16)
    .optional()
    .description('API key for external services'),

  // Feature Flags
  ENABLE_METRICS: Joi.boolean()
    .default(true)
    .description('Enable metrics collection'),

  ENABLE_DEBUG: Joi.boolean()
    .default(false)
    .description('Enable debug mode'),

  ENABLE_CORS: Joi.boolean()
    .default(true)
    .description('Enable CORS'),

  ENABLE_RATE_LIMITING: Joi.boolean()
    .default(true)
    .description('Enable rate limiting'),

  ENABLE_COMPRESSION: Joi.boolean()
    .default(true)
    .description('Enable response compression'),

  ENABLE_HELMET: Joi.boolean()
    .default(true)
    .description('Enable Helmet security headers'),

  ENABLE_LOGGING: Joi.boolean()
    .default(true)
    .description('Enable application logging'),

  ENABLE_MQTT: Joi.boolean()
    .default(true)
    .description('Enable MQTT client'),

  ENABLE_SOCKET_IO: Joi.boolean()
    .default(true)
    .description('Enable Socket.IO'),

  ENABLE_HEALTH_CHECKS: Joi.boolean()
    .default(true)
    .description('Enable health check endpoints'),

  ENABLE_GRACEFUL_SHUTDOWN: Joi.boolean()
    .default(true)
    .description('Enable graceful shutdown handling')
});

// Custom validation functions
const customValidators = {
  // Validate MongoDB URI format
  validateMongoURI: (uri) => {
    if (!uri.includes('mongodb://') && !uri.includes('mongodb+srv://')) {
      throw new Error('MONGO_URI must be a valid MongoDB connection string');
    }
    return uri;
  },

  // Validate JWT secret strength
  validateJWTSecret: (secret) => {
    if (secret.length < 32) {
      throw new Error('JWT_SECRET must be at least 32 characters long for security');
    }
    if (secret === 'your-secret-key' || secret === 'secret' || secret === 'password') {
      throw new Error('JWT_SECRET must not be a default/weak value');
    }
    return secret;
  },

  // Validate MQTT URL format
  validateMQTTURL: (url) => {
    const validSchemes = ['mqtt://', 'mqtts://', 'ws://', 'wss://'];
    if (!validSchemes.some(scheme => url.startsWith(scheme))) {
      throw new Error('MQTT_BROKER_URL must start with mqtt://, mqtts://, ws://, or wss://');
    }
    return url;
  },

  // Validate port number
  validatePort: (port) => {
    const portNum = parseInt(port);
    if (portNum < 1024 && process.env.NODE_ENV === 'production') {
      throw new Error('Port must be 1024 or higher in production');
    }
    return portNum;
  },

  // Validate environment-specific requirements
  validateEnvironmentSpecific: (env) => {
    if (env === 'production') {
      const requiredProdVars = ['MONGO_USERNAME', 'MONGO_PASSWORD'];
      const missing = requiredProdVars.filter(varName => !process.env[varName]);
      
      if (missing.length > 0) {
        throw new Error(`Production environment requires: ${missing.join(', ')}`);
      }
    }
    return env;
  }
};

// Validation function
const validateEnvironment = () => {
  console.log('🔍 Validating environment variables...');
  
  try {
    // Validate against schema
    const { error, value } = envSchema.validate(process.env, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    if (error) {
      const errorMessages = error.details.map(detail => {
        const path = detail.path.join('.');
        const message = detail.message;
        return `  ❌ ${path}: ${message}`;
      });

      console.error('❌ Environment validation failed:');
      console.error(errorMessages.join('\n'));
      console.error('\n📋 Required environment variables:');
      console.error('   MONGO_URI - MongoDB connection string');
      console.error('   JWT_SECRET - JWT secret key (min 32 chars)');
      console.error('   NODE_ENV - Application environment');
      console.error('\n💡 See .env.example for all required variables');
      
      process.exit(1);
    }

    // Apply custom validators
    try {
      customValidators.validateMongoURI(value.MONGO_URI);
      customValidators.validateJWTSecret(value.JWT_SECRET);
      customValidators.validateMQTTURL(value.MQTT_BROKER_URL);
      customValidators.validatePort(value.PORT);
      customValidators.validateEnvironmentSpecific(value.NODE_ENV);
    } catch (customError) {
      console.error('❌ Environment validation failed:');
      console.error(`   ${customError.message}`);
      process.exit(1);
    }

    // Log successful validation
    console.log('✅ Environment validation successful');
    console.log(`   Environment: ${value.NODE_ENV}`);
    console.log(`   Port: ${value.PORT}`);
    console.log(`   Database: ${value.MONGO_URI.replace(/\/\/.*@/, '//***@')}`);
    console.log(`   MQTT: ${value.MQTT_BROKER_URL}`);
    console.log(`   Frontend: ${value.FRONTEND_URL}`);
    console.log(`   Log Level: ${value.LOG_LEVEL}`);
    console.log(`   Features: ${Object.keys(value).filter(key => key.startsWith('ENABLE_') && value[key]).join(', ')}`);

    return value;
  } catch (error) {
    console.error('❌ Environment validation error:', error.message);
    process.exit(1);
  }
};

// Export validated environment variables
const validatedEnv = validateEnvironment();

module.exports = {
  env: validatedEnv,
  validateEnvironment,
  envSchema,
  customValidators
};

# Production Configuration Guide

## Environment Variables

Create a `.env.production` file with the following configuration:

```bash
# Production Environment Configuration
NODE_ENV=production

# Server Configuration
PORT=3001
HOST=0.0.0.0

# Database Configuration
MONGO_URI=mongodb://mongodb:27017/cranefleet
MONGO_MAX_POOL_SIZE=10
MONGO_SERVER_SELECTION_TIMEOUT=5000
MONGO_SOCKET_TIMEOUT=45000

# JWT Configuration
JWT_SECRET=your-super-secure-jwt-secret-key-change-this-in-production
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# MQTT Configuration
MQTT_BROKER_URL=mqtt://mosquitto:1883
MQTT_USERNAME=
MQTT_PASSWORD=
MQTT_PORT=1883

# Frontend Configuration
FRONTEND_URL=http://localhost:3000

# Security Configuration
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
CORS_ORIGIN=http://localhost:3000

# Logging Configuration
LOG_LEVEL=info
LOG_FILE_PATH=logs/

# Data Retention Configuration
TELEMETRY_RETENTION_DAYS=30

# Performance Configuration
MAX_REQUEST_SIZE=10mb
COMPRESSION_ENABLED=true

# Health Check Configuration
HEALTH_CHECK_INTERVAL=30000
HEALTH_CHECK_TIMEOUT=5000

# Monitoring Configuration
ENABLE_METRICS=true
METRICS_PORT=9090

# Backup Configuration
BACKUP_ENABLED=true
BACKUP_INTERVAL=24h
BACKUP_RETENTION_DAYS=7
```

## Security Checklist

- [ ] Change JWT_SECRET to a strong, unique value
- [ ] Use HTTPS in production
- [ ] Set up proper firewall rules
- [ ] Enable MongoDB authentication
- [ ] Use strong passwords for all services
- [ ] Set up SSL certificates
- [ ] Configure proper CORS origins
- [ ] Enable rate limiting
- [ ] Set up monitoring and alerting

## Performance Optimizations

- [ ] Enable compression
- [ ] Set up Redis for caching
- [ ] Configure database indexes
- [ ] Set up load balancing
- [ ] Enable CDN for static assets
- [ ] Configure connection pooling

## Monitoring Setup

- [ ] Set up application monitoring (e.g., New Relic, DataDog)
- [ ] Configure log aggregation (e.g., ELK Stack)
- [ ] Set up uptime monitoring
- [ ] Configure alerting for critical errors
- [ ] Set up performance monitoring

## Backup Strategy

- [ ] Set up automated database backups
- [ ] Configure backup retention policy
- [ ] Test backup restoration process
- [ ] Set up off-site backup storage
- [ ] Document recovery procedures

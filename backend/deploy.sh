#!/bin/bash

# Production Deployment Script for Tower Dynamics Backend
# This script handles production deployment with proper error handling and rollback

set -e  # Exit on any error

# Configuration
APP_NAME="tower-dynamics-backend"
BACKUP_DIR="./backups"
LOG_DIR="./logs"
NODE_ENV="production"
PORT=${PORT:-3001}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   error "This script should not be run as root for security reasons"
fi

# Check required commands
check_dependencies() {
    log "Checking dependencies..."
    
    command -v node >/dev/null 2>&1 || error "Node.js is not installed"
    command -v npm >/dev/null 2>&1 || error "npm is not installed"
    command -v mongodump >/dev/null 2>&1 || error "mongodump is not installed"
    command -v tar >/dev/null 2>&1 || error "tar is not installed"
    
    log "All dependencies found ✓"
}

# Create necessary directories
setup_directories() {
    log "Setting up directories..."
    
    mkdir -p $BACKUP_DIR
    mkdir -p $LOG_DIR
    mkdir -p node_modules
    
    log "Directories created ✓"
}

# Install dependencies
install_dependencies() {
    log "Installing dependencies..."
    
    npm ci --only=production --silent
    
    if [ $? -eq 0 ]; then
        log "Dependencies installed ✓"
    else
        error "Failed to install dependencies"
    fi
}

# Run security audit
security_audit() {
    log "Running security audit..."
    
    npm audit --audit-level=moderate
    
    if [ $? -eq 0 ]; then
        log "Security audit passed ✓"
    else
        warning "Security audit found issues - please review"
    fi
}

# Create backup before deployment
create_backup() {
    log "Creating backup before deployment..."
    
    if [ -f "package.json" ]; then
        # Create a simple backup of current state
        BACKUP_NAME="pre-deploy-$(date +%Y%m%d-%H%M%S)"
        tar -czf "$BACKUP_DIR/$BACKUP_NAME.tar.gz" \
            --exclude=node_modules \
            --exclude=logs \
            --exclude=backups \
            . >/dev/null 2>&1
        
        log "Backup created: $BACKUP_NAME.tar.gz ✓"
    else
        warning "No existing application found, skipping backup"
    fi
}

# Validate environment
validate_environment() {
    log "Validating environment..."
    
    # Check required environment variables
    required_vars=("MONGO_URI" "JWT_SECRET")
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            error "Required environment variable $var is not set"
        fi
    done
    
    # Check if MongoDB is accessible
    if ! mongosh --eval "db.runCommand('ping')" $MONGO_URI >/dev/null 2>&1; then
        error "Cannot connect to MongoDB at $MONGO_URI"
    fi
    
    log "Environment validation passed ✓"
}

# Run tests
run_tests() {
    log "Running tests..."
    
    if [ -f "package.json" ] && grep -q '"test"' package.json; then
        npm test --silent
        
        if [ $? -eq 0 ]; then
            log "Tests passed ✓"
        else
            error "Tests failed"
        fi
    else
        warning "No tests found, skipping"
    fi
}

# Start application
start_application() {
    log "Starting application..."
    
    # Set environment
    export NODE_ENV=$NODE_ENV
    
    # Start with PM2 if available, otherwise use node
    if command -v pm2 >/dev/null 2>&1; then
        pm2 start src/index.js --name $APP_NAME --env production
        log "Application started with PM2 ✓"
    else
        nohup node src/index.js > $LOG_DIR/app.log 2>&1 &
        echo $! > $LOG_DIR/app.pid
        log "Application started with node ✓"
    fi
}

# Health check
health_check() {
    log "Performing health check..."
    
    # Wait for application to start
    sleep 5
    
    # Check if application is responding
    for i in {1..30}; do
        if curl -f http://localhost:$PORT/health >/dev/null 2>&1; then
            log "Health check passed ✓"
            return 0
        fi
        sleep 2
    done
    
    error "Health check failed - application not responding"
}

# Rollback function
rollback() {
    error "Deployment failed, rolling back..."
    
    # Stop application
    if command -v pm2 >/dev/null 2>&1; then
        pm2 stop $APP_NAME 2>/dev/null || true
    else
        if [ -f "$LOG_DIR/app.pid" ]; then
            kill $(cat $LOG_DIR/app.pid) 2>/dev/null || true
        fi
    fi
    
    # Restore from backup
    LATEST_BACKUP=$(ls -t $BACKUP_DIR/pre-deploy-*.tar.gz 2>/dev/null | head -1)
    if [ -n "$LATEST_BACKUP" ]; then
        log "Restoring from backup: $LATEST_BACKUP"
        tar -xzf "$LATEST_BACKUP" -C . --overwrite
    fi
    
    error "Rollback completed"
}

# Main deployment function
deploy() {
    log "Starting production deployment..."
    
    # Set trap for rollback on error
    trap rollback ERR
    
    check_dependencies
    setup_directories
    create_backup
    validate_environment
    install_dependencies
    security_audit
    run_tests
    start_application
    health_check
    
    log "Deployment completed successfully! 🚀"
    
    # Show application status
    if command -v pm2 >/dev/null 2>&1; then
        pm2 status
    else
        log "Application PID: $(cat $LOG_DIR/app.pid 2>/dev/null || echo 'Not found')"
    fi
}

# Handle command line arguments
case "${1:-deploy}" in
    deploy)
        deploy
        ;;
    rollback)
        rollback
        ;;
    health)
        health_check
        ;;
    backup)
        create_backup
        ;;
    *)
        echo "Usage: $0 {deploy|rollback|health|backup}"
        exit 1
        ;;
esac

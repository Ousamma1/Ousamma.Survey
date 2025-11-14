# Survey Platform - Production Deployment Guide

## Sprint 20: Docker Production Optimization

This guide covers the production deployment of the Survey Platform using optimized Docker containers.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Environment Configuration](#environment-configuration)
4. [Building Images](#building-images)
5. [Running Services](#running-services)
6. [Monitoring](#monitoring)
7. [Logging](#logging)
8. [Backup & Restore](#backup--restore)
9. [Security](#security)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### System Requirements

- **OS**: Linux (Ubuntu 20.04+, CentOS 8+, or similar)
- **CPU**: Minimum 4 cores (8+ recommended for production)
- **RAM**: Minimum 8GB (16GB+ recommended for production)
- **Disk**: Minimum 50GB free space (SSD recommended)

### Required Software

- Docker Engine 24.0+
- Docker Compose 2.20+
- Git
- curl
- jq (for scripts)

### Installation

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install jq
sudo apt-get install jq -y  # Ubuntu/Debian
sudo yum install jq -y      # CentOS/RHEL
```

---

## Quick Start

### 1. Clone Repository

```bash
git clone <repository-url>
cd Ousamma.Survey
```

### 2. Configure Environment

```bash
# Copy environment template
cp .env.production.example .env.production

# Edit with your values
nano .env.production

# Configure service-specific environments
for service in services/*/; do
    if [ -f "${service}.env.production.example" ]; then
        cp "${service}.env.production.example" "${service}.env.production"
    fi
done
```

### 3. Build Images

```bash
# Build all services
docker-compose -f docker-compose.production.yml build

# Or build specific service
docker-compose -f docker-compose.production.yml build survey-service
```

### 4. Start Services

```bash
# Start all services
docker-compose -f docker-compose.production.yml up -d

# Check status
docker-compose -f docker-compose.production.yml ps

# View logs
docker-compose -f docker-compose.production.yml logs -f
```

---

## Environment Configuration

### Main Configuration (.env.production)

Key environment variables to configure:

```bash
# Database
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=<strong-password>

# Security
JWT_SECRET=<32-character-secret>
ENCRYPTION_KEY=<32-character-key>

# AI Service
AI_API_KEY=<your-openai-key>

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_USER=<email>
EMAIL_PASSWORD=<app-password>

# SMS (Twilio)
TWILIO_ACCOUNT_SID=<sid>
TWILIO_AUTH_TOKEN=<token>

# Monitoring
LOG_LEVEL=info  # debug, info, warn, error
```

### Service-Specific Configuration

Each service has its own `.env.production` file in its directory:

- `services/admin-service/.env.production`
- `services/analytics-service/.env.production`
- `services/notification-service/.env.production`
- etc.

---

## Building Images

### Production Build

The optimized Dockerfiles use multi-stage builds:

```dockerfile
# Stage 1: Dependencies
FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Stage 2: Production
FROM node:18-alpine AS production
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules
# ... rest of the configuration
```

### Build Optimization Features

1. **Multi-stage builds** - Smaller final images
2. **Layer caching** - Faster subsequent builds
3. **Non-root user** - Enhanced security
4. **Alpine base** - Minimal image size
5. **dumb-init** - Proper signal handling

### Build Commands

```bash
# Build with cache
docker-compose -f docker-compose.production.yml build

# Build without cache
docker-compose -f docker-compose.production.yml build --no-cache

# Build specific service
docker-compose -f docker-compose.production.yml build <service-name>

# Build with custom Dockerfile
docker build -f Dockerfile.optimized -t survey-service:latest .
```

### Image Size Comparison

| Service | Before | After | Reduction |
|---------|--------|-------|-----------|
| Survey Service | ~350MB | ~120MB | 66% |
| Analytics | ~300MB | ~100MB | 67% |
| Admin Service | ~280MB | ~95MB | 66% |

---

## Running Services

### Starting Services

```bash
# Start all services
docker-compose -f docker-compose.production.yml up -d

# Start specific services
docker-compose -f docker-compose.production.yml up -d mongodb redis kafka

# Start with logging
docker-compose -f docker-compose.production.yml -f docker-compose.logging.yml up -d
```

### Stopping Services

```bash
# Stop all services
docker-compose -f docker-compose.production.yml down

# Stop and remove volumes (⚠️ DATA LOSS)
docker-compose -f docker-compose.production.yml down -v

# Stop specific service
docker-compose -f docker-compose.production.yml stop <service-name>
```

### Scaling Services

```bash
# Scale analytics consumer
docker-compose -f docker-compose.production.yml up -d --scale analytics-consumer-service=3

# Scale notification consumer
docker-compose -f docker-compose.production.yml up -d --scale notification-consumer-service=2
```

### Health Checks

All services have health checks:

```bash
# Check service health
docker inspect --format='{{.State.Health.Status}}' <container-name>

# View health check logs
docker inspect --format='{{range .State.Health.Log}}{{.Output}}{{end}}' <container-name>
```

### Service Endpoints

| Service | Port | Health Check | Dashboard |
|---------|------|-------------|-----------|
| Survey Service | 3000 | /health | - |
| Geolocation | 3001 | /health | - |
| Analytics | 3002 | /health | - |
| Notification | 3006 | /health | - |
| Admin | 3007 | /health | /admin |
| Kafka UI | 8080 | - | http://localhost:8080 |
| Kibana | 5601 | - | http://localhost:5601 |

---

## Monitoring

### Service Monitoring Script

```bash
# Run monitoring script
./scripts/monitor-services.sh

# Output includes:
# - Infrastructure service status
# - Application service health
# - Resource usage (CPU, Memory)
# - Response times
```

### Manual Health Checks

```bash
# Check all services
curl http://localhost:3000/health  # Survey Service
curl http://localhost:3001/health  # Geolocation
curl http://localhost:3002/health  # Analytics
curl http://localhost:3007/health  # Admin

# Check infrastructure
docker exec survey-mongodb mongosh --eval "db.adminCommand('ping')"
docker exec survey-redis redis-cli ping
docker exec survey-kafka kafka-topics --list --bootstrap-server localhost:9092
```

### Admin Dashboard

Access the admin dashboard for comprehensive monitoring:

```bash
# System health
curl http://localhost:3007/admin/health

# Service status
curl http://localhost:3007/admin/services

# System statistics
curl http://localhost:3007/admin/stats
```

### Resource Monitoring

```bash
# View real-time stats
docker stats

# View specific service
docker stats survey-service

# Container top processes
docker top <container-name>
```

---

## Logging

### Centralized Logging (ELK Stack)

#### Start Logging Infrastructure

```bash
# Start ELK stack
docker-compose -f docker-compose.logging.yml up -d

# Access Kibana
open http://localhost:5601
```

#### Log Locations

- **Container logs**: `/var/lib/docker/containers/`
- **Application logs**: `/var/log/survey-platform/`
- **Elasticsearch**: `http://localhost:9200`
- **Kibana**: `http://localhost:5601`

#### Viewing Logs

```bash
# View all logs
docker-compose -f docker-compose.production.yml logs

# Follow logs
docker-compose -f docker-compose.production.yml logs -f

# Specific service
docker-compose -f docker-compose.production.yml logs -f survey-service

# Last 100 lines
docker-compose -f docker-compose.production.yml logs --tail=100

# With timestamp
docker logs --timestamps <container-name>
```

#### Log Levels

Configure via `LOG_LEVEL` environment variable:

- `debug`: Detailed debugging information
- `info`: General informational messages
- `warn`: Warning messages
- `error`: Error messages only

#### Structured Logging

All logs are in JSON format for easy parsing:

```json
{
  "timestamp": "2025-11-14T10:30:00.000Z",
  "level": "info",
  "service": "survey-service",
  "message": "HTTP Request",
  "method": "GET",
  "url": "/api/surveys",
  "status": 200,
  "responseTime": "45ms",
  "correlationId": "abc123"
}
```

---

## Backup & Restore

### Automated Backups

#### Setup Cron Job

```bash
# Setup daily backups at 2 AM
./scripts/setup-cron-backup.sh

# Custom schedule (every 6 hours)
BACKUP_SCHEDULE="0 */6 * * *" ./scripts/setup-cron-backup.sh
```

#### Manual Backups

```bash
# Complete backup (MongoDB + Volumes)
./scripts/backup-all.sh

# MongoDB only
./scripts/backup-mongodb.sh

# Volumes only
./scripts/backup-volumes.sh
```

#### Backup Configuration

```bash
# Set backup directory
export BACKUP_DIR=/path/to/backups

# Set retention (days)
export RETENTION_DAYS=30

# Run backup
./scripts/backup-mongodb.sh
```

### Restore Operations

#### MongoDB Restore

```bash
# List available backups
ls -lh /backups/mongodb/

# Restore specific backup
./scripts/restore-mongodb.sh mongodb_backup_20251114_020000.tar.gz

# ⚠️ WARNING: This will replace existing data!
```

#### Volume Restore

```bash
# List available backups
ls -lh /backups/volumes/

# Restore volumes
./scripts/restore-volumes.sh volumes_backup_20251114_020000.tar.gz

# ⚠️ Make sure services are stopped first!
docker-compose -f docker-compose.production.yml down
```

### Backup Storage

Backups are stored in:
- MongoDB: `/backups/mongodb/`
- Volumes: `/backups/volumes/`

Recommended: Configure external backup storage (S3, NAS, etc.)

---

## Security

### Security Scanning

#### Run Security Scan

```bash
# Scan all images
./scripts/security-scan.sh

# Reports saved to ./security-reports/
```

#### Install Trivy (if not installed)

```bash
# Ubuntu/Debian
wget -qO - https://aquasecurity.github.io/trivy-repo/deb/public.key | sudo apt-key add -
echo "deb https://aquasecurity.github.io/trivy-repo/deb $(lsb_release -sc) main" | sudo tee -a /etc/apt/sources.list.d/trivy.list
sudo apt-get update
sudo apt-get install trivy -y

# macOS
brew install aquasecurity/trivy/trivy
```

### Security Best Practices

1. **Non-root containers**: All services run as non-root user
2. **Secrets management**: Use environment variables or Docker secrets
3. **Network isolation**: Services communicate via internal Docker network
4. **Regular updates**: Keep base images and dependencies updated
5. **Resource limits**: All services have CPU/memory limits
6. **Health checks**: Automatic restart on failure

### Docker Secrets (Advanced)

```bash
# Create secret
echo "my-secret-value" | docker secret create mongo_password -

# Use in compose file
services:
  mongodb:
    secrets:
      - mongo_password
    environment:
      MONGO_ROOT_PASSWORD_FILE: /run/secrets/mongo_password

secrets:
  mongo_password:
    external: true
```

### Firewall Configuration

```bash
# Allow only necessary ports
sudo ufw allow 3000/tcp  # Survey Service
sudo ufw allow 3007/tcp  # Admin Service
sudo ufw allow 8080/tcp  # Kafka UI (internal only)
sudo ufw enable
```

---

## Troubleshooting

### Common Issues

#### Services Won't Start

```bash
# Check logs
docker-compose -f docker-compose.production.yml logs <service-name>

# Check container status
docker ps -a

# Inspect container
docker inspect <container-name>
```

#### Database Connection Issues

```bash
# Test MongoDB connection
docker exec survey-mongodb mongosh --eval "db.adminCommand('ping')"

# Check MongoDB logs
docker logs survey-mongodb

# Restart MongoDB
docker-compose -f docker-compose.production.yml restart mongodb
```

#### Kafka Issues

```bash
# Check Kafka status
docker exec survey-kafka kafka-broker-api-versions --bootstrap-server localhost:9092

# List topics
docker exec survey-kafka kafka-topics --list --bootstrap-server localhost:9092

# Check consumer groups
docker exec survey-kafka kafka-consumer-groups --list --bootstrap-server localhost:9092
```

#### Out of Memory

```bash
# Check memory usage
docker stats

# Increase service limits in docker-compose.production.yml:
deploy:
  resources:
    limits:
      memory: 2G  # Increase as needed
```

#### Disk Space Issues

```bash
# Check disk usage
df -h

# Clean up Docker
docker system prune -a --volumes  # ⚠️ Removes all unused data

# Remove old images
docker image prune -a

# Remove unused volumes
docker volume prune
```

### Debug Mode

```bash
# Enable debug logging
export LOG_LEVEL=debug

# Restart services
docker-compose -f docker-compose.production.yml restart

# View debug logs
docker-compose -f docker-compose.production.yml logs -f
```

### Performance Issues

```bash
# Check resource usage
docker stats

# Analyze slow queries (MongoDB)
docker exec survey-mongodb mongosh --eval "db.setProfilingLevel(2)"

# Check Redis performance
docker exec survey-redis redis-cli --latency

# Monitor Kafka lag
docker exec survey-kafka kafka-consumer-groups --describe --group analytics-group --bootstrap-server localhost:9092
```

---

## Maintenance

### Updates

```bash
# Pull latest changes
git pull origin main

# Rebuild images
docker-compose -f docker-compose.production.yml build

# Restart with zero downtime
docker-compose -f docker-compose.production.yml up -d
```

### Database Maintenance

```bash
# Compact MongoDB
docker exec survey-mongodb mongosh --eval "db.runCommand({compact: 'collection_name'})"

# Rebuild indexes
docker exec survey-mongodb mongosh --eval "db.collection.reIndex()"

# Check database size
docker exec survey-mongodb mongosh --eval "db.stats()"
```

### Log Rotation

Logs are automatically rotated with the following settings:
- Max size: 10MB per file
- Max files: 3-5 per service
- Compression: gzip

---

## Support

For issues or questions:
- GitHub Issues: <repository-url>/issues
- Documentation: <docs-url>
- Email: support@survey-platform.com

---

**Last Updated**: 2025-11-14
**Version**: 2.0.0
**Sprint**: 20 - Docker Production Optimization

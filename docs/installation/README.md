# Installation Guide

## Table of Contents
- [Prerequisites](#prerequisites)
- [System Requirements](#system-requirements)
- [Docker Installation](#docker-installation)
- [Quick Start](#quick-start)
- [Detailed Setup](#detailed-setup)
- [Configuration](#configuration)
- [Verification](#verification)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

1. **Docker** (version 20.10.0 or higher)
   - Docker Engine
   - Docker Compose v2.0+

2. **Operating System**
   - Linux (Ubuntu 20.04+, CentOS 8+, Debian 11+)
   - macOS 11.0+ (Big Sur or later)
   - Windows 10/11 with WSL2

3. **Network Requirements**
   - Outbound internet access for Docker image pulls
   - Ports available: 3000-3009, 6379, 9092, 27017, 5601
   - Minimum 10 Mbps bandwidth for AI services

4. **Optional Tools**
   - Git (for source code management)
   - Node.js 18+ (for local development)
   - MongoDB Compass (for database management)
   - Redis Commander (for cache management)

---

## System Requirements

### Minimum Requirements (Development)
- **CPU**: 4 cores (2.0 GHz+)
- **RAM**: 8 GB
- **Storage**: 20 GB available space
- **Network**: 10 Mbps

### Recommended Requirements (Production)
- **CPU**: 8+ cores (3.0 GHz+)
- **RAM**: 16 GB+
- **Storage**: 100 GB SSD
- **Network**: 100 Mbps+

### Production Requirements (High Load)
- **CPU**: 16+ cores
- **RAM**: 32 GB+
- **Storage**: 500 GB SSD with RAID 10
- **Network**: 1 Gbps+
- **Load Balancer**: Recommended for horizontal scaling

### Resource Allocation per Service

| Service | CPU | Memory | Storage |
|---------|-----|--------|---------|
| API Gateway | 1 core | 1 GB | 1 GB |
| MongoDB | 2 cores | 2 GB | 20 GB |
| Redis | 1 core | 512 MB | 1 GB |
| Kafka + Zookeeper | 2 cores | 2 GB | 10 GB |
| Analytics Service | 1 core | 1 GB | 5 GB |
| WebSocket Service | 1 core | 512 MB | 500 MB |
| Other Services (each) | 0.5 core | 512 MB | 1 GB |

---

## Docker Installation

### Linux (Ubuntu/Debian)

```bash
# Update package index
sudo apt-get update

# Install prerequisites
sudo apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# Add Docker's official GPG key
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
    sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Set up repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Verify installation
docker --version
docker compose version

# Add user to docker group (logout/login required)
sudo usermod -aG docker $USER
```

### Linux (CentOS/RHEL)

```bash
# Remove old versions
sudo yum remove docker docker-client docker-client-latest \
    docker-common docker-latest docker-latest-logrotate \
    docker-logrotate docker-engine

# Install yum-utils
sudo yum install -y yum-utils

# Add Docker repository
sudo yum-config-manager --add-repo \
    https://download.docker.com/linux/centos/docker-ce.repo

# Install Docker
sudo yum install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Start Docker
sudo systemctl start docker
sudo systemctl enable docker

# Verify installation
docker --version
```

### macOS

```bash
# Install using Homebrew
brew install --cask docker

# Or download from Docker website
# https://docs.docker.com/desktop/install/mac-install/

# Start Docker Desktop application
# Verify installation
docker --version
docker compose version
```

### Windows (WSL2)

1. **Enable WSL2**:
```powershell
# Run in PowerShell as Administrator
wsl --install
wsl --set-default-version 2
```

2. **Install Docker Desktop**:
   - Download from https://www.docker.com/products/docker-desktop
   - Run installer
   - Ensure "Use WSL 2 instead of Hyper-V" is selected
   - Restart computer

3. **Verify Installation**:
```bash
docker --version
docker compose version
```

---

## Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/Ousamma1/Ousamma.Survey.git
cd Ousamma.Survey
```

### 2. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit configuration (see Configuration section)
nano .env
```

### 3. Start Services (Development)

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f

# Check service status
docker compose ps
```

### 4. Access Application

- **Main Application**: http://localhost:3000
- **Survey Builder**: http://localhost:3000/survey-builder.html
- **Admin Dashboard**: http://localhost:3000/admin-surveyors.html
- **Surveyor Dashboard**: http://localhost:3000/surveyor-dashboard.html

### 5. Initial Setup

```bash
# Initialize database
docker compose exec api node scripts/mongo-init.js

# Create admin user (optional)
docker compose exec admin-service node scripts/create-admin.js
```

---

## Detailed Setup

### Step 1: Prepare Environment

```bash
# Create project directory
mkdir -p /opt/survey-system
cd /opt/survey-system

# Clone repository
git clone https://github.com/Ousamma1/Ousamma.Survey.git .

# Create data directories
mkdir -p data/{mongodb,redis,kafka,logs}
chmod -R 755 data/
```

### Step 2: Configure Environment Variables

Create `.env` file:

```bash
# Application
NODE_ENV=production
PORT=3000
APP_NAME=Ousamma Survey System

# MongoDB
MONGODB_URI=mongodb://mongodb:27017/survey_db
MONGO_INITDB_ROOT_USERNAME=admin
MONGO_INITDB_ROOT_PASSWORD=your_secure_password

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# Kafka
KAFKA_BROKERS=kafka:9092
ZOOKEEPER_CONNECT=zookeeper:2181

# JWT Authentication
JWT_SECRET=your_jwt_secret_key_min_32_chars
JWT_REFRESH_SECRET=your_refresh_secret_key_min_32_chars
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# AI Services (Optional)
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
GOOGLE_API_KEY=your_google_key

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=noreply@yourcompany.com

# SMS (Twilio)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Security
CORS_ORIGIN=http://localhost:3000,https://yourdomain.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
SESSION_SECRET=your_session_secret

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_DIR=/app/uploads

# Logging
LOG_LEVEL=info
LOG_DIR=/app/logs
```

### Step 3: Configure Docker Compose

For **production**, use `docker-compose.production.yml`:

```bash
# Review production configuration
cat docker-compose.production.yml

# Customize resource limits if needed
nano docker-compose.production.yml
```

### Step 4: Build and Deploy

```bash
# Build optimized images
docker compose -f docker-compose.production.yml build

# Start services
docker compose -f docker-compose.production.yml up -d

# Monitor startup
docker compose -f docker-compose.production.yml logs -f
```

### Step 5: Initialize Services

```bash
# Wait for MongoDB to be ready (30-60 seconds)
docker compose exec mongodb mongosh --eval "db.adminCommand('ping')"

# Initialize database
docker compose exec api node scripts/mongo-init.js

# Initialize Kafka topics
docker compose exec kafka /scripts/kafka-init.sh
```

### Step 6: Verify Deployment

```bash
# Check all services are running
docker compose ps

# Test API Gateway
curl http://localhost:3000/health

# Test individual services
curl http://localhost:3001/health  # Surveyor Service
curl http://localhost:3002/health  # Analytics Service
curl http://localhost:3007/health  # Admin Service
```

---

## Configuration

### Environment Files

**Development** (`.env`)
- Debug logging
- Relaxed security
- Hot reload enabled
- Local AI models allowed

**Production** (`.env.production`)
- Info/warn logging
- Strict security
- Optimized builds
- HTTPS required
- External AI services only

### Service-Specific Configuration

#### API Gateway (`config/security.config.js`)

```javascript
module.exports = {
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || '*',
    credentials: true,
    maxAge: 86400
  },
  helmet: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"]
      }
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
  }
};
```

#### MongoDB Configuration

```bash
# Create custom MongoDB config (optional)
cat > config/mongodb.conf << EOF
storage:
  dbPath: /data/db
  journal:
    enabled: true

systemLog:
  destination: file
  path: /var/log/mongodb/mongod.log
  logAppend: true

net:
  port: 27017
  bindIp: 0.0.0.0

security:
  authorization: enabled

replication:
  replSetName: rs0
EOF
```

#### Redis Configuration

```bash
# Create Redis config
cat > config/redis.conf << EOF
maxmemory 2gb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
appendonly yes
EOF
```

#### Kafka Configuration

Edit `docker-compose.production.yml`:

```yaml
kafka:
  environment:
    KAFKA_NUM_PARTITIONS: 3
    KAFKA_DEFAULT_REPLICATION_FACTOR: 1
    KAFKA_LOG_RETENTION_HOURS: 168
    KAFKA_LOG_SEGMENT_BYTES: 1073741824
```

---

## Verification

### Health Checks

```bash
#!/bin/bash
# health-check.sh

services=(
  "api:3000"
  "surveyor-service:3001"
  "analytics-service:3002"
  "admin-service:3007"
)

for service in "${services[@]}"; do
  name="${service%%:*}"
  port="${service##*:}"

  echo "Checking $name on port $port..."
  response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$port/health)

  if [ "$response" = "200" ]; then
    echo "✓ $name is healthy"
  else
    echo "✗ $name is unhealthy (HTTP $response)"
  fi
done
```

### Database Verification

```bash
# MongoDB
docker compose exec mongodb mongosh --eval "
  db.adminCommand('listDatabases')
"

# Redis
docker compose exec redis redis-cli ping

# Check Kafka topics
docker compose exec kafka kafka-topics.sh \
  --list --bootstrap-server localhost:9092
```

### Service Connectivity

```bash
# Test survey creation
curl -X POST http://localhost:3000/api/surveys/save \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Survey",
    "description": "Installation verification",
    "questions": []
  }'

# Test analytics
curl http://localhost:3002/api/analytics/survey/test-survey-id
```

### Performance Baseline

```bash
# Install Apache Bench (optional)
sudo apt-get install apache2-utils

# Test API Gateway performance
ab -n 1000 -c 10 http://localhost:3000/health

# Expected: >500 requests/sec
```

---

## Troubleshooting

### Common Issues

#### 1. Port Already in Use

**Symptom**: `Error: Port 3000 is already in use`

**Solution**:
```bash
# Find process using port
sudo lsof -i :3000
sudo netstat -tulpn | grep 3000

# Kill process
sudo kill -9 <PID>

# Or change port in .env
PORT=3100
```

#### 2. Docker Permission Denied

**Symptom**: `permission denied while trying to connect to Docker daemon`

**Solution**:
```bash
# Add user to docker group
sudo usermod -aG docker $USER

# Logout and login again
# Or temporarily
newgrp docker
```

#### 3. MongoDB Connection Failed

**Symptom**: `MongoNetworkError: failed to connect to server`

**Solution**:
```bash
# Check MongoDB is running
docker compose ps mongodb

# Check logs
docker compose logs mongodb

# Restart MongoDB
docker compose restart mongodb

# Wait for startup (30-60 seconds)
sleep 60
```

#### 4. Kafka Startup Issues

**Symptom**: `Connection error: connect ECONNREFUSED`

**Solution**:
```bash
# Kafka requires Zookeeper to start first
docker compose up -d zookeeper
sleep 30
docker compose up -d kafka
sleep 30

# Verify Kafka
docker compose logs kafka | grep "started (kafka.server.KafkaServer)"
```

#### 5. Out of Memory

**Symptom**: Services crash or restart frequently

**Solution**:
```bash
# Check Docker resource usage
docker stats

# Increase memory limits in docker-compose.yml
nano docker-compose.production.yml

# Add memory limits:
deploy:
  resources:
    limits:
      memory: 2G
    reservations:
      memory: 1G
```

#### 6. Slow Performance

**Symptom**: API requests take >1 second

**Solutions**:
```bash
# 1. Enable Redis caching
REDIS_ENABLED=true

# 2. Increase MongoDB connection pool
MONGO_POOL_SIZE=50

# 3. Enable compression
COMPRESSION_ENABLED=true

# 4. Check disk I/O
iostat -x 1 10

# 5. Increase Docker resources
# Docker Desktop > Settings > Resources
```

#### 7. AI Services Not Working

**Symptom**: `AI service unavailable`

**Solution**:
```bash
# Verify API keys in .env
echo $OPENAI_API_KEY

# Test connectivity
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# Check service logs
docker compose logs api | grep -i "ai"
```

#### 8. File Upload Fails

**Symptom**: `File upload error` or `Payload too large`

**Solution**:
```bash
# Increase upload limit in .env
MAX_FILE_SIZE=52428800  # 50 MB

# Check upload directory permissions
mkdir -p uploads
chmod 755 uploads

# Restart API service
docker compose restart api
```

#### 9. WebSocket Connection Fails

**Symptom**: `WebSocket connection failed`

**Solution**:
```bash
# Check WebSocket service
curl http://localhost:3002/health

# Verify firewall allows WebSocket
sudo ufw allow 3002/tcp

# Check CORS settings
CORS_ORIGIN=http://localhost:3000
```

#### 10. Database Migration Errors

**Symptom**: `Schema validation error`

**Solution**:
```bash
# Backup database first
docker compose exec mongodb mongodump --out /backup

# Run migrations
docker compose exec api node scripts/migrate.js

# If failed, restore backup
docker compose exec mongodb mongorestore /backup
```

### Logs and Debugging

```bash
# View all logs
docker compose logs

# Follow specific service
docker compose logs -f api

# Last 100 lines
docker compose logs --tail=100 mongodb

# Filter by time
docker compose logs --since 30m

# Save logs to file
docker compose logs > logs/deployment.log
```

### Performance Monitoring

```bash
# Real-time resource usage
docker stats

# Disk usage
docker system df

# Clean up unused resources
docker system prune -a

# Check service health
watch -n 5 'curl -s http://localhost:3000/health | jq'
```

### Getting Help

1. **Check Documentation**: Review `/docs` folder
2. **Review Logs**: `docker compose logs -f`
3. **GitHub Issues**: https://github.com/Ousamma1/Ousamma.Survey/issues
4. **Email Support**: support@ousamma.com
5. **Community Forum**: forum.ousamma.com

---

## Next Steps

1. **Configure AI Services**: See [AI Configuration Guide](../configuration/ai-services.md)
2. **Set Up SSL/TLS**: See [Security Guide](../deployment/security.md)
3. **Configure Backup**: See [Backup Guide](../deployment/backup.md)
4. **Scale Services**: See [Scaling Guide](../deployment/scaling.md)
5. **Monitor System**: See [Monitoring Guide](../deployment/monitoring.md)

---

## Quick Reference

### Common Commands

```bash
# Start services
docker compose up -d

# Stop services
docker compose down

# Restart service
docker compose restart <service-name>

# View logs
docker compose logs -f <service-name>

# Execute command in container
docker compose exec <service-name> <command>

# Scale service
docker compose up -d --scale analytics-service=3

# Update services
docker compose pull
docker compose up -d

# Backup data
docker compose exec mongodb mongodump --out /backup
```

### Port Reference

| Port | Service |
|------|---------|
| 3000 | API Gateway |
| 3001 | Surveyor Service, Geolocation Service |
| 3002 | Analytics Service, WebSocket Service |
| 3003 | Analytics Consumer |
| 3004 | Notification Consumer |
| 3005 | Audit Consumer |
| 3006 | Notification Service |
| 3007 | Admin Service |
| 3008 | WebSocket Service (alternate) |
| 3009 | Project Service |
| 6379 | Redis |
| 9092 | Kafka |
| 27017 | MongoDB |
| 2181 | Zookeeper |
| 5601 | Kibana (if logging enabled) |

---

**Installation Guide Version**: 1.0
**Last Updated**: 2025-11-14
**Ousamma Survey System - Sprint 21**

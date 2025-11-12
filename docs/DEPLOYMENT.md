# Deployment Guide

## Production Deployment

### Prerequisites

- Docker & Docker Compose
- MongoDB cluster or MongoDB Atlas
- Kafka cluster (or managed Kafka service)
- Domain name and SSL certificates
- Reverse proxy (Nginx/Traefik)

### Environment Configuration

1. **Create production environment files**

   For each service, create a `.env` file:

   ```bash
   # API Gateway
   PORT=3000
   NODE_ENV=production
   SURVEY_SERVICE_URL=http://survey-service:3001
   RESPONSE_SERVICE_URL=http://response-service:3002
   TEMPLATE_SERVICE_URL=http://template-service:3003
   FILE_SERVICE_URL=http://file-service:3004
   CORS_ORIGIN=https://yourdomain.com
   LOG_LEVEL=info

   # Survey Service
   PORT=3001
   NODE_ENV=production
   MONGO_URI=mongodb://user:pass@mongo-host:27017/survey_db?authSource=admin&ssl=true
   LOG_LEVEL=warn

   # Response Service
   PORT=3002
   NODE_ENV=production
   MONGO_URI=mongodb://user:pass@mongo-host:27017/response_db?authSource=admin&ssl=true
   KAFKA_BROKERS=kafka-broker-1:9092,kafka-broker-2:9092
   SURVEY_SERVICE_URL=http://survey-service:3001
   LOG_LEVEL=warn

   # Template Service
   PORT=3003
   NODE_ENV=production
   MONGO_URI=mongodb://user:pass@mongo-host:27017/template_db?authSource=admin&ssl=true
   LOG_LEVEL=warn

   # File Service
   PORT=3004
   NODE_ENV=production
   MONGO_URI=mongodb://user:pass@mongo-host:27017/file_db?authSource=admin&ssl=true
   UPLOAD_DIR=/data/uploads
   MAX_FILE_SIZE=10485760
   LOG_LEVEL=warn
   ```

2. **Update docker-compose for production**

   Create `docker-compose.prod.yml`:

   ```yaml
   version: '3.8'

   services:
     survey-service:
       image: your-registry/survey-service:latest
       restart: always
       env_file: services/survey-service/.env

     response-service:
       image: your-registry/response-service:latest
       restart: always
       env_file: services/response-service/.env

     template-service:
       image: your-registry/template-service:latest
       restart: always
       env_file: services/template-service/.env

     file-service:
       image: your-registry/file-service:latest
       restart: always
       env_file: services/file-service/.env
       volumes:
         - /data/uploads:/app/uploads

     api-gateway:
       image: your-registry/api-gateway:latest
       restart: always
       env_file: api-gateway/.env
       ports:
         - "3000:3000"
   ```

### Build and Push Docker Images

```bash
# Build all images
docker-compose build

# Tag images
docker tag survey-service your-registry/survey-service:latest
docker tag response-service your-registry/response-service:latest
docker tag template-service your-registry/template-service:latest
docker tag file-service your-registry/file-service:latest
docker tag api-gateway your-registry/api-gateway:latest

# Push to registry
docker push your-registry/survey-service:latest
docker push your-registry/response-service:latest
docker push your-registry/template-service:latest
docker push your-registry/file-service:latest
docker push your-registry/api-gateway:latest
```

### Deploy with Docker Compose

```bash
# Pull latest images
docker-compose -f docker-compose.prod.yml pull

# Start services
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

### Kubernetes Deployment

1. **Create Kubernetes manifests**

   See `k8s/` directory for example manifests:
   - `deployments/` - Service deployments
   - `services/` - Service definitions
   - `configmaps/` - Configuration
   - `secrets/` - Sensitive data
   - `ingress/` - Ingress rules

2. **Deploy to Kubernetes**

   ```bash
   # Create namespace
   kubectl create namespace survey-platform

   # Apply configurations
   kubectl apply -f k8s/configmaps/
   kubectl apply -f k8s/secrets/
   kubectl apply -f k8s/deployments/
   kubectl apply -f k8s/services/
   kubectl apply -f k8s/ingress/

   # Check deployment
   kubectl get pods -n survey-platform
   kubectl get services -n survey-platform
   ```

### Nginx Reverse Proxy

```nginx
upstream api_gateway {
    server localhost:3000;
}

server {
    listen 80;
    server_name api.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://api_gateway;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Database Setup

#### MongoDB

1. **Create databases and users**

   ```javascript
   use admin;

   db.createUser({
     user: "survey_admin",
     pwd: "secure_password",
     roles: [
       { role: "readWrite", db: "survey_db" },
       { role: "readWrite", db: "response_db" },
       { role: "readWrite", db: "template_db" },
       { role: "readWrite", db: "file_db" }
     ]
   });
   ```

2. **Enable authentication**

   Update MongoDB config:
   ```yaml
   security:
     authorization: enabled
   ```

3. **Set up replica set (recommended)**

   ```bash
   rs.initiate({
     _id: "rs0",
     members: [
       { _id: 0, host: "mongo1:27017" },
       { _id: 1, host: "mongo2:27017" },
       { _id: 2, host: "mongo3:27017" }
     ]
   })
   ```

#### MongoDB Atlas (Managed)

1. Create cluster on MongoDB Atlas
2. Create databases: survey_db, response_db, template_db, file_db
3. Get connection string and update service configs

### Kafka Setup

#### Self-Hosted

```yaml
# docker-compose.kafka.yml
version: '3.8'

services:
  zookeeper:
    image: confluentinc/cp-zookeeper:7.5.0
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000
    volumes:
      - zookeeper_data:/var/lib/zookeeper

  kafka:
    image: confluentinc/cp-kafka:7.5.0
    depends_on:
      - zookeeper
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 3
    volumes:
      - kafka_data:/var/lib/kafka
```

#### Managed Kafka

Use managed services like:
- Confluent Cloud
- AWS MSK (Managed Streaming for Kafka)
- Azure Event Hubs

### Monitoring

#### Health Checks

Set up monitoring for health endpoints:

```bash
# Survey Service
curl http://localhost:3001/health

# Response Service
curl http://localhost:3002/health

# Template Service
curl http://localhost:3003/health

# File Service
curl http://localhost:3004/health

# API Gateway
curl http://localhost:3000/health
```

#### Logging

Centralized logging with ELK Stack:

1. **Deploy Elasticsearch, Logstash, Kibana**
2. **Configure log shipping**
3. **Set up dashboards**

#### Metrics

Use Prometheus + Grafana:

1. **Add Prometheus metrics to services**
2. **Configure Prometheus scraping**
3. **Create Grafana dashboards**

### Backup Strategy

#### MongoDB Backups

```bash
# Automated backup script
#!/bin/bash

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/mongodb"

mongodump --uri="mongodb://user:pass@host:27017" \
  --out="${BACKUP_DIR}/${DATE}"

# Compress backup
tar -czf "${BACKUP_DIR}/${DATE}.tar.gz" "${BACKUP_DIR}/${DATE}"
rm -rf "${BACKUP_DIR}/${DATE}"

# Delete backups older than 30 days
find "${BACKUP_DIR}" -name "*.tar.gz" -mtime +30 -delete
```

#### File Backups

```bash
# Rsync uploads directory
rsync -avz /data/uploads/ backup-server:/backups/uploads/
```

### Scaling

#### Horizontal Scaling

Scale services independently:

```bash
# Docker Compose
docker-compose up -d --scale survey-service=3 --scale response-service=3

# Kubernetes
kubectl scale deployment survey-service --replicas=3 -n survey-platform
```

#### Load Balancing

Use Nginx or cloud load balancers to distribute traffic.

### Security Checklist

- [ ] Use HTTPS/TLS
- [ ] Enable MongoDB authentication
- [ ] Use strong passwords
- [ ] Implement rate limiting
- [ ] Enable CORS with specific origins
- [ ] Validate all inputs
- [ ] Keep dependencies updated
- [ ] Use secrets management
- [ ] Enable firewall rules
- [ ] Regular security audits
- [ ] Implement logging and monitoring
- [ ] Set up automated backups

### Rollback Strategy

```bash
# Docker Compose
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --no-deps service-name

# Kubernetes
kubectl rollout undo deployment/survey-service -n survey-platform
```

### CI/CD Pipeline

Example GitHub Actions workflow:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Build images
        run: docker-compose build

      - name: Push to registry
        run: |
          echo ${{ secrets.DOCKER_PASSWORD }} | docker login -u ${{ secrets.DOCKER_USERNAME }} --password-stdin
          docker-compose push

      - name: Deploy
        run: |
          ssh user@server 'cd /app && docker-compose pull && docker-compose up -d'
```

### Post-Deployment

1. **Seed template data**
   ```bash
   docker exec template-service npm run seed
   ```

2. **Verify all services**
   ```bash
   curl http://api.yourdomain.com/health
   ```

3. **Monitor logs**
   ```bash
   docker-compose logs -f
   ```

4. **Set up alerts**
   - Service downtime
   - High error rates
   - Disk space
   - Memory usage

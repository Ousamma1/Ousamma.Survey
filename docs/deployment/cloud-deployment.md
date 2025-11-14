# Cloud Deployment Guide

Deploy Ousamma Survey System to AWS, Azure, or Google Cloud Platform.

## AWS Deployment

### Architecture

```
Route 53 (DNS)
    ↓
Application Load Balancer
    ↓
ECS Fargate Cluster
├── API Gateway (3 tasks)
├── Survey Service (2 tasks)
├── Analytics Service (3 tasks)
├── WebSocket Service (2 tasks)
└── Other Services (1-2 tasks each)
    ↓
├── DocumentDB (MongoDB compatible)
├── ElastiCache (Redis)
├── MSK (Managed Kafka)
├── S3 (File storage)
└── CloudWatch (Monitoring)
```

### Prerequisites

```bash
# Install AWS CLI
pip install awscli

# Configure credentials
aws configure
# AWS Access Key ID: AKIA...
# AWS Secret Access Key: ...
# Default region: us-east-1
# Output format: json
```

### Step 1: VPC Setup

```bash
# Create VPC
aws ec2 create-vpc --cidr-block 10.0.0.0/16 --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=survey-vpc}]'

# Create subnets (public and private)
aws ec2 create-subnet --vpc-id vpc-xxx --cidr-block 10.0.1.0/24 --availability-zone us-east-1a
aws ec2 create-subnet --vpc-id vpc-xxx --cidr-block 10.0.2.0/24 --availability-zone us-east-1b

# Create Internet Gateway
aws ec2 create-internet-gateway
aws ec2 attach-internet-gateway --vpc-id vpc-xxx --internet-gateway-id igw-xxx
```

### Step 2: DocumentDB (MongoDB)

```bash
# Create DocumentDB cluster
aws docdb create-db-cluster \
  --db-cluster-identifier survey-docdb \
  --engine docdb \
  --master-username admin \
  --master-user-password SecurePass123! \
  --vpc-security-group-ids sg-xxx \
  --db-subnet-group-name survey-subnet-group

# Create instance
aws docdb create-db-instance \
  --db-instance-identifier survey-docdb-instance \
  --db-instance-class db.r5.large \
  --engine docdb \
  --db-cluster-identifier survey-docdb
```

### Step 3: ElastiCache (Redis)

```bash
# Create Redis cluster
aws elasticache create-replication-group \
  --replication-group-id survey-redis \
  --replication-group-description "Survey System Redis" \
  --engine redis \
  --cache-node-type cache.r5.large \
  --num-cache-clusters 3 \
  --automatic-failover-enabled
```

### Step 4: MSK (Managed Kafka)

```bash
# Create Kafka cluster
aws kafka create-cluster \
  --cluster-name survey-kafka \
  --kafka-version 2.8.1 \
  --broker-node-group-info file://broker-config.json \
  --encryption-info file://encryption-config.json
```

### Step 5: ECS Fargate Deployment

**Create task definition** (`task-definition.json`):

```json
{
  "family": "survey-api-gateway",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "containerDefinitions": [
    {
      "name": "api-gateway",
      "image": "123456789.dkr.ecr.us-east-1.amazonaws.com/survey-api:latest",
      "portMappings": [{"containerPort": 3000, "protocol": "tcp"}],
      "environment": [
        {"name": "NODE_ENV", "value": "production"},
        {"name": "PORT", "value": "3000"}
      ],
      "secrets": [
        {"name": "MONGODB_URI", "valueFrom": "arn:aws:secretsmanager:..."},
        {"name": "JWT_SECRET", "valueFrom": "arn:aws:secretsmanager:..."}
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/survey-api",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

**Deploy to ECS:**

```bash
# Register task definition
aws ecs register-task-definition --cli-input-json file://task-definition.json

# Create ECS cluster
aws ecs create-cluster --cluster-name survey-cluster

# Create service
aws ecs create-service \
  --cluster survey-cluster \
  --service-name api-gateway-service \
  --task-definition survey-api-gateway \
  --desired-count 3 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx,subnet-yyy],securityGroups=[sg-xxx],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=arn:aws:elasticloadbalancing:...,containerName=api-gateway,containerPort=3000"
```

### Step 6: Application Load Balancer

```bash
# Create ALB
aws elbv2 create-load-balancer \
  --name survey-alb \
  --subnets subnet-xxx subnet-yyy \
  --security-groups sg-xxx

# Create target group
aws elbv2 create-target-group \
  --name survey-targets \
  --protocol HTTP \
  --port 3000 \
  --vpc-id vpc-xxx \
  --health-check-path /health

# Create listener
aws elbv2 create-listener \
  --load-balancer-arn arn:aws:elasticloadbalancing:... \
  --protocol HTTPS \
  --port 443 \
  --certificates CertificateArn=arn:aws:acm:... \
  --default-actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:...
```

### Cost Estimate (Monthly)

| Service | Configuration | Cost |
|---------|--------------|------|
| ECS Fargate | 15 tasks, 1vCPU, 2GB each | $550 |
| DocumentDB | db.r5.large (2 instances) | $600 |
| ElastiCache | cache.r5.large (3 nodes) | $450 |
| MSK | kafka.m5.large (3 brokers) | $450 |
| ALB | 100 GB processed | $25 |
| S3 | 500 GB storage | $12 |
| CloudWatch | Logs & metrics | $30 |
| **Total** | | **~$2,117/month** |

---

## Azure Deployment

### Architecture

```
Azure Front Door
    ↓
Azure Kubernetes Service (AKS)
├── API Gateway (3 pods)
├── Survey Service (2 pods)
├── Analytics Service (3 pods)
└── Other Services
    ↓
├── Cosmos DB (MongoDB API)
├── Azure Cache for Redis
├── Event Hubs (Kafka compatible)
└── Azure Monitor
```

### Step 1: Create AKS Cluster

```bash
# Login to Azure
az login

# Create resource group
az group create --name survey-rg --location eastus

# Create AKS cluster
az aks create \
  --resource-group survey-rg \
  --name survey-aks \
  --node-count 3 \
  --node-vm-size Standard_D4s_v3 \
  --enable-managed-identity \
  --generate-ssh-keys

# Get credentials
az aks get-credentials --resource-group survey-rg --name survey-aks
```

### Step 2: Cosmos DB

```bash
# Create Cosmos DB account (MongoDB API)
az cosmosdb create \
  --name survey-cosmosdb \
  --resource-group survey-rg \
  --kind MongoDB \
  --server-version 4.2

# Create database
az cosmosdb mongodb database create \
  --account-name survey-cosmosdb \
  --resource-group survey-rg \
  --name survey_db
```

### Step 3: Azure Cache for Redis

```bash
# Create Redis cache
az redis create \
  --name survey-redis \
  --resource-group survey-rg \
  --location eastus \
  --sku Premium \
  --vm-size P1
```

### Step 4: Deploy to AKS

**Kubernetes manifests** (`k8s/deployment.yaml`):

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-gateway
  template:
    metadata:
      labels:
        app: api-gateway
    spec:
      containers:
      - name: api-gateway
        image: surveyacr.azurecr.io/api-gateway:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: MONGODB_URI
          valueFrom:
            secretKeyRef:
              name: survey-secrets
              key: mongodb-uri
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
---
apiVersion: v1
kind: Service
metadata:
  name: api-gateway-service
spec:
  type: LoadBalancer
  selector:
    app: api-gateway
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
```

**Deploy:**

```bash
# Apply configurations
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml

# Check status
kubectl get pods
kubectl get services
```

---

## Google Cloud Platform (GCP)

### Architecture

```
Cloud Load Balancing
    ↓
Google Kubernetes Engine (GKE)
├── Microservices (Pods)
    ↓
├── Cloud SQL (PostgreSQL) or MongoDB Atlas
├── Memorystore (Redis)
├── Pub/Sub (Message Queue)
└── Cloud Monitoring
```

### Step 1: Create GKE Cluster

```bash
# Set project
gcloud config set project survey-project-id

# Create cluster
gcloud container clusters create survey-cluster \
  --zone us-central1-a \
  --num-nodes 3 \
  --machine-type n1-standard-4 \
  --enable-autoscaling \
  --min-nodes 3 \
  --max-nodes 10

# Get credentials
gcloud container clusters get-credentials survey-cluster --zone us-central1-a
```

### Step 2: Cloud SQL (or use MongoDB Atlas)

```bash
# Create Cloud SQL instance
gcloud sql instances create survey-db \
  --database-version=POSTGRES_14 \
  --tier=db-n1-standard-2 \
  --region=us-central1
```

### Step 3: Memorystore (Redis)

```bash
# Create Redis instance
gcloud redis instances create survey-redis \
  --size=5 \
  --region=us-central1 \
  --tier=standard
```

---

## On-Premise Deployment

### Server Requirements

**Production Setup (3-server cluster):**

```
Load Balancer (1 server):
├── Nginx or HAProxy
├── CPU: 4 cores
├── RAM: 8 GB
└── Disk: 50 GB

Application Servers (2 servers):
├── Docker Swarm or Kubernetes
├── All microservices
├── CPU: 16 cores each
├── RAM: 32 GB each
└── Disk: 200 GB SSD each

Database Server (1 server):
├── MongoDB replica set
├── Redis
├── Kafka + Zookeeper
├── CPU: 8 cores
├── RAM: 32 GB
└── Disk: 500 GB SSD (RAID 10)
```

### Docker Swarm Deployment

**Initialize swarm:**

```bash
# On manager node
docker swarm init --advertise-addr 192.168.1.10

# On worker nodes
docker swarm join --token SWMTKN-xxx 192.168.1.10:2377
```

**Deploy stack:**

```bash
# Create overlay network
docker network create -d overlay survey-network

# Deploy stack
docker stack deploy -c docker-compose.production.yml survey

# Check services
docker service ls
docker service ps survey_api
```

### Kubernetes Deployment (On-Premise)

**Using kubeadm:**

```bash
# On all nodes
sudo apt-get update
sudo apt-get install -y kubelet kubeadm kubectl

# On master
sudo kubeadm init --pod-network-cidr=10.244.0.0/16

# Deploy CNI plugin (Flannel)
kubectl apply -f https://raw.githubusercontent.com/flannel-io/flannel/master/Documentation/kube-flannel.yml

# Join worker nodes
sudo kubeadm join <master-ip>:6443 --token xxx --discovery-token-ca-cert-hash sha256:xxx
```

---

## SSL/TLS Configuration

### Using Let's Encrypt (Free)

```bash
# Install Certbot
sudo apt-get install certbot

# Generate certificate
sudo certbot certonly --standalone -d survey.yourcompany.com

# Certificates stored in:
# /etc/letsencrypt/live/survey.yourcompany.com/
```

### Nginx Configuration

```nginx
server {
    listen 443 ssl http2;
    server_name survey.yourcompany.com;

    ssl_certificate /etc/letsencrypt/live/survey.yourcompany.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/survey.yourcompany.com/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket support
    location /ws {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name survey.yourcompany.com;
    return 301 https://$server_name$request_uri;
}
```

---

## Scaling Guide

### Horizontal Scaling

**Docker Compose:**
```bash
# Scale specific service
docker-compose up -d --scale analytics-service=3

# Check running containers
docker-compose ps
```

**Kubernetes:**
```bash
# Scale deployment
kubectl scale deployment api-gateway --replicas=5

# Autoscaling
kubectl autoscale deployment api-gateway --min=3 --max=10 --cpu-percent=70
```

### Vertical Scaling

**Increase resources in docker-compose.production.yml:**

```yaml
services:
  api:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 4G
        reservations:
          cpus: '1.0'
          memory: 2G
```

### Database Scaling

**MongoDB Sharding:**

```bash
# Enable sharding
mongosh
sh.enableSharding("survey_db")
sh.shardCollection("survey_db.responses", {"surveyId": "hashed"})
```

**Redis Cluster:**

```bash
# Create Redis cluster
redis-cli --cluster create \
  192.168.1.11:6379 \
  192.168.1.12:6379 \
  192.168.1.13:6379 \
  --cluster-replicas 1
```

---

## Monitoring Setup

### Prometheus + Grafana

```yaml
# docker-compose.monitoring.yml
version: '3.8'
services:
  prometheus:
    image: prom/prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana
    volumes:
      - grafana-data:/var/lib/grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin123

  node-exporter:
    image: prom/node-exporter
    ports:
      - "9100:9100"
```

### Prometheus Configuration

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'survey-api'
    static_configs:
      - targets: ['api:3000']

  - job_name: 'node'
    static_configs:
      - targets: ['node-exporter:9100']

  - job_name: 'mongodb'
    static_configs:
      - targets: ['mongodb-exporter:9216']
```

---

## Backup Strategy

### Automated Backups

```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"

# MongoDB backup
docker exec mongodb mongodump --out /backup/mongo_$DATE

# Redis backup
docker exec redis redis-cli SAVE
docker cp redis:/data/dump.rdb $BACKUP_DIR/redis_$DATE.rdb

# Upload to S3 (or cloud storage)
aws s3 sync $BACKUP_DIR s3://survey-backups/

# Cleanup old backups (keep 30 days)
find $BACKUP_DIR -mtime +30 -delete
```

**Schedule with cron:**

```bash
# Crontab entry (daily at 2 AM)
0 2 * * * /opt/survey/scripts/backup.sh
```

---

## Disaster Recovery

### Recovery Procedures

**1. Database Recovery:**

```bash
# Restore MongoDB
docker exec -i mongodb mongorestore /backup/mongo_20240115_020000

# Restore Redis
docker cp redis_20240115.rdb redis:/data/dump.rdb
docker restart redis
```

**2. Full System Recovery:**

```bash
# Stop all services
docker-compose down

# Restore data volumes
docker run --rm -v survey_mongodb_data:/data -v /backup:/backup ubuntu \
  bash -c "cd /data && tar xvf /backup/mongodb-data.tar"

# Restart services
docker-compose up -d

# Verify health
curl http://localhost:3000/health
```

---

**Deployment Guide Version**: 1.0
**Last Updated**: 2025-11-14

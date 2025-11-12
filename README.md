# Mr. Daisy 2.0 - Microservices Survey Platform

A modern, scalable survey platform built with microservices architecture, featuring API Gateway, service mesh, MongoDB, and Redis.

## 🏗️ Architecture Overview

### Sprint 1: Core Infrastructure & Microservices Foundation

This implementation includes the foundational microservices:

- **API Gateway** - Entry point for all requests with routing, rate limiting, and CORS
- **Auth Service** - Authentication & authorization with JWT and RBAC
- **User Service** - User management with CRUD operations
- **Config Service** - Centralized configuration and feature flags

### Technology Stack

- **Runtime**: Node.js 20 with TypeScript
- **Framework**: Express.js
- **Databases**: MongoDB 7, Redis
- **Container**: Docker & Docker Compose
- **API Gateway**: Custom implementation with http-proxy-middleware
- **Authentication**: JWT with bcrypt password hashing
- **Logging**: Winston
- **Validation**: Joi

## 📁 Project Structure

```
mr-daisy-2.0/
├── services/
│   ├── api-gateway/          # API Gateway service
│   ├── auth-service/         # Authentication service
│   ├── user-service/         # User management service
│   ├── config-service/       # Configuration service
│   ├── survey-service/       # Survey management (future)
│   ├── response-service/     # Response handling (future)
│   ├── analytics-service/    # Analytics & reporting (future)
│   ├── ai-service/           # AI features (future)
│   ├── geolocation-service/  # Geolocation (future)
│   ├── notification-service/ # Notifications (future)
│   └── file-service/         # File management (future)
├── frontend/                 # Frontend application (future)
├── shared/                   # Shared utilities and types
│   ├── utils/               # Common utilities
│   ├── types/               # TypeScript type definitions
│   └── proto/               # Protocol buffers (gRPC)
├── docker-compose.yml        # Development environment
├── docker-compose.prod.yml   # Production environment
└── package.json             # Root package manager

```

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 20+ (for local development)
- Git

### 1. Clone the Repository

```bash
git clone <repository-url>
cd mr-daisy-2.0
```

### 2. Start Development Environment

```bash
# Build and start all services
npm start

# Or using docker-compose directly
docker-compose up --build
```

### 3. Verify Services

All services should be running on the following ports:

- **API Gateway**: http://localhost:3000
- **Auth Service**: http://localhost:3001
- **User Service**: http://localhost:3002
- **Config Service**: http://localhost:3003
- **MongoDB**: localhost:27017
- **Redis**: localhost:6379

### 4. Health Checks

```bash
# API Gateway health
curl http://localhost:3000/health

# Auth Service health
curl http://localhost:3001/health

# User Service health
curl http://localhost:3002/health

# Config Service health
curl http://localhost:3003/health

# Aggregated health check (all services)
curl http://localhost:3000/health/all
```

## 📝 API Documentation

### API Gateway Endpoints

The API Gateway routes all requests to the appropriate microservices:

#### Authentication Routes (via Auth Service)
- `POST /v1/api/auth/register` - Register new user
- `POST /v1/api/auth/login` - Login user
- `POST /v1/api/auth/refresh` - Refresh access token
- `POST /v1/api/auth/logout` - Logout user
- `POST /v1/api/auth/verify` - Verify JWT token
- `POST /v1/api/auth/verify-email` - Verify email
- `POST /v1/api/auth/password-reset/request` - Request password reset
- `POST /v1/api/auth/password-reset/confirm` - Confirm password reset

#### User Routes (via User Service)
- `GET /v1/api/users` - List all users (paginated)
- `GET /v1/api/users/:userId` - Get user profile
- `POST /v1/api/users` - Create user profile
- `PUT /v1/api/users/:userId` - Update user profile
- `DELETE /v1/api/users/:userId` - Delete user profile

#### Config Routes (via Config Service)
- `GET /v1/api/config` - Get all configurations
- `GET /v1/api/config/:key` - Get specific config
- `POST /v1/api/config` - Create configuration
- `PUT /v1/api/config/:key` - Update configuration
- `DELETE /v1/api/config/:key` - Delete configuration
- `GET /v1/api/feature-flags` - Get all feature flags
- `GET /v1/api/feature-flags/:name` - Get specific feature flag
- `POST /v1/api/feature-flags` - Create feature flag
- `PUT /v1/api/feature-flags/:name` - Update feature flag

### Example: User Registration

```bash
curl -X POST http://localhost:3000/v1/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

### Example: User Login

```bash
curl -X POST http://localhost:3000/v1/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!"
  }'
```

## 🔧 Development

### Local Development (without Docker)

1. **Install dependencies for all services:**

```bash
npm run install:all
```

2. **Start MongoDB and Redis:**

```bash
docker-compose up mongodb redis
```

3. **Run services individually:**

```bash
# Terminal 1 - Auth Service
npm run dev:auth

# Terminal 2 - User Service
npm run dev:user

# Terminal 3 - Config Service
npm run dev:config

# Terminal 4 - API Gateway
npm run dev:gateway
```

### Environment Variables

Each service has its own `.env.example` file. Copy them to `.env` and configure:

```bash
# For each service
cd services/api-gateway
cp .env.example .env

cd ../auth-service
cp .env.example .env

# etc...
```

### Building Services

```bash
# Build all services
npm run build:all

# Build specific service
npm run build:gateway
npm run build:auth
npm run build:user
npm run build:config
```

## 🐳 Docker Commands

### Development

```bash
# Start all services
npm start

# Start in detached mode
docker-compose up -d

# View logs
npm run logs

# View specific service logs
npm run logs:gateway
npm run logs:auth

# Stop all services
npm stop

# Remove all containers and volumes
npm run clean
```

### Production

```bash
# Create .env file with production values
cp .env.example .env

# Build and start production services
npm run start:prod

# Stop production services
npm run stop:prod

# Clean production environment
npm run clean:prod
```

## 🔐 Security Features

- **JWT Authentication** with access and refresh tokens
- **Password Hashing** using bcrypt (10 rounds in dev, 12 in prod)
- **Rate Limiting** on all endpoints (100 requests per 15 minutes)
- **Stricter Rate Limiting** on auth endpoints (5 attempts per 15 minutes)
- **CORS** configuration with allowed origins
- **Helmet.js** for security headers
- **Input Validation** using Joi schemas
- **Role-Based Access Control (RBAC)** with permissions

## 📊 Monitoring & Health Checks

### Individual Service Health

Each service exposes a `/health` endpoint:

```json
{
  "success": true,
  "data": {
    "service": "auth-service",
    "status": "healthy",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "uptime": 3600,
    "version": "1.0.0"
  }
}
```

### Aggregated Health Check

The API Gateway provides an aggregated health check at `/health/all`:

```bash
curl http://localhost:3000/health/all
```

## 🧪 Testing

### Manual Testing with curl

```bash
# Register a user
curl -X POST http://localhost:3000/v1/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!","firstName":"Test","lastName":"User"}'

# Login
curl -X POST http://localhost:3000/v1/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}'

# Use the access token from login response
TOKEN="<access-token-from-login>"

# Get user profile
curl http://localhost:3000/v1/api/users/<user-id> \
  -H "Authorization: Bearer $TOKEN"
```

## 🛠️ Troubleshooting

### Services won't start

1. Check Docker is running: `docker ps`
2. Check logs: `docker-compose logs`
3. Ensure ports are not in use: `lsof -i :3000,3001,3002,3003`

### MongoDB connection issues

1. Check MongoDB is running: `docker-compose ps mongodb`
2. Check MongoDB logs: `docker-compose logs mongodb`
3. Verify connection string in environment variables

### Redis connection issues

1. Check Redis is running: `docker-compose ps redis`
2. Test Redis: `docker-compose exec redis redis-cli ping`

## 🚧 Roadmap

### Sprint 2: Survey & Response Services
- Survey creation and management
- Response collection and validation
- Survey templates

### Sprint 3: Analytics & AI
- Real-time analytics
- AI-powered insights
- Data visualization

### Sprint 4: Advanced Features
- Geolocation services
- Notification system
- File management
- Frontend application

## 📄 License

MIT

## 👥 Contributing

Contributions are welcome! Please read the contributing guidelines first.

## 📞 Support

For issues and questions, please open an issue on GitHub.

# Ousamma Survey Platform - Codebase Structure & Architecture Analysis

## Executive Summary

The Ousamma Survey Platform is a comprehensive microservices-based AI-powered survey application with the following characteristics:

- **Total Services:** 11+ microservices
- **Database:** MongoDB
- **Caching:** Redis
- **Message Queue:** Kafka + Zookeeper
- **Architecture Pattern:** Event-driven microservices
- **Authentication Status:** Incomplete (mostly missing)
- **Authorization Status:** Role-based but not enforced
- **Current Security Score:** 4.5/10

---

## 1. PROJECT DIRECTORY STRUCTURE

### Root Level Structure
```
/home/user/Ousamma.Survey/
├── index.js                          # Main API server (Port 3000)
├── package.json                      # Root dependencies
├── .env.example                      # Environment configuration template
├── docker-compose.yml               # Docker services orchestration
├── Dockerfile                        # Main app Docker image
├── kafka-init.sh                    # Kafka topic initialization
├── README.md                         # Project documentation
├── PERFORMANCE_OPTIMIZATION.md      # Sprint 17 performance work
├── SURVEY_IMPLEMENTATION_ANALYSIS.md # Detailed implementation review
├── SURVEY_QUICK_REFERENCE.md        # Quick reference guide
├── SECURITY_AUDIT_SPRINT_019.md     # This security audit
├── public/                           # Static files & frontend
├── surveyor-service/                # Surveyor management service
├── services/                         # Microservices directory
└── uploads/                          # User-uploaded files
```

---

## 2. MAIN SERVICES BREAKDOWN

### 2.1 Main API Server (Port 3000)
**File:** `/home/user/Ousamma.Survey/index.js`

**Purpose:** Central API gateway, AI integration, survey management, file uploads

**Key Routes:**
- `POST /api/ai/*` - AI endpoints (10+ endpoints)
- `POST/GET /api/surveys` - Survey management
- `POST/GET /api/responses` - Response handling
- `POST/GET /api/context` - File management
- WebSocket server on `/ws`

**Infrastructure:**
- Express.js server
- Redis caching with TTL strategies
- WebSocket support (ws library)
- Multer file upload handling
- Compression middleware

**Security Status:** ⚠️ CRITICAL - No authentication, no rate limiting, no input validation

**Dependencies:**
```json
{
  "express": "^4.18.2",
  "cors": "^2.8.5",
  "multer": "^1.4.5-lts.1",
  "dotenv": "^16.0.3",
  "ws": "^8.14.2",
  "redis": "^4.6.7",
  "compression": "^1.7.4"
}
```

---

### 2.2 Surveyor Service (Port 3001)
**Location:** `/home/user/Ousamma.Survey/surveyor-service/`

**Purpose:** Surveyor management, assignments, activity tracking

**Directory Structure:**
```
surveyor-service/
├── index.js                         # Express app setup
├── package.json                     # Dependencies (bcryptjs, jwt, validator)
├── .env.example                     # Configuration template
├── database/
│   └── connection.js               # MongoDB connection management
├── middleware/
│   ├── auth.js                     # Auth middleware (PLACEHOLDER)
│   └── validation.js               # Input validation middleware
├── models/
│   ├── Surveyor.js                 # Surveyor schema with bcrypt
│   ├── Assignment.js               # Assignment tracking
│   └── Activity.js                 # Activity/audit logs
├── controllers/
│   ├── surveyorController.js       # Surveyor CRUD operations
│   ├── assignmentController.js     # Assignment management
│   └── activityController.js       # Activity tracking
└── routes/
    ├── surveyors.js                # Surveyor endpoints
    ├── assignments.js              # Assignment endpoints
    └── activities.js               # Activity endpoints
```

**Key Features:**
- Temporary password generation with random charset
- Bcryptjs password hashing (10 salt rounds)
- Account expiration tracking
- UUID-based IDs
- Comprehensive activity logging
- Status-based filtering (active/inactive/expired)

**Security Status:** ⚠️ HIGH - Placeholder auth, no real JWT validation

**Important Models:**
1. **Surveyor Schema:**
   - `id` (UUID, unique, indexed)
   - `email` (unique, lowercase)
   - `temporaryPassword` (hashed)
   - `hasChangedPassword` (boolean)
   - `expirationDate` (indexed)
   - `status` (enum: active/inactive/expired)
   - `lastLoginAt` (audit trail)
   - Account fields: name, phone, region, languages

2. **Assignment Schema:**
   - Target & achieved response tracking
   - Status enum: pending/active/completed/cancelled
   - Virtual fields: progressPercentage, remainingResponses, isOverdue
   - Methods: incrementResponses(), cancel(), activate()

3. **Activity Schema:**
   - Activity types: login, logout, location_checkin, response_submission, survey_view, etc.
   - Location tracking: latitude, longitude, accuracy, address
   - Device info: userAgent, platform, browser, os, ipAddress
   - Session tracking with duration
   - Aggregation methods for daily summaries

---

### 2.3 Survey Service (Port 3004)
**Location:** `/home/user/Ousamma.Survey/services/survey-service/`

**Purpose:** Advanced survey features, conditional logic, multi-language, distribution

**Structure:**
```
survey-service/
├── index.js                 # Express app
├── package.json             # Dependencies
├── models/
│   └── Survey.js           # Advanced survey model
├── controllers/
│   └── surveyController.js
└── routes/
    └── surveys.js
```

**Technologies:**
- qrcode - QR code generation
- sharp - Image processing
- multer - File uploads
- Morgan - Request logging

**Security Status:** ❌ CRITICAL - No authentication, completely open

---

### 2.4 Analytics Service (Port 3002)
**Location:** `/home/user/Ousamma.Survey/services/analytics-service/`

**Purpose:** Real-time survey analytics, response analysis, trend detection

**Key Components:**
- Response aggregation
- Completion rate calculation
- Drop-off point identification
- Demographics analysis
- Location distribution analysis
- Device distribution tracking
- Time-based trends (hourly, daily, weekly)
- Cache warming strategies

**Kafka Integration:**
- Consumer group: `analytics-consumer-group`
- Topics: `response.submitted`, `survey.created`, `survey.updated`
- Batch processing with configurable size & timeout

**Security Status:** ❌ CRITICAL - No authentication

---

### 2.5 Admin Service (Port 3007)
**Location:** `/home/user/Ousamma.Survey/services/admin-service/`

**Purpose:** System management, user administration, health monitoring, audit logging

**Directory Structure:**
```
admin-service/
├── index.js                 # Express app (startup & health checks)
├── package.json
├── middleware/
│   ├── auth.js             # WEAK: Header-based auth
│   ├── validation.js       # Input validation
│   └── requestLogger.js    # Request logging
├── models/
│   ├── User.js             # User schema with roles & permissions
│   ├── SystemSettings.js   # System configuration
│   └── SystemHealth.js     # Health metrics
├── controllers/
│   ├── userController.js          # User management
│   ├── auditController.js         # Audit trail
│   ├── settingsController.js      # System settings
│   ├── healthController.js        # Health status
│   ├── statsController.js         # System statistics
│   └── backupController.js        # Backup operations
├── services/
│   ├── monitoringService.js       # Health monitoring
│   └── backupService.js           # Backup functionality
├── config/
│   ├── database.js                # MongoDB config
│   ├── kafka.js                   # Kafka config
│   ├── redis.js                   # Redis config
│   └── logger.js                  # Logging config
└── routes/
    └── index.js                   # Route definitions
```

**User Model Features:**
- Roles: superadmin, admin, manager, surveyor, viewer
- Granular permissions system
- Account lockout tracking (failedLoginAttempts, accountLockedUntil)
- Login audit trail (lastLogin, loginCount)
- User statistics aggregation
- Status enum: active/inactive/suspended/pending

**Health Monitoring:**
- Service health checks
- Periodic health check runner
- Database connectivity monitoring
- Cache monitoring
- Resource utilization tracking

**Security Status:** 🔴 CRITICAL - Header-based auth, no JWT, no rate limiting

---

### 2.6 WebSocket Service (Port 3002)
**Location:** `/home/user/Ousamma.Survey/services/websocket-service/`

**Purpose:** Real-time updates, Socket.io communication, live notifications

**Key Features:**
- JWT token validation (best implementation!)
- Rate limiting for messages and connections
- Role-based access control (admin > manager > user > guest)
- Connection pool management
- Namespace support for different event types

**Authentication Implementation:**
```javascript
// JWT validation on connection
const socketAuth = (socket, next) => {
  const token = socket.handshake.auth.token || socket.handshake.query.token;
  
  if (!token) {
    socket.user = { id: `anonymous_${socket.id}`, isAnonymous: true };
  } else {
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      isAnonymous: false
    };
  }
  next();
};
```

**Rate Limiting:**
- Message limit: 100 per 60 seconds
- Connection limit: 10 per IP per 60 seconds
- Block duration: 60 seconds for messages, 300 seconds for connections

**Security Status:** ✓ GOOD - Only service with proper JWT validation

---

### 2.7 Notification Service
**Location:** `/home/user/Ousamma.Survey/services/notification-service/`

**Purpose:** Multi-channel notifications (Email, SMS, Push)

**Security Features:**
- **Helmet.js** for security headers
- **express-rate-limit** for rate limiting
- Request validation
- Error handling with generic messages

**Channels Supported:**
- SMTP Email (Gmail, custom)
- Twilio SMS
- FCM (Firebase Cloud Messaging)
- Web Push (VAPID)
- Console (development)

**Security Status:** ⚠️ PARTIAL - Has rate limiting & helmet, but no auth on endpoints

---

### 2.8 Geolocation Service (Port 3001)
**Location:** `/home/user/Ousamma.Survey/services/geolocation-service/`

**Purpose:** Location-based features, geocoding, reverse geocoding

**Integration:**
- OpenStreetMap geocoding
- Location accuracy tracking
- Location history management
- Boundary/territory validation

**Security Status:** ❌ No authentication

---

### 2.9 Project Service (Port 3006)
**Location:** `/home/user/Ousamma.Survey/services/project-service/`

**Purpose:** Project management, survey grouping, permission management

**Features:**
- Project ownership & membership management
- Role-based permissions (owner/admin/editor/viewer)
- Survey group management
- Access control implementation
- Member invitation system

**Security Status:** ⚠️ No auth enforcement

---

### 2.10 Analytics Consumer Service
**Location:** `/home/user/Ousamma.Survey/services/analytics-consumer-service/`

**Purpose:** Kafka consumer for analytics events

**Integration:**
- Consumes response.submitted events
- Processes survey.created events
- Updates survey.updated events
- Aggregates metrics
- Batch processing

**Security Status:** Internal service only

---

### 2.11 Audit Consumer Service
**Location:** `/home/user/Ousamma.Survey/services/audit-consumer-service/`

**Purpose:** Audit trail collection, compliance logging

**Features:**
- Event sourcing for audit trail
- Compliance log aggregation
- Event schema validation
- Kafka integration

**Security Status:** Internal service only

---

### 2.12 Notification Consumer Service
**Location:** `/home/user/Ousamma.Survey/services/notification-consumer-service/`

**Purpose:** Consumes notification events from Kafka

**Integration:**
- Listens for notification.requested events
- Routes to appropriate channels
- Handles retry logic
- Tracks delivery status

**Security Status:** Internal service only

---

## 3. SHARED SERVICES & UTILITIES

### 3.1 Redis Cache Manager
**Location:** `/home/user/Ousamma.Survey/services/shared/cache/redis-cache.js`

**Features:**
- Namespace management (survey, analytics, geolocation, etc.)
- TTL strategies (short: 60s, medium: 300s, long: 3600s, etc.)
- Cache-aside pattern
- Cache warming
- Event-driven invalidation
- Batch operations (mget, mset)
- Pattern-based deletion
- Memory optimization
- Graceful degradation on Redis failure

**Performance Impact:**
- Expected cache hit rate: 70-80%
- Response time reduction: 50-90% for cached endpoints
- Database load reduction: 60-80%

### 3.2 Cache Middleware
**Location:** `/home/user/Ousamma.Survey/services/shared/cache/cache-middleware.js`

**Middlewares:**
1. `cacheMiddleware(ttl, options)` - Automatic GET response caching
2. `invalidateMiddleware(options)` - Cache invalidation on mutations
3. `etagMiddleware()` - HTTP caching with ETags
4. `warmCaches(strategies)` - Preload frequently accessed data
5. `getCacheStats()` - Cache statistics endpoint
6. `clearCache()` - Cache clearing endpoint
7. `compressionMiddleware()` - Response compression

### 3.3 Kafka Configuration
**Location:** `/home/user/Ousamma.Survey/services/shared/kafka/`

**Features:**
- Producer/Consumer patterns
- Schema validation
- Error handling
- Batch processing
- Topic management
- Consumer group coordination

### 3.4 Database Configuration
**Location:** `/home/user/Ousamma.Survey/services/shared/database/`

**Features:**
- MongoDB connection pooling
- Mongoose integration
- Connection lifecycle management

---

## 4. FRONTEND & PUBLIC FILES

### 4.1 Static Files
**Location:** `/home/user/Ousamma.Survey/public/`

```
public/
├── index.html                    # Landing page
├── survey-builder.html           # Survey creation interface
├── dubaisurvey.html             # Survey form
├── thankyou.html                # Thank you page
├── surveyor-login.html          # Surveyor portal login
├── surveyor-dashboard.html      # Surveyor dashboard
├── admin-surveyors.html         # Admin surveyor management
├── admin-performance.html       # Performance analytics
├── admin-dashboard.html         # Admin dashboard
├── DESIGN_SYSTEM.md             # Design system documentation
├── css/
│   ├── design-system.css       # Design tokens
│   ├── design-tokens.css       # CSS variables
│   └── components.css          # Component styles
├── js/
│   ├── survey-sections.js      # Survey logic
│   ├── ai-service.js           # AI service client
│   ├── ai-chat-widget.js       # Chat widget
│   ├── survey-builder.js       # Builder logic
│   ├── context-manager.js      # Context management
│   └── websocket-client.js     # WebSocket client
└── Surveys/
    └── survey-001.json         # Sample survey data
```

**Technologies:**
- Vanilla JavaScript (no frameworks)
- Custom CSS with design tokens
- WebSocket client for real-time updates
- JSON-based survey format

---

## 5. DOCKER INFRASTRUCTURE

### 5.1 Docker Compose Services
**File:** `/home/user/Ousamma.Survey/docker-compose.yml`

**Services & Ports:**

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| zookeeper | cp-zookeeper:7.5.0 | 2181 | Kafka coordination |
| kafka | cp-kafka:7.5.0 | 9092/29092 | Message streaming |
| kafka-ui | kafka-ui:latest | 8080 | Kafka monitoring |
| kafka-init | cp-kafka:7.5.0 | - | Topic initialization |
| mongodb | mongo:7.0 | 27017 | Database |
| redis | redis:7-alpine | 6379 | Caching |
| geolocation-service | custom | 3001 | Location services |
| analytics-service | custom | 3002 | Analytics |
| analytics-consumer-service | custom | 3003 | Analytics consumer |
| survey-service | custom | 3000 | Survey management |
| project-service | custom | 3006 | Project management |
| admin-service | custom | 3007 | System admin |

**Network:** `survey-network` (Docker bridge network)

**Volumes:**
- `mongodb_data`, `mongodb_config` - Database persistence
- `redis_data` - Cache persistence
- `kafka_data` - Kafka logs
- `zookeeper_data`, `zookeeper_logs` - Zookeeper data

**Health Checks:** Configured for all services

---

## 6. CONFIGURATION & ENVIRONMENT FILES

### 6.1 Environment Variables by Service

**Main API (.env.example):**
```env
PORT=3000
AI_PROVIDER=openai
AI_API_URL=https://ousammai.onrender.com/api/ai
AI_API_KEY=
AI_MODEL=gpt-4
WEBSOCKET_URL=http://websocket-service:3002
MONGODB_URI=mongodb://mongodb:27017/notifications
KAFKA_BROKERS=kafka:9092
```

**Surveyor Service (.env.example):**
```env
PORT=3001
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/surveyor-management
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=7d
DEFAULT_PASSWORD_LENGTH=10
ACCOUNT_EXPIRATION_DAYS=30
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
MAIN_SERVICE_URL=http://localhost:3000
```

**Admin Service (.env.example):**
```env
PORT=3007
NODE_ENV=development
MONGODB_URI=mongodb://mongodb:27017/admin_service
REDIS_HOST=redis
REDIS_PORT=6379
KAFKA_BROKERS=kafka:9092
ADMIN_API_KEY=your-admin-api-key-here
JWT_SECRET=your-jwt-secret-here
BACKUP_ENABLED=true
BACKUP_SCHEDULE=0 2 * * *
BACKUP_RETENTION_DAYS=30
```

**WebSocket Service (.env.example):**
```env
PORT=3002
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/websocket_service
REDIS_HOST=redis
REDIS_PORT=6379
JWT_SECRET=your-jwt-secret-here
JWT_EXPIRATION=24h
RATE_LIMIT_MAX_MESSAGES=100
RATE_LIMIT_WINDOW=60000
MAX_CONNECTIONS_PER_IP=10
```

---

## 7. DEPENDENCY ANALYSIS

### 7.1 Security-Related Dependencies Status

| Dependency | Used | Critical | Status |
|---|---|---|---|
| jsonwebtoken | ⚠️ Partial | YES | Only WebSocket service |
| bcryptjs | ✓ Yes | YES | In Surveyor service |
| helmet | ⚠️ Partial | YES | Only Notification service |
| express-rate-limit | ⚠️ Partial | YES | Only Notification service |
| rate-limiter-flexible | ✓ Yes | YES | WebSocket service |
| express-validator | ✓ Yes | YES | Multiple services |
| cors | ✓ Yes | YES | All services (misconfigured) |
| dotenv | ✓ Yes | YES | All services |
| multer | ✓ Yes | MEDIUM | File uploads |
| compression | ✓ Yes | MEDIUM | Response compression |
| redis | ✓ Yes | MEDIUM | Caching |
| mongosse | ✓ Yes | MEDIUM | ORM |

### 7.2 Missing Security Dependencies

- `express-mongodb-sanitize` - Prevent NoSQL injection
- `xss-clean` - XSS prevention
- `hpp` - HTTP Parameter Pollution prevention
- `express-slow-down` - Rate limiting with gradual slowdown
- `joi` - Advanced schema validation
- `crypto-js` - Field-level encryption
- `jwks-rsa` - JWT key rotation
- `express-jwt` - Express JWT middleware

---

## 8. DATABASE SCHEMAS SUMMARY

### Collections Across Services

**Surveyor Service:**
- `surveyors` - Surveyor accounts with bcrypt passwords
- `assignments` - Survey assignments with progress tracking
- `activities` - Activity audit logs with location & device tracking

**Admin Service:**
- `users` - Admin users with roles and permissions
- `systemsettings` - System configuration
- `systemhealth` - Health monitoring data

**Analytics Service:**
- `surveyanalytics` - Aggregated survey analytics
- `responseevents` - Individual response events for time-series
- `responsecache` - Cached response data

**Other Services:**
- `projects` - Project definitions
- `surveygroups` - Survey grouping
- `notifications` - Notification records
- `geolocationdata` - Location history

---

## 9. API ENDPOINTS INVENTORY

### Total Endpoints by Service

| Service | Count | Auth | Protected |
|---------|-------|------|-----------|
| Main API | 18 | ❌ | 0% |
| Surveyor Service | 12 | ⚠️ | 0% |
| Survey Service | 8+ | ❌ | 0% |
| Analytics Service | 6+ | ❌ | 0% |
| Admin Service | 8 | ❌ | 0% |
| WebSocket Service | Events | ⚠️ | 50% |
| Notification Service | 6+ | ⚠️ | 20% |
| Project Service | 8+ | ❌ | 0% |
| Geolocation Service | 4+ | ❌ | 0% |
| **Total** | **70+** | **❌** | **5%** |

---

## 10. KEY FINDINGS

### Strengths
✓ Solid microservices architecture  
✓ Good data models with proper relationships  
✓ Redis caching strategy well-designed  
✓ Activity logging comprehensive  
✓ WebSocket service has proper JWT  
✓ Password hashing implemented  
✓ Input validation partially implemented  

### Critical Weaknesses
❌ No authentication on 95% of endpoints  
❌ No authorization enforcement  
❌ Unsafe file upload handling  
❌ CORS configured unsafely  
❌ No rate limiting on critical endpoints  
❌ No HTTPS/TLS  
❌ Unencrypted inter-service communication  
❌ Header-based auth in Admin service  

---

## 11. FILE LOCATION INDEX

### Critical Security Files to Modify

```
Priority 1 (Week 1):
- /surveyor-service/middleware/auth.js
- /services/admin-service/middleware/auth.js
- index.js
- /services/admin-service/index.js

Priority 2 (Week 2-3):
- /services/notification-service/index.js
- /services/websocket-service/index.js
- /surveyor-service/routes/*.js
- All routes files in services

Priority 3 (Week 4-5):
- docker-compose.yml
- /services/shared/cache/redis-cache.js
- All index.js files
```

---

## 12. RECOMMENDED READING ORDER

1. **SECURITY_AUDIT_SPRINT_019.md** - This audit (comprehensive analysis)
2. **SECURITY_QUICK_REFERENCE.md** - Quick reference during implementation
3. **SURVEY_IMPLEMENTATION_ANALYSIS.md** - Current implementation details
4. **PERFORMANCE_OPTIMIZATION.md** - Performance measures (maintain these)
5. **Code files** - Review models, routes, and controllers

---

**Document Version:** 1.0  
**Generated:** November 14, 2025  
**Scope:** Complete codebase analysis  
**Classification:** Internal - Development


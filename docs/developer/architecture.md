# System Architecture

Comprehensive architecture documentation for the Ousamma Survey System.

## Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Load Balancer                         │
│                         (Optional)                           │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────┴──────────────────────────────────┐
│                     API Gateway (Port 3000)                  │
│  - Authentication & Authorization (JWT)                      │
│  - Rate Limiting & Security (Helmet, CORS)                  │
│  - Request Routing                                           │
│  - Response Compression                                      │
└─────┬────────────────────────────────────────────────┬──────┘
      │                                                 │
      │        ┌────────────────────────────────────────┤
      │        │                                        │
┌─────▼────────▼────┐  ┌──────────────┐  ┌────────────▼──────┐
│  Microservices    │  │   WebSocket  │  │  Static Files     │
│                   │  │   Service    │  │  (Frontend)       │
│ - Survey Service  │  │  (Port 3002/ │  │  - HTML/CSS/JS    │
│ - Surveyor Svc    │  │   3008)      │  │  - Survey Builder │
│ - Analytics Svc   │  │              │  │  - Admin Panel    │
│ - Geolocation Svc │  │  Real-time   │  └───────────────────┘
│ - Notification Svc│  │  Updates     │
│ - Project Service │  └──────────────┘
│ - Admin Service   │
└─────┬─────────────┘
      │
      │        ┌──────────────────────────┐
      │        │   Event Bus (Kafka)      │
      └────────┤   - response.submitted   │
               │   - survey.created       │
               │   - notification.send    │
               └──────────┬───────────────┘
                          │
      ┌───────────────────┴────────────────────┐
      │                                        │
┌─────▼──────────────┐           ┌────────────▼─────────┐
│ Consumer Services  │           │  Data Layer          │
│                    │           │                      │
│ - Analytics        │           │  - MongoDB (Primary) │
│   Consumer         │◄──────────┤  - Redis (Cache)     │
│ - Notification     │           │  - Kafka (Events)    │
│   Consumer         │           │  - Zookeeper         │
│ - Audit Consumer   │           └──────────────────────┘
└────────────────────┘
```

### Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Runtime** | Node.js 18+ | Server-side JavaScript |
| **Framework** | Express.js 4.18 | Web application framework |
| **Database** | MongoDB 7.0 | Primary data store |
| **Cache** | Redis 7 | Session & data caching |
| **Message Queue** | Apache Kafka 7.5 | Event streaming |
| **Coordination** | Zookeeper 7.5 | Kafka coordination |
| **Real-time** | WebSocket (ws) | Live updates |
| **Container** | Docker | Application packaging |
| **Orchestration** | Docker Compose | Multi-container deployment |

---

## Service Catalog

### 1. API Gateway (Port 3000)
**File**: `index.js`

**Responsibilities:**
- Central entry point for all HTTP requests
- JWT authentication and authorization
- Rate limiting and security middleware
- AI service integration
- Survey CRUD operations
- Response collection
- File upload handling
- Caching layer (Redis)

**Dependencies:**
- MongoDB (survey data)
- Redis (caching)
- Kafka (event publishing)
- AI APIs (OpenAI, Anthropic, Google)

**Key Endpoints:**
```
POST /api/auth/login
POST /api/ai/generate-survey
GET  /api/surveys/:surveyId
POST /api/surveys/save
POST /api/responses/save
POST /api/context/upload
```

### 2. Survey Service
**Location**: `services/survey-service/`

**Responsibilities:**
- Survey data models (MongoDB schemas)
- Advanced survey features:
  - Conditional logic engine
  - Piping/text substitution
  - Calculations
  - Multi-language support
  - Validation rules
- Response validation
- QR code generation

**Database Models:**
```javascript
Survey {
  _id, surveyId, title, description,
  questions[], sections[],
  conditionalLogic[], calculations[],
  languages: Map<String, Object>,
  metadata, status, timestamps
}

SurveyResponse {
  _id, surveyId, respondentId,
  answers: Map<String, Any>,
  metadata: { ipAddress, location, duration },
  status, completedAt, timestamps
}
```

### 3. Surveyor Service (Port 3001)
**Location**: `surveyor-service/`

**Responsibilities:**
- Surveyor account management
- Assignment tracking
- Activity logging
- Performance analytics
- Bulk import/export
- Authentication (bcrypt)

**API Endpoints:**
```
GET    /api/surveyors
POST   /api/surveyors
PUT    /api/surveyors/:id
DELETE /api/surveyors/:id
POST   /api/surveyors/bulk
POST   /api/assignments
GET    /api/activities
```

### 4. Analytics Service (Port 3002)
**Location**: `services/analytics-service/`

**Responsibilities:**
- Real-time analytics aggregation
- Survey statistics computation
- Question-level analytics
- Dashboard data API
- Data export (JSON, CSV)
- Redis caching for hot data

**Analytics Models:**
```javascript
SurveyAnalytics {
  surveyId, totalResponses,
  completionRate, averageTime,
  questionAnalytics[],
  demographics, trends,
  lastUpdated
}

QuestionAnalytics {
  questionId, questionText,
  responseCount, distribution,
  average, median, mode,
  correlations[]
}
```

### 5. Analytics Consumer (Port 3003)
**Location**: `services/analytics-consumer-service/`

**Responsibilities:**
- Kafka consumer for analytics events
- Batch processing of responses
- Incremental statistics updates
- Cache warming
- Data aggregation

**Kafka Topics:**
- `response.submitted`
- `survey.created`
- `survey.updated`

### 6. Geolocation Service (Port 3001)
**Location**: `services/geolocation-service/`

**Responsibilities:**
- GPS coordinate capture
- Reverse geocoding (OpenStreetMap)
- Location validation
- Territory management
- Distance calculations
- Location history

**Features:**
- Point-in-polygon for territory detection
- Geofencing
- Location accuracy filtering

### 7. Notification Service (Port 3006)
**Location**: `services/notification-service/`

**Responsibilities:**
- Notification template management
- Event publishing to Kafka
- Notification tracking
- Delivery status monitoring

**Notification Types:**
- Email (SMTP)
- SMS (Twilio)
- Push notifications (FCM)
- WebSocket messages

### 8. Notification Consumer (Port 3004)
**Location**: `services/notification-consumer-service/`

**Responsibilities:**
- Multi-channel delivery:
  - Email via SMTP
  - SMS via Twilio
  - Push via Firebase
  - WebSocket real-time
- Retry logic with exponential backoff
- Delivery status tracking
- Template rendering

### 9. WebSocket Service (Port 3002/3008)
**Location**: `services/websocket-service/`

**Responsibilities:**
- Real-time bidirectional communication
- Event streaming to clients
- JWT authentication
- Rate limiting per connection
- Room/channel management

**Events:**
```javascript
// Client → Server
{ type: 'subscribe', channel: 'survey.responses', surveyId: 'xxx' }
{ type: 'unsubscribe', channel: '...' }
{ type: 'ping' }

// Server → Client
{ type: 'response.submitted', data: {...} }
{ type: 'analytics.updated', data: {...} }
{ type: 'pong' }
```

### 10. Project Service (Port 3009)
**Location**: `services/project-service/`

**Responsibilities:**
- Project/campaign management
- Survey grouping
- Access control
- Aggregated analytics
- Resource sharing

### 11. Admin Service (Port 3007)
**Location**: `services/admin-service/`

**Responsibilities:**
- System administration
- User management
- Service health monitoring
- Backup/restore operations
- Audit log viewing
- System settings

### 12. Audit Consumer (Port 3005)
**Location**: `services/audit-consumer-service/`

**Responsibilities:**
- Audit event consumption from Kafka
- Compliance logging
- 365-day retention
- Tamper-proof audit trail

---

## Data Flow Diagrams

### Survey Response Submission Flow

```
┌──────────┐
│Respondent│
└────┬─────┘
     │ 1. Submit Response
     ▼
┌──────────────┐
│ API Gateway  │
│  (index.js)  │
└──────┬───────┘
       │ 2. Validate & Save
       ▼
┌──────────────┐
│  MongoDB     │ ◄────── 3. Store Response
└──────┬───────┘
       │
       │ 4. Publish Event
       ▼
┌──────────────┐
│    Kafka     │
│ response.    │
│ submitted    │
└──┬────┬───┬──┘
   │    │   │
   │    │   │ 5. Consume Events
   ▼    ▼   ▼
┌─────┐┌────┐┌──────┐
│Analyt││Noti││Audit │
│ics  ││fic ││      │
│Consm││Cons││Consum│
└──┬──┘└─┬──┘└───┬──┘
   │     │       │
   │ 6. Update  │
   ▼     ▼       ▼
┌─────┐┌────┐┌──────┐
│Redis││SMTP││Audit │
│Cache││Send││Logs  │
└─────┘└────┘└──────┘
   │
   │ 7. Real-time Update
   ▼
┌──────────────┐
│  WebSocket   │
│   Service    │
└──────┬───────┘
       │ 8. Broadcast
       ▼
┌──────────────┐
│   Clients    │
│  (Dashboard) │
└──────────────┘
```

### AI Survey Generation Flow

```
┌──────────┐
│   User   │
└────┬─────┘
     │ 1. POST /api/ai/generate-survey
     │    { description: "..." }
     ▼
┌──────────────┐
│ API Gateway  │
└──────┬───────┘
       │ 2. Validate Request
       ▼
┌──────────────┐
│  AI Service  │ ──── 3. Send Prompt
│   Router     │
└──────┬───────┘
       │
       ├─────► OpenAI GPT-4
       ├─────► Anthropic Claude
       └─────► Google Gemini
              │
              │ 4. AI Response
              ▼
       ┌──────────────┐
       │    Parse     │
       │   Response   │
       └──────┬───────┘
              │ 5. Create Survey Object
              ▼
       ┌──────────────┐
       │   MongoDB    │
       │ Save Survey  │
       └──────┬───────┘
              │ 6. Return Survey
              ▼
       ┌──────────────┐
       │     User     │
       │   (Editor)   │
       └──────────────┘
```

---

## Database Schemas

### MongoDB Collections

#### surveys
```javascript
{
  _id: ObjectId,
  surveyId: String (indexed, unique),
  title: String,
  description: String,
  questions: [
    {
      id: String,
      type: String (enum),
      text: String,
      required: Boolean,
      options: Array,
      validation: Object,
      piping: Object
    }
  ],
  sections: [
    { id: String, title: String, questions: [String] }
  ],
  conditionalLogic: [
    {
      id: String,
      condition: { questionId, operator, value },
      actions: [{ type, target, value }]
    }
  ],
  calculations: [
    { id: String, formula: String, outputVariable: String }
  ],
  languages: Map<String, Object>,
  metadata: {
    author: String,
    version: String,
    tags: [String]
  },
  status: String (enum: draft, active, closed, archived),
  createdAt: Date,
  updatedAt: Date
}

Indexes:
- surveyId (unique)
- status
- createdAt (desc)
- "metadata.author"
```

#### responses
```javascript
{
  _id: ObjectId,
  surveyId: String (indexed),
  respondentId: String,
  surveyorId: String (indexed),
  answers: Map<String, Any>,
  metadata: {
    ipAddress: String,
    userAgent: String,
    location: {
      type: "Point",
      coordinates: [Number, Number]
    },
    duration: Number
  },
  status: String (enum),
  completedAt: Date,
  createdAt: Date,
  updatedAt: Date
}

Indexes:
- surveyId
- surveyorId
- status
- createdAt (desc)
- "metadata.location" (2dsphere for geo queries)
```

#### surveyors
```javascript
{
  _id: ObjectId,
  name: String,
  email: String (indexed, unique),
  phone: String,
  employeeId: String (indexed, unique),
  password: String (bcrypt hashed),
  region: String (indexed),
  territory: [String],
  status: String (enum: active, inactive, suspended),
  assignments: [ObjectId],
  lastLogin: Date,
  createdAt: Date,
  expiresAt: Date
}

Indexes:
- email (unique)
- employeeId (unique)
- status
- region
- expiresAt
```

### Redis Cache Structure

```
Namespaces:
├── survey:<surveyId>                 # Survey data (TTL: 3600s)
├── analytics:<surveyId>              # Analytics data (TTL: 300s)
├── session:<userId>                  # User sessions (TTL: 900s)
├── ratelimit:<ip>                    # Rate limit counters (TTL: 900s)
└── lock:<resource>                   # Distributed locks (TTL: 30s)

Example:
survey:retail-2024 → {JSON survey object}
analytics:retail-2024:stats → {JSON stats}
session:user123 → {JWT payload}
```

### Kafka Topics

```
Topics:
├── response.submitted               # New survey response
│   Partitions: 3
│   Replication: 1
│   Retention: 7 days
│
├── survey.created                   # New survey created
│   Partitions: 1
│   Retention: 7 days
│
├── survey.updated                   # Survey modified
│   Partitions: 1
│   Retention: 7 days
│
├── notification.send                # Notification request
│   Partitions: 3
│   Retention: 1 day
│
└── audit.event                      # Audit event
    Partitions: 1
    Retention: 365 days

Consumer Groups:
├── analytics-consumer-group
├── notification-consumer-group
└── audit-consumer-group
```

---

## Design Patterns

### 1. API Gateway Pattern
- Single entry point for all client requests
- Cross-cutting concerns (auth, logging, rate limiting)
- Request routing to microservices

### 2. Microservices Pattern
- Independent deployment and scaling
- Service-specific databases
- Inter-service communication via REST/Kafka

### 3. Event-Driven Architecture
- Asynchronous event processing
- Decoupled services
- Event sourcing for audit trail

### 4. CQRS (Command Query Responsibility Segregation)
- Separate read/write models for analytics
- Optimized queries via pre-aggregated data
- Event-driven updates

### 5. Cache-Aside Pattern
- Check cache first
- On miss, load from database and populate cache
- Automatic invalidation on updates

### 6. Circuit Breaker
- Prevent cascade failures
- Fallback mechanisms for external services
- Health checks and auto-recovery

### 7. Retry with Exponential Backoff
- Notification delivery
- External API calls
- Database connection failures

---

## Security Architecture

### Authentication Flow

```
┌──────┐
│Client│
└───┬──┘
    │ 1. POST /api/auth/login
    │    { email, password }
    ▼
┌──────────┐
│   API    │
│ Gateway  │
└────┬─────┘
     │ 2. Verify credentials
     │    (bcrypt.compare)
     ▼
┌──────────┐
│ MongoDB  │
│  Users   │
└────┬─────┘
     │ 3. User found
     ▼
┌──────────┐
│   JWT    │ ──── 4. Generate tokens
│  Service │      - Access token (15min)
└────┬─────┘      - Refresh token (7 days)
     │
     │ 5. Return tokens
     ▼
┌──────┐
│Client│ ────► Stores tokens
└──────┘

Subsequent requests:
┌──────┐
│Client│ ──── Authorization: Bearer <token>
└───┬──┘
    ▼
┌──────────┐
│Middleware│ ──── Verify JWT signature
│  (auth)  │      Check expiration
└────┬─────┘      Extract user info
     │
     ▼
┌──────────┐
│  Request │
│ Handler  │
└──────────┘
```

### Security Layers

1. **Transport Security**: TLS 1.3
2. **Authentication**: JWT with short expiration
3. **Authorization**: Role-based access control (RBAC)
4. **Input Validation**: Joi schemas, express-validator
5. **Sanitization**: mongo-sanitize, xss-clean
6. **Rate Limiting**: express-rate-limit
7. **Security Headers**: Helmet.js
8. **CORS**: Configured allowed origins
9. **HPP Protection**: Parameter pollution prevention
10. **2FA**: TOTP (Time-based One-Time Password)

---

## Scalability & Performance

### Horizontal Scaling

```
Load Balancer (Nginx/HAProxy)
        │
   ┌────┴────┬────────┬────────┐
   │         │        │        │
   ▼         ▼        ▼        ▼
API GW 1  API GW 2  API GW 3  API GW N
   │         │        │        │
   └────┬────┴────┬───┴────────┘
        │         │
        ▼         ▼
   MongoDB    Redis Cluster
   Replica Set   (3 nodes)
```

### Caching Strategy

| Data Type | Cache | TTL | Strategy |
|-----------|-------|-----|----------|
| Survey definitions | Redis | 1 hour | Cache-aside |
| Analytics (hot) | Redis | 5 min | Write-through |
| Session data | Redis | 15 min | Write-through |
| Static assets | CDN | 1 day | CDN caching |

### Performance Optimizations

1. **Database**:
   - Indexes on frequently queried fields
   - Connection pooling
   - Query optimization
   - Aggregation pipelines

2. **Application**:
   - Response compression (gzip)
   - Payload size limits
   - Async processing for heavy operations
   - Pagination for large datasets

3. **Caching**:
   - Redis for hot data
   - In-memory caching for config
   - CDN for static assets

4. **API**:
   - Rate limiting to prevent abuse
   - Request batching where applicable
   - GraphQL for flexible queries (future)

---

## Monitoring & Observability

### Metrics to Monitor

**Application Metrics:**
- Request rate (req/s)
- Response time (p50, p95, p99)
- Error rate (%)
- Active connections

**System Metrics:**
- CPU usage (%)
- Memory usage (MB/%)
- Disk I/O (MB/s)
- Network throughput (Mbps)

**Business Metrics:**
- Surveys created/day
- Responses submitted/day
- Active users
- Conversion rate

### Logging

```
Winston Logger:
├── error.log    - Errors only
├── combined.log - All logs
└── audit.log    - Audit events

Log Levels:
error → warn → info → http → debug

Log Format:
{
  timestamp: "2024-01-15T10:30:45.123Z",
  level: "info",
  service: "api-gateway",
  message: "Survey created",
  userId: "user123",
  surveyId: "retail-2024",
  duration: 125
}
```

### Distributed Tracing

- Request ID propagation across services
- Correlation IDs for tracking requests
- Performance bottleneck identification

---

## Deployment Architecture

### Development
```yaml
Services: All in docker-compose.yml
Replicas: 1 per service
Logging: Console
Restart: no
Resources: No limits
```

### Production
```yaml
Services: docker-compose.production.yml
Replicas: 3+ (critical services)
Logging: Filebeat → Logstash → Elasticsearch
Restart: always
Resources: CPU/Memory limits enforced
Health checks: Enabled
Networks: Isolated service networks
Volumes: Persistent named volumes
```

---

**Architecture Documentation Version**: 1.0
**Last Updated**: 2025-11-14

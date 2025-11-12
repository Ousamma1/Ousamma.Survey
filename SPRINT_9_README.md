# SPRINT 9: Real-Time Analytics Service

## Overview
Sprint 9 implements a comprehensive real-time analytics microservice architecture for the Ousamma Survey Platform. This includes real-time data aggregation, statistical calculations, caching strategies, and event-driven processing using Kafka.

## Architecture

### Microservices
1. **analytics-service** (Port 3002)
   - RESTful API for analytics queries
   - Real-time statistics and aggregation
   - Export functionality (JSON/CSV)
   - Redis caching layer

2. **analytics-consumer-service** (Port 3003)
   - Kafka consumer for event processing
   - Real-time aggregation on response submissions
   - Cache invalidation
   - Event-driven updates

### Infrastructure Components
- **MongoDB**: Analytics data storage
- **Redis**: High-performance caching layer
- **Kafka**: Event streaming platform
- **Zookeeper**: Kafka coordination service

## Features Implemented

### 1. Data Models

#### SurveyAnalytics
```javascript
{
  surveyId: String,
  totalResponses: Number,
  completionRate: Number,
  averageTime: Number,
  dropOffPoints: [{ questionId, count, percentage }],
  demographics: Object,
  locationDistribution: Object,
  deviceDistribution: { desktop, mobile, tablet },
  timeBasedTrends: { hourly, daily, weekly }
}
```

#### QuestionAnalytics
```javascript
{
  questionId: String,
  surveyId: String,
  questionType: String,
  responseCount: Number,
  valueDistribution: Object,
  statistics: {
    mean, median, mode, stdDev, variance,
    min, max, percentiles: { p25, p50, p75, p90, p95, p99 }
  },
  textAnalytics: {
    averageLength, totalWords, commonWords, sentiment
  },
  responseTime: { average, median, min, max }
}
```

#### ResponseEvent (Time-Series)
```javascript
{
  surveyId: String,
  responseId: String,
  userId: String,
  responses: Object,
  metadata: { device, browser, os, userAgent },
  location: { type: 'Point', coordinates, country, city },
  completionTime: Number,
  isComplete: Boolean,
  timestamp: Date
}
```

### 2. Statistical Calculations

Comprehensive statistics utility providing:
- **Basic Statistics**: mean, median, mode, min, max, range
- **Variability**: variance, standard deviation, coefficient of variation
- **Distribution**: percentiles (p25, p50, p75, p90, p95, p99)
- **Shape**: skewness, kurtosis
- **Relationships**: correlation coefficient, chi-square, t-test
- **Data Distribution**: frequency distribution, percentage distribution

### 3. API Endpoints

#### Analytics Service (http://localhost:3002/api/analytics)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/survey/:id` | Get survey-level analytics |
| GET | `/survey/:id/questions` | Get question-level analytics |
| GET | `/survey/:id/realtime` | Get real-time statistics |
| GET | `/survey/:id/export` | Export analytics (JSON/CSV) |
| GET | `/group/:id` | Get group analytics |
| GET | `/compare` | Compare multiple surveys |
| POST | `/custom` | Execute custom analytics query |

#### Example Requests

**Get Survey Analytics:**
```bash
curl http://localhost:3002/api/analytics/survey/survey123
```

**Get Question Analytics:**
```bash
curl http://localhost:3002/api/analytics/survey/survey123/questions?questionId=q1
```

**Get Real-time Stats:**
```bash
curl http://localhost:3002/api/analytics/survey/survey123/realtime
```

**Export Analytics:**
```bash
curl "http://localhost:3002/api/analytics/survey/survey123/export?format=csv"
```

**Compare Surveys:**
```bash
curl "http://localhost:3002/api/analytics/compare?surveyIds=survey1,survey2,survey3"
```

**Custom Query:**
```bash
curl -X POST http://localhost:3002/api/analytics/custom \
  -H "Content-Type: application/json" \
  -d '{
    "surveyId": "survey123",
    "startDate": "2025-01-01",
    "endDate": "2025-12-31",
    "metrics": ["completionRate", "averageTime", "locationDistribution"],
    "filters": {}
  }'
```

### 4. Real-Time Aggregation

The analytics consumer processes events in real-time:

**Kafka Topics:**
- `response.submitted` - New survey responses
- `survey.created` - New survey initialization
- `survey.updated` - Survey modifications

**Processing Pipeline:**
1. Consumer receives event from Kafka
2. Parse and validate event data
3. Update MongoDB analytics collections
4. Invalidate relevant Redis cache keys
5. Publish analytics.update event (optional)

**Features:**
- Batch processing support (configurable batch size)
- Automatic retry on failures
- Graceful error handling
- Real-time cache invalidation

### 5. Caching Strategy

**Redis Caching Layers:**

| Data Type | Cache Key Pattern | TTL |
|-----------|------------------|-----|
| Survey Analytics | `survey_analytics:{surveyId}` | 300s (hot) / 3600s (cold) |
| Question Analytics | `question_analytics:{surveyId}:{questionId}` | 300s (hot) / 3600s (cold) |
| Real-time Stats | `realtime_stats:{surveyId}` | 300s |
| Group Analytics | `group_analytics:{groupId}` | 3600s |

**Cache Features:**
- Adaptive TTL based on access patterns
- Access count tracking
- Pattern-based cache invalidation
- Cache warming for popular surveys
- Fallback to database on cache miss

### 6. Aggregation Types

- **Response Counts**: Total responses per survey/question
- **Completion Rates**: Percentage of completed surveys
- **Time-based Trends**: Hourly, daily, weekly response patterns
- **Question-level Statistics**: Mean, median, mode, std dev, percentiles
- **Cross-tabulation**: Response distribution analysis
- **Sentiment Analysis**: Basic sentiment tracking for text responses
- **Location-based Analytics**: Geographic distribution of responses
- **Device Analytics**: Desktop/mobile/tablet breakdowns
- **Drop-off Analysis**: Identification of abandonment points

## Project Structure

```
services/
├── analytics-service/
│   ├── config/
│   │   ├── database.js          # MongoDB connection
│   │   ├── redis.js             # Redis connection
│   │   └── kafka.js             # Kafka producer
│   ├── models/
│   │   ├── SurveyAnalytics.js   # Survey analytics schema
│   │   ├── QuestionAnalytics.js # Question analytics schema
│   │   └── ResponseEvent.js     # Response event schema
│   ├── controllers/
│   │   └── analyticsController.js # API controllers
│   ├── routes/
│   │   └── analytics.js         # API routes
│   ├── services/
│   │   ├── aggregationService.js # Aggregation logic
│   │   ├── cacheService.js      # Cache management
│   │   └── exportService.js     # Export functionality
│   ├── utils/
│   │   └── statistics.js        # Statistical calculations
│   ├── .env.example             # Environment template
│   ├── Dockerfile               # Container definition
│   ├── package.json             # Dependencies
│   └── index.js                 # Service entry point
│
└── analytics-consumer-service/
    ├── config/
    │   ├── database.js          # MongoDB connection
    │   ├── redis.js             # Redis connection
    │   └── kafka.js             # Kafka consumer config
    ├── models/                  # Shared models
    ├── consumers/
    │   └── responseConsumer.js  # Event consumer
    ├── services/
    │   └── aggregationService.js # Aggregation logic
    ├── utils/
    │   └── statistics.js        # Statistical calculations
    ├── .env.example             # Environment template
    ├── Dockerfile               # Container definition
    ├── package.json             # Dependencies
    └── index.js                 # Consumer entry point
```

## Setup & Installation

### 1. Install Dependencies

```bash
# Analytics Service
cd services/analytics-service
npm install

# Analytics Consumer Service
cd ../analytics-consumer-service
npm install
```

### 2. Environment Configuration

Copy `.env.example` to `.env` in each service and configure:

**Analytics Service:**
```env
PORT=3002
NODE_ENV=development
MONGODB_URI=mongodb://mongodb:27017/analytics
REDIS_HOST=redis
REDIS_PORT=6379
KAFKA_BROKERS=kafka:9092
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:3002
```

**Analytics Consumer Service:**
```env
PORT=3003
NODE_ENV=development
MONGODB_URI=mongodb://mongodb:27017/analytics
REDIS_HOST=redis
REDIS_PORT=6379
KAFKA_BROKERS=kafka:9092
KAFKA_TOPICS=response.submitted,survey.created,survey.updated
BATCH_SIZE=100
BATCH_TIMEOUT=5000
```

### 3. Start Services with Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f analytics-service
docker-compose logs -f analytics-consumer-service

# Check service health
curl http://localhost:3002/health
```

### 4. Verify Services

```bash
# Check analytics service
curl http://localhost:3002/health

# Check API documentation
curl http://localhost:3002/api/analytics/docs

# Check Kafka topics
docker exec -it survey-kafka kafka-topics --list --bootstrap-server localhost:9092

# Check Redis
docker exec -it survey-redis redis-cli ping
```

## Testing

### Manual Testing

**1. Publish a test event to Kafka:**
```bash
docker exec -it survey-kafka kafka-console-producer \
  --bootstrap-server localhost:9092 \
  --topic response.submitted

# Then paste:
{
  "surveyId": "test-survey-1",
  "responseId": "resp-1",
  "userId": "user-1",
  "responses": {
    "q1": "Answer 1",
    "q2": 5,
    "q3": true
  },
  "metadata": {
    "device": "desktop",
    "browser": "Chrome",
    "os": "Windows"
  },
  "location": {
    "type": "Point",
    "coordinates": [-74.006, 40.7128],
    "country": "USA",
    "city": "New York"
  },
  "completionTime": 120,
  "isComplete": true
}
```

**2. Query analytics:**
```bash
curl http://localhost:3002/api/analytics/survey/test-survey-1
curl http://localhost:3002/api/analytics/survey/test-survey-1/questions
curl http://localhost:3002/api/analytics/survey/test-survey-1/realtime
```

## Performance Considerations

### Caching Strategy
- Hot data (frequently accessed): 5-minute TTL
- Cold data (rarely accessed): 1-hour TTL
- Real-time stats: 5-minute TTL
- Adaptive TTL based on access patterns

### Kafka Configuration
- Batch processing for efficiency
- Configurable batch size (default: 100)
- Configurable batch timeout (default: 5000ms)
- Auto-commit with 5-second interval

### Database Optimization
- Indexes on surveyId, questionId, timestamp
- Time-series collection for ResponseEvent
- Compound indexes for common queries
- Geospatial index for location queries

## Monitoring & Health Checks

### Health Endpoints
- Analytics Service: `http://localhost:3002/health`
- All services include database and Redis connection status

### Logs
```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f analytics-service
docker-compose logs -f analytics-consumer-service
docker-compose logs -f kafka
docker-compose logs -f redis
```

### Metrics
Monitor:
- Response processing latency
- Cache hit/miss rates
- Kafka consumer lag
- Database query performance
- Redis memory usage

## Troubleshooting

### Common Issues

**1. Kafka Connection Issues:**
```bash
# Check if Kafka is running
docker-compose ps kafka

# Check Kafka logs
docker-compose logs kafka

# Restart Kafka
docker-compose restart kafka
```

**2. Redis Connection Issues:**
```bash
# Check Redis connectivity
docker exec -it survey-redis redis-cli ping

# View Redis keys
docker exec -it survey-redis redis-cli KEYS "*"
```

**3. MongoDB Connection Issues:**
```bash
# Check MongoDB status
docker exec -it survey-mongodb mongosh --eval "db.adminCommand('ping')"

# View analytics collections
docker exec -it survey-mongodb mongosh analytics --eval "show collections"
```

**4. Consumer Not Processing Events:**
- Check Kafka topic exists
- Verify consumer group ID
- Check consumer logs for errors
- Ensure MongoDB and Redis are connected

## API Documentation

Full API documentation is available at:
```
http://localhost:3002/api/analytics/docs
```

## Future Enhancements

1. **Advanced Analytics:**
   - Machine learning predictions
   - Anomaly detection
   - Response quality scoring
   - Advanced sentiment analysis

2. **Visualization:**
   - Real-time dashboards
   - Interactive charts
   - Geographic heat maps
   - Trend analysis graphs

3. **Performance:**
   - Read replicas for analytics queries
   - Materialized views for complex queries
   - Streaming aggregations
   - Distributed caching

4. **Features:**
   - Scheduled reports
   - Alert notifications
   - Custom metric definitions
   - A/B testing analytics

## Dependencies

### Analytics Service
- express: ^4.18.2
- mongoose: ^8.0.3
- redis: ^4.6.7
- kafkajs: ^2.2.4
- cors: ^2.8.5
- dotenv: ^16.3.1
- joi: ^17.11.0
- json2csv: ^6.0.0-alpha.2

### Analytics Consumer Service
- mongoose: ^8.0.3
- redis: ^4.6.7
- kafkajs: ^2.2.4
- dotenv: ^16.3.1

## Deliverables Completed

✅ Analytics microservice with REST API
✅ Real-time aggregation via Kafka
✅ Redis caching layer with adaptive TTL
✅ Statistical calculations (mean, median, mode, std dev, percentiles, etc.)
✅ Analytics API endpoints (survey, question, realtime, export, compare, custom)
✅ Time-series data handling
✅ MongoDB for analytics storage
✅ Export functionality (JSON/CSV)
✅ Kafka consumer service
✅ Real-time cache invalidation
✅ Docker configurations
✅ Comprehensive documentation

## Conclusion

Sprint 9 successfully implements a production-ready, scalable real-time analytics platform with:
- Event-driven architecture using Kafka
- High-performance caching with Redis
- Comprehensive statistical analysis
- Flexible API for diverse analytics needs
- Real-time data aggregation
- Export capabilities for reporting

The system is designed to handle high-volume survey responses with minimal latency while providing detailed insights through various analytical dimensions.

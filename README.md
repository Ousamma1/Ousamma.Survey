# AI-Powered Survey Platform

A comprehensive survey platform with integrated AI capabilities for survey generation, optimization, analysis, geolocation services, and real-time event streaming.

## 🚀 Sprint 8: Kafka Event Streaming Infrastructure - COMPLETED

This implementation provides a robust event-driven architecture using Apache Kafka for real-time event streaming across all microservices.

### ✅ Deliverables

#### 1. **Kafka Infrastructure**
   - Kafka broker running in Docker
   - Zookeeper for cluster coordination
   - Kafka UI for monitoring and management (accessible at `http://localhost:8080`)
   - Automated topic creation with proper partitioning
   - 24 pre-configured topics for different event types
   - Replication and partition strategies

#### 2. **Event Topics**
```
Survey Events:
  - survey.created, survey.updated, survey.published, survey.deleted

Response Events:
  - response.submitted, response.updated, response.deleted

Surveyor Events:
  - surveyor.activity, surveyor.location, surveyor.registered

Analytics Events:
  - analytics.update, analytics.request

Notification Events:
  - notification.send, notification.email, notification.sms, notification.push

Audit Events:
  - audit.log, audit.auth, audit.data

Dead Letter Queues:
  - dlq.survey, dlq.response, dlq.notification, dlq.audit
```

#### 3. **Shared Kafka Library** (`services/shared/kafka/`)
   - **Producer Utilities**: Event publishing with retry logic
   - **Consumer Utilities**: Event consumption with automatic offset management
   - **Event Schemas**: Strongly-typed event definitions
   - **Configuration Management**: Centralized Kafka configuration
   - **Error Handling**: Dead letter queue integration
   - **Retry Mechanisms**: Automatic retry with exponential backoff

#### 4. **Analytics Consumer Service** (Port 3003)
   - Consumes `response.submitted`, `response.updated`, `survey.created` events
   - Real-time analytics aggregation
   - In-memory caching with TTL
   - Publishes `analytics.update` events
   - REST API for analytics queries
   - Endpoints:
     - `GET /api/analytics/:surveyId` - Get survey analytics
     - `GET /api/analytics/:surveyId/realtime` - Get real-time analytics

#### 5. **Notification Consumer Service** (Port 3004)
   - Consumes survey, response, and notification events
   - Multi-channel notification support (Email, SMS, Push)
   - Template-based notification system
   - Notification status tracking
   - Endpoints:
     - `GET /api/notifications/:notificationId` - Get notification status

#### 6. **Audit Consumer Service** (Port 3005)
   - Consumes all audit and critical events
   - Comprehensive audit trail storage
   - Compliance reporting (GDPR, SOC2, HIPAA)
   - 365-day retention by default
   - Query and filtering capabilities
   - Endpoints:
     - `GET /api/audit/logs` - Query audit logs
     - `GET /api/audit/logs/:auditId` - Get specific audit log
     - `GET /api/audit/compliance-report` - Generate compliance report

#### 7. **Event Schemas**
All events follow a consistent schema:
```javascript
{
  eventId: string,           // Unique identifier
  eventType: string,          // Event type (e.g., 'survey.created')
  timestamp: Date,            // Event timestamp
  version: string,            // Schema version
  source: string,             // Service that generated the event
  correlationId: string,      // For tracing related events
  userId: string,             // User who triggered the event
  payload: object             // Event-specific data
}
```

#### 8. **Monitoring & Management**
   - **Kafka UI Dashboard**: Visual monitoring at `http://localhost:8080`
   - **Event Streaming Dashboard**: Custom dashboard at `http://localhost:3000/kafka-dashboard.html`
   - Topic monitoring and consumer lag tracking
   - Real-time event statistics
   - Consumer group status
   - Dead letter queue monitoring

#### 9. **Features**
   - ✅ Event-driven microservices architecture
   - ✅ Real-time data processing
   - ✅ Automatic retry and error handling
   - ✅ Dead letter queues for failed events
   - ✅ Consumer group coordination
   - ✅ Event replay capability
   - ✅ Horizontal scalability
   - ✅ Fault tolerance and resilience

### 📂 New Structure

```
services/
├── shared/
│   └── kafka/
│       ├── index.js                # Main export
│       ├── config.js               # Kafka configuration
│       ├── producer.js             # Producer utilities
│       ├── consumer.js             # Consumer utilities
│       ├── schemas.js              # Event schemas
│       └── package.json
│
├── analytics-consumer-service/
│   ├── index.js                    # Main server
│   ├── config/
│   │   └── config.js               # Service configuration
│   ├── services/
│   │   ├── analyticsService.js     # Analytics processing
│   │   └── cacheService.js         # Caching layer
│   ├── package.json
│   └── Dockerfile
│
├── notification-consumer-service/
│   ├── index.js                    # Main server
│   ├── config/
│   │   └── config.js               # Service configuration
│   ├── services/
│   │   └── notificationService.js  # Notification handling
│   ├── package.json
│   └── Dockerfile
│
└── audit-consumer-service/
    ├── index.js                    # Main server
    ├── config/
    │   └── config.js               # Service configuration
    ├── services/
    │   └── auditService.js         # Audit logging
    ├── package.json
    └── Dockerfile

public/
└── kafka-dashboard.html            # Monitoring dashboard

kafka-init.sh                       # Topic initialization script
docker-compose.yml                  # Updated with Kafka services
```

### 🚀 Getting Started

#### Start the Kafka Infrastructure

```bash
# Start all services
docker-compose up -d

# Or start individual services
docker-compose up -d zookeeper kafka kafka-ui

# Initialize topics (runs automatically)
docker-compose up kafka-init

# Start consumer services
docker-compose up -d analytics-consumer notification-consumer audit-consumer
```

#### Access Dashboards

- **Kafka UI**: http://localhost:8080
- **Event Dashboard**: http://localhost:3000/kafka-dashboard.html
- **Analytics API**: http://localhost:3003
- **Notification API**: http://localhost:3004
- **Audit API**: http://localhost:3005

#### Using the Kafka Library

```javascript
// In your microservice
const { getProducer, createEvent } = require('../shared/kafka');

// Initialize producer
const producer = getProducer();
await producer.connect();

// Send an event
const event = createEvent('survey.created', {
  surveyId: 'survey-123',
  userId: 'user-456',
  payload: {
    title: 'Customer Satisfaction Survey',
    questions: [...]
  }
}, {
  source: 'survey-service'
});

await producer.sendEvent('survey.created', event);
```

#### Consuming Events

```javascript
const { KafkaConsumer } = require('../shared/kafka');

// Create consumer
const consumer = new KafkaConsumer({
  groupId: 'my-consumer-group',
  clientId: 'my-service'
});

// Connect and subscribe
await consumer.connect();
await consumer.subscribe(['survey.created', 'response.submitted']);

// Register handlers
consumer.on('survey.created', async (event, metadata) => {
  console.log('Survey created:', event.surveyId);
  // Process event...
});

// Start consuming
await consumer.consume();
```

### 🔧 Configuration

All services support environment variables for configuration:

```env
# Kafka Configuration
KAFKA_BROKERS=kafka:9092
KAFKA_CLIENT_ID=survey-platform
KAFKA_CONSUMER_GROUP=my-consumer-group

# Analytics Consumer
ANALYTICS_CACHE_TTL=300
ANALYTICS_UPDATE_INTERVAL=5000

# Notification Consumer
EMAIL_PROVIDER=console          # or 'smtp', 'sendgrid'
SMS_PROVIDER=console            # or 'twilio'
PUSH_PROVIDER=console           # or 'fcm', 'apns'

# Audit Consumer
AUDIT_RETENTION_DAYS=365
AUDIT_ARCHIVE_ENABLED=true
```

### 📊 Monitoring

#### Check Kafka Status

```bash
# View running containers
docker-compose ps

# Check Kafka logs
docker-compose logs kafka

# Check consumer logs
docker-compose logs analytics-consumer
docker-compose logs notification-consumer
docker-compose logs audit-consumer
```

#### Access Kafka UI
Navigate to `http://localhost:8080` for:
- Topic management
- Consumer group monitoring
- Message browsing
- Cluster health

### 🔍 Event Flow Example

1. **Survey Created**:
   - Survey Service → `survey.created` event → Kafka
   - Analytics Consumer receives → Initializes analytics
   - Notification Consumer receives → Sends notification
   - Audit Consumer receives → Logs audit trail

2. **Response Submitted**:
   - Response Service → `response.submitted` event → Kafka
   - Analytics Consumer → Updates real-time analytics → `analytics.update` event
   - Notification Consumer → Sends confirmation
   - Audit Consumer → Records data access

3. **Error Handling**:
   - Event processing fails → Retry with exponential backoff
   - Max retries exceeded → Send to Dead Letter Queue
   - DLQ monitoring → Alert on failures

### 🎯 Benefits

- **Decoupling**: Services communicate asynchronously
- **Scalability**: Add more consumers to handle load
- **Reliability**: Event persistence and replay
- **Real-time**: Instant event processing
- **Auditability**: Complete event trail
- **Resilience**: Automatic retry and DLQ

## 🚀 Sprint 6: Geolocation Service & Map Integration - COMPLETED

This implementation includes all deliverables for Sprint 6:

### ✅ Deliverables

1. **Geolocation Microservice**
   - Location CRUD operations with MongoDB
   - Geocoding and reverse geocoding (OpenStreetMap)
   - Distance calculations and proximity searches
   - Geofencing and territory management
   - Location history tracking
   - RESTful API with comprehensive endpoints

2. **Location Data Models**
   - Location schema with geospatial indexing
   - Territory schema with polygon support
   - Metadata support for addresses and regions
   - Automatic coordinate validation

3. **Geolocation API Endpoints**
   - `POST /geo/location` - Save location
   - `GET /geo/location/:id` - Get location
   - `POST /geo/geocode` - Address to coordinates
   - `POST /geo/reverse-geocode` - Coordinates to address
   - `POST /geo/distance` - Calculate distances
   - `POST /geo/nearby` - Find nearby locations
   - Territory management (CRUD operations)
   - Geofence checking

4. **Frontend Map Components**
   - Leaflet.js integration with OpenStreetMap
   - MapService - Comprehensive client library
   - Marker components with custom icons
   - Marker clustering for performance
   - Territory drawing and visualization
   - Heat map support

5. **Survey Location Features**
   - Location capture for surveys
   - Territory-based assignment
   - Coverage area visualization
   - Location filtering and search

6. **Response Location Capture**
   - Automatic location capture on submission
   - Location accuracy indicators
   - Permission handling
   - Offline queue with auto-sync
   - LocationCapture widget component

7. **Map Dashboard**
   - Interactive map with filters
   - Real-time location visualization
   - Territory management UI
   - Statistics and analytics
   - Clustering toggle
   - Legend and controls

8. **Docker Configuration**
   - MongoDB container setup
   - Geolocation service container
   - Docker Compose orchestration
   - Health checks and monitoring

### 📂 New Structure

```
services/geolocation-service/
├── index.js                          # Main server
├── package.json                      # Dependencies
├── Dockerfile                        # Container config
├── .env.example                     # Environment template
├── routes/
│   └── geolocation.js               # API routes
├── controllers/
│   └── geolocationController.js     # Business logic
├── models/
│   ├── Location.js                  # Location schema
│   └── Territory.js                 # Territory schema
├── services/
│   ├── geocodingService.js          # Geocoding logic
│   └── locationService.js           # Location utilities
└── config/
    └── database.js                  # MongoDB connection

public/
├── map-service.js                   # Map client library
├── map-dashboard.html               # Interactive dashboard
└── location-capture.js              # Location capture widget

docker-compose.yml                   # Multi-service orchestration
Dockerfile                           # Main app container
```

### 🗺️ Using Geolocation Features

**Start the Geolocation Service:**
```bash
# Standalone
cd services/geolocation-service
npm install
npm start

# Or with Docker
docker-compose up geolocation-service mongodb
```

**Access the Map Dashboard:**
```
http://localhost:3000/map-dashboard.html
```

**Using the Map Service in Your Code:**
```javascript
// Initialize map service
const mapService = new MapService({
  apiUrl: 'http://localhost:3001/api/geo'
});

// Initialize map
mapService.initMap('map-container');

// Add marker
mapService.addMarker('map-container', {
  coordinates: [55.2708, 25.2048],
  type: 'survey',
  popup: '<strong>Survey Location</strong>'
});

// Geocode address
const result = await mapService.geocode('Burj Khalifa, Dubai');
console.log(result.coordinates);
```

**Capture Location in Forms:**
```javascript
// Initialize location capture
const locationCapture = new LocationCapture();

// Create widget
locationCapture.createCaptureWidget({
  containerId: 'location-widget',
  showMap: true,
  showAddress: true,
  onCapture: (location) => {
    console.log('Location captured:', location);
  }
});

// Or capture programmatically
const location = await locationCapture.getCurrentLocation();
await locationCapture.captureResponseLocation(surveyId, responseId);
```

## 🚀 Sprint 5: AI Frontend Integration - COMPLETED

This implementation includes all deliverables for Sprint 5:

### ✅ Deliverables

1. **AI Chat Interface**
   - Chat widget with persistent message history
   - Real-time streaming message display
   - File upload capability for context
   - Context display panel
   - AI provider selector (OpenAI, Anthropic, Google, Local)

2. **Survey Generation from AI**
   - Natural language input for survey creation
   - AI-generated survey structure
   - Real-time preview of generated surveys
   - Edit and refine capabilities
   - Save to surveys database

3. **Survey Optimization UI**
   - Load existing surveys
   - AI-powered optimization suggestions
   - Impact indicators (High/Medium/Low)
   - Apply changes selectively
   - A/B testing suggestions

4. **Response Analysis with AI**
   - AI-powered insights and trend identification
   - Natural language queries about data
   - Anomaly detection
   - Automated report generation
   - Statistical analysis dashboard

5. **Context Management UI**
   - Current context display
   - Context editor with JSON support
   - Reference file upload (images, PDFs, documents)
   - Context template suggestions
   - File management interface

## 📁 Project Structure

```
Ousamma.Survey/
├── index.js                    # Express server with AI endpoints
├── package.json                # Dependencies and scripts
├── .env.example               # Environment configuration template
├── .gitignore                 # Git ignore rules
├── README.md                  # This file
└── public/
    ├── index.html             # Landing page
    ├── survey-builder.html    # AI Survey Builder interface
    ├── dubaisurvey.html       # Survey form with AI enhancement
    ├── thankyou.html          # Thank you page
    ├── ai-service.js          # AI service client
    ├── ai-chat-widget.js      # AI chat component
    ├── survey-builder.js      # Survey builder logic
    ├── context-manager.js     # Context management component
    └── Surveys/
        └── survey-001.json    # Sample survey data
```

## 🎯 Features

### AI Chat Component

The AI chat widget provides an intelligent assistant that helps with:

- **Survey Generation**: "Create a customer satisfaction survey with 5 questions"
- **Survey Optimization**: "How can I improve this survey?"
- **Response Analysis**: "What are the key insights from the responses?"
- **General Help**: Ask any question about your surveys

**Features:**
- Persistent message history
- File upload for context
- Provider selection
- Minimize/maximize controls
- Real-time typing indicators
- Message timestamps

### Survey Generation Flow

1. **Describe Your Survey**: Enter a natural language description
2. **AI Generates**: AI creates survey structure with questions
3. **Preview**: Review generated survey with visual cards
4. **Edit**: Modify questions inline
5. **Save**: Save to surveys database

**Example Input:**
```
Create a customer satisfaction survey for our mobile app with
questions about user experience, features, and overall satisfaction
```

### Survey Optimization

**Optimization Goals:**
- Clarity improvements
- Engagement enhancements
- Completion rate optimization
- Bias reduction

**Suggestion Types:**
- Question wording improvements
- Answer option refinements
- Survey flow optimization
- A/B testing recommendations

### Response Analysis

**Analysis Types:**
- **General**: Overall insights and trends
- **Comprehensive**: Deep dive with recommendations
- **Quick Summary**: High-level overview
- **Comparative**: Compare responses across segments

**Features:**
- Natural language queries about data
- Trend identification over time
- Anomaly detection
- Statistical analysis
- Automated report generation

### Context Management

**Context Types:**
- Text-based context information
- Reference files (PDF, images, documents)
- Template-based contexts
- Custom JSON contexts

**Templates Available:**
- Customer Satisfaction Survey
- Employee Engagement Survey
- Product Feedback Survey
- Event Feedback Survey

## 🛠️ Technical Stack

### Backend
- **Node.js** with Express.js
- **File Upload**: Multer
- **CORS Support**: cors
- **Environment Config**: dotenv

### Frontend
- **Vanilla JavaScript** (ES6+)
- **No build tools** required
- **Responsive Design**
- **Modern CSS** with gradients and animations

### AI Integration
- RESTful API endpoints
- Support for multiple AI providers:
  - OpenAI GPT-4
  - Anthropic Claude
  - Google Gemini
  - Local models

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Ousamma.Survey
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start the server**
   ```bash
   npm start
   ```

5. **Access the application**
   - Landing page: http://localhost:3000
   - Survey Builder: http://localhost:3000/survey-builder.html
   - Survey Form: http://localhost:3000/dubaisurvey.html

## 🔧 Configuration

### Environment Variables

```env
# Server Configuration
PORT=3000

# AI Configuration
AI_PROVIDER=openai           # openai, anthropic, google, local
AI_API_URL=https://ousammai.onrender.com/api/ai
AI_API_KEY=your_api_key_here
AI_MODEL=gpt-4

# Optional: Provider-specific keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...
```

### AI Provider Setup

The application supports multiple AI providers. Configure your preferred provider in `.env`:

**OpenAI:**
```env
AI_PROVIDER=openai
AI_MODEL=gpt-4
OPENAI_API_KEY=sk-...
```

**Anthropic:**
```env
AI_PROVIDER=anthropic
AI_MODEL=claude-3-opus-20240229
ANTHROPIC_API_KEY=sk-ant-...
```

**Google:**
```env
AI_PROVIDER=google
AI_MODEL=gemini-pro
GOOGLE_API_KEY=...
```

## 🔌 API Endpoints

### AI Operations

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/ai/chat` | POST | Chat with AI assistant |
| `/api/ai/generate-survey` | POST | Generate survey from description |
| `/api/ai/optimize-survey` | POST | Get optimization suggestions |
| `/api/ai/analyze-responses` | POST | Analyze survey responses |
| `/api/ai/query-data` | POST | Natural language data queries |
| `/api/ai/identify-trends` | POST | Identify trends in responses |
| `/api/ai/detect-anomalies` | POST | Detect anomalies in data |
| `/api/ai/generate-report` | POST | Generate analysis report |
| `/api/ai/enhance` | POST | Enhance text with AI |
| `/api/ai/ab-test-suggestions` | POST | Get A/B testing suggestions |

### Survey Management

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/surveys` | GET | List all surveys |
| `/api/surveys/:surveyId` | GET | Get specific survey |
| `/api/surveys/save` | POST | Save survey |
| `/api/responses/save` | POST | Save survey response |
| `/api/responses/:surveyId` | GET | Get survey responses |

### Context Management

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/context/upload` | POST | Upload context file |
| `/api/context/files` | GET | List context files |
| `/api/context/files/:filename` | DELETE | Delete context file |

### Geolocation Operations (Port 3001)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/geo/location` | POST | Save location |
| `/api/geo/location/:id` | GET | Get location by ID |
| `/api/geo/locations` | GET | Get locations (query: entityId, type) |
| `/api/geo/locations/stats` | GET | Get location statistics |
| `/api/geo/geocode` | POST | Convert address to coordinates |
| `/api/geo/reverse-geocode` | POST | Convert coordinates to address |
| `/api/geo/distance` | POST | Calculate distance between points |
| `/api/geo/nearby` | POST | Find nearby locations |
| `/api/geo/territory` | POST | Create territory |
| `/api/geo/territory/:id` | GET | Get territory |
| `/api/geo/territories` | GET | Get all territories |
| `/api/geo/territory/:id` | PUT | Update territory |
| `/api/geo/territory/:id` | DELETE | Delete territory |
| `/api/geo/territory/:id/locations` | GET | Get locations in territory |
| `/api/geo/geofence/check` | POST | Check if point is in territory |

## 💡 Usage Examples

### Generate Survey with AI

```javascript
const aiService = new AIService();

const result = await aiService.generateSurvey(
  "Create a customer satisfaction survey with 5 questions",
  {
    title: "Customer Satisfaction Survey",
    numQuestions: 5,
    bilingual: true,
    languages: ['en', 'ar']
  }
);

console.log(result.survey);
```

### Optimize Existing Survey

```javascript
const result = await aiService.optimizeSurvey(
  surveyData,
  ['clarity', 'engagement', 'completion_rate']
);

console.log(result.suggestions);
```

### Analyze Responses

```javascript
const result = await aiService.analyzeResponses(
  responsesData,
  "What are the most common complaints?",
  'comprehensive'
);

console.log(result.insights);
```

### Query Data with Natural Language

```javascript
const result = await aiService.queryData(
  "What percentage of users are satisfied?",
  responsesData
);

console.log(result.answer);
```

## 🎨 UI Components

### AI Chat Widget

```javascript
// Initialize
const aiService = new AIService();
const chatWidget = new AIChatWidget('#container', aiService);

// Set context
aiService.setContext({
  application: 'Survey Builder',
  features: ['generation', 'optimization']
});

// Send message
await aiService.chat("Help me create a survey");
```

### Context Manager

```javascript
// Initialize
const contextManager = new ContextManager(aiService);

// Open modal
contextManager.open();

// Upload file
await aiService.uploadContextFile(file);

// Apply template
contextManager.applyTemplate('customer-satisfaction');
```

## 📊 Survey Data Format

```json
{
  "id": "survey-001",
  "title": "Survey Title",
  "description": "Survey description",
  "questions": [
    {
      "type": "multiple_choice",
      "question_en": "English question",
      "question_ar": "Arabic question",
      "options_en": ["Option 1", "Option 2"],
      "options_ar": ["خيار 1", "خيار 2"],
      "required": true
    }
  ]
}
```

**Supported Question Types:**
- `multiple_choice` - Radio buttons
- `checkboxes` - Multiple selection
- `dropdown` - Select dropdown
- `short_answer` - Single line text
- `paragraph` - Multi-line text
- `scale` - Numeric scale (e.g., 1-10)
- `ranked` - Drag-and-drop ranking

## 🧪 Testing

### Manual Testing Checklist

- [ ] AI Chat widget opens and closes
- [ ] Generate survey from natural language
- [ ] Preview generated survey
- [ ] Edit and delete questions
- [ ] Save survey to database
- [ ] Load existing survey
- [ ] Get optimization suggestions
- [ ] Apply suggestions
- [ ] Analyze responses
- [ ] Query data with natural language
- [ ] Generate reports
- [ ] Upload context files
- [ ] Manage context
- [ ] Submit survey responses
- [ ] Text enhancement on survey form

### Test with Sample Data

```bash
# Create test survey
curl -X POST http://localhost:3000/api/surveys/save \
  -H "Content-Type: application/json" \
  -d @public/Surveys/survey-001.json

# Submit test response
curl -X POST http://localhost:3000/api/responses/save \
  -H "Content-Type: application/json" \
  -d '{"surveyId":"survey-001","responses":{"q1":"Satisfied"}}'
```

## 🚀 Deployment

### Development

```bash
npm start
```

### Production

```bash
# Set NODE_ENV
export NODE_ENV=production

# Start with PM2
pm2 start index.js --name survey-app

# Or use the start script
npm start
```

### Docker (Optional)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## 🔒 Security Considerations

- File upload validation (type, size)
- Input sanitization
- CORS configuration
- API rate limiting (recommended)
- Environment variable protection
- Secure file storage

## 📝 Future Enhancements

- [ ] WebSocket support for real-time chat
- [ ] Advanced analytics dashboard
- [ ] Multi-language support expansion
- [ ] Survey templates library
- [ ] Collaborative editing
- [ ] Version control for surveys
- [ ] Advanced permission system
- [ ] Integration with external platforms

## 🐛 Troubleshooting

### AI API not responding
- Check AI_API_URL in .env
- Verify API key is valid
- Check network connectivity

### File upload fails
- Check file size (max 10MB)
- Verify file type is allowed
- Check uploads directory permissions

### Survey not saving
- Check write permissions on public/Surveys
- Verify JSON format is valid
- Check server logs for errors

## 📄 License

MIT License - see LICENSE file for details

## 👥 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📞 Support

For issues or questions:
- Create an issue on GitHub
- Contact: support@example.com
- Documentation: [Link to docs]

---


# WebSocket Service - Real-Time Updates

The WebSocket service provides real-time bidirectional communication between the server and clients using Socket.io. It integrates with Kafka for event streaming and supports room-based broadcasting for targeted updates.

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Installation](#installation)
- [Configuration](#configuration)
- [API Reference](#api-reference)
- [WebSocket Events](#websocket-events)
- [Room Types](#room-types)
- [Authentication](#authentication)
- [Frontend Integration](#frontend-integration)
- [Kafka Integration](#kafka-integration)
- [Testing](#testing)
- [Deployment](#deployment)

## Features

- ✅ Real-time bidirectional communication using Socket.io
- ✅ Room-based broadcasting (survey, project, user, global)
- ✅ JWT authentication support
- ✅ Anonymous connections allowed
- ✅ Kafka event streaming integration
- ✅ Rate limiting per socket and per IP
- ✅ Connection management with heartbeat/keepalive
- ✅ Auto-reconnection support
- ✅ HTTP API for triggering broadcasts
- ✅ Comprehensive logging
- ✅ Health checks and statistics

## Architecture

```
┌─────────────────┐
│  Kafka Topics   │
│  - responses    │
│  - analytics    │
│  - locations    │
│  - notifications│
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│  Kafka Consumer Service │
│  - Subscribes to topics │
│  - Processes messages   │
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐       ┌──────────────┐
│  WebSocket Service      │◄──────┤  HTTP API    │
│  - Socket.io Server     │       │  /api/...    │
│  - Room Management      │       └──────────────┘
│  - Connection Manager   │
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│  Connected Clients      │
│  - Browsers             │
│  - Mobile Apps          │
│  - Other Services       │
└─────────────────────────┘
```

## Installation

### Prerequisites

- Node.js >= 18.0.0
- Kafka and Zookeeper running
- Docker (optional)

### Local Development

```bash
cd services/websocket-service
npm install
cp .env.example .env
npm run dev
```

### Docker

```bash
docker-compose up websocket-service
```

## Configuration

### Environment Variables

```env
# Server Configuration
NODE_ENV=development
PORT=3002

# Kafka Configuration
KAFKA_BROKERS=localhost:29092
KAFKA_CLIENT_ID=websocket-service
KAFKA_GROUP_ID=websocket-consumers

# Kafka Topics
KAFKA_TOPIC_RESPONSES=survey.responses
KAFKA_TOPIC_ANALYTICS=survey.analytics
KAFKA_TOPIC_LOCATIONS=surveyor.locations
KAFKA_TOPIC_NOTIFICATIONS=system.notifications

# JWT Authentication
JWT_SECRET=your-secret-key-change-in-production

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:3002

# WebSocket Configuration
HEARTBEAT_INTERVAL=30000
CONNECTION_TIMEOUT=60000
MAX_CONNECTIONS_PER_IP=10

# Rate Limiting
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX_MESSAGES=100

# Logging
LOG_LEVEL=info
```

## API Reference

### Health Check

```http
GET /health
```

Response:
```json
{
  "status": "healthy",
  "service": "websocket-service",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 12345,
  "connections": {...}
}
```

### Broadcast to Room

```http
POST /api/broadcast/room
Content-Type: application/json

{
  "room": "survey:123",
  "event": "custom.event",
  "data": {...}
}
```

### Broadcast to User

```http
POST /api/broadcast/user
Content-Type: application/json

{
  "userId": "user123",
  "event": "custom.event",
  "data": {...}
}
```

### Global Broadcast

```http
POST /api/broadcast/global
Content-Type: application/json

{
  "event": "custom.event",
  "data": {...}
}
```

### Survey Response Broadcast

```http
POST /api/broadcast/survey-response
Content-Type: application/json

{
  "surveyId": "survey123",
  "responseId": "response456",
  "response": {...},
  "metadata": {
    "projectId": "project789"
  }
}
```

### Location Update Broadcast

```http
POST /api/broadcast/location
Content-Type: application/json

{
  "surveyorId": "surveyor123",
  "surveyId": "survey456",
  "projectId": "project789",
  "location": {
    "coordinates": {
      "latitude": 25.2048,
      "longitude": 55.2708
    },
    "accuracy": 10
  },
  "metadata": {...}
}
```

### Statistics

```http
GET /api/stats
```

Response:
```json
{
  "success": true,
  "stats": {
    "totalConnections": 42,
    "authenticatedConnections": 30,
    "anonymousConnections": 12,
    "totalRooms": 15,
    "uniqueUsers": 25,
    "roomStats": [
      {
        "name": "global",
        "connections": 42
      },
      {
        "name": "survey:123",
        "connections": 5
      }
    ]
  }
}
```

## WebSocket Events

### Client → Server

#### join_room
Join a specific room.

```javascript
socket.emit('join_room', { room: 'survey:123' });
```

#### leave_room
Leave a specific room.

```javascript
socket.emit('leave_room', { room: 'survey:123' });
```

#### ping
Heartbeat ping.

```javascript
socket.emit('ping');
```

#### get_rooms
Get list of joined rooms.

```javascript
socket.emit('get_rooms');
```

### Server → Client

#### connected
Sent when connection is established.

```javascript
socket.on('connected', (data) => {
  console.log(data);
  // {
  //   socketId: "abc123",
  //   userId: "user123",
  //   isAnonymous: false,
  //   rooms: ["global", "user:user123"],
  //   serverTime: "2024-01-01T00:00:00.000Z"
  // }
});
```

#### response.new
New survey response received.

```javascript
socket.on('response.new', (data) => {
  console.log(data);
  // {
  //   type: "response.new",
  //   surveyId: "survey123",
  //   responseId: "response456",
  //   response: {...},
  //   metadata: {...},
  //   timestamp: "2024-01-01T00:00:00.000Z"
  // }
});
```

#### analytics.update
Analytics update.

```javascript
socket.on('analytics.update', (data) => {
  console.log(data);
  // {
  //   type: "analytics.update",
  //   surveyId: "survey123",
  //   analytics: {...},
  //   updateType: "realtime",
  //   timestamp: "2024-01-01T00:00:00.000Z"
  // }
});
```

#### surveyor.location
Surveyor location update.

```javascript
socket.on('surveyor.location', (data) => {
  console.log(data);
  // {
  //   type: "surveyor.location",
  //   surveyorId: "surveyor123",
  //   surveyId: "survey456",
  //   location: {
  //     coordinates: {...},
  //     accuracy: 10
  //   },
  //   metadata: {...},
  //   timestamp: "2024-01-01T00:00:00.000Z"
  // }
});
```

#### notification
System notification.

```javascript
socket.on('notification', (data) => {
  console.log(data);
  // {
  //   type: "notification",
  //   notificationType: "info",
  //   title: "System Notification",
  //   message: "Your survey has been approved",
  //   priority: "normal",
  //   metadata: {...},
  //   timestamp: "2024-01-01T00:00:00.000Z"
  // }
});
```

#### room_joined
Confirmation of room join.

```javascript
socket.on('room_joined', (data) => {
  console.log(data);
  // { room: "survey:123", timestamp: "..." }
});
```

#### room_left
Confirmation of room leave.

```javascript
socket.on('room_left', (data) => {
  console.log(data);
  // { room: "survey:123", timestamp: "..." }
});
```

#### error
Error message.

```javascript
socket.on('error', (data) => {
  console.error(data);
  // { message: "Error description" }
});
```

#### rate_limit_exceeded
Rate limit exceeded warning.

```javascript
socket.on('rate_limit_exceeded', (data) => {
  console.warn(data);
  // { message: "Too many messages", retryAfter: 60000 }
});
```

## Room Types

### Global Room
- **Name:** `global`
- **Purpose:** System-wide announcements and general updates
- **Auto-join:** All connections

### Survey Room
- **Name:** `survey:{surveyId}`
- **Purpose:** Survey-specific updates (responses, analytics)
- **Example:** `survey:123abc`

### Project Room
- **Name:** `project:{projectId}`
- **Purpose:** Project-specific updates
- **Example:** `project:456def`

### User Room
- **Name:** `user:{userId}`
- **Purpose:** User-specific notifications
- **Auto-join:** Authenticated users
- **Example:** `user:789ghi`

## Authentication

### JWT Authentication

The service supports JWT authentication via the `auth.token` parameter:

```javascript
const socket = io('http://localhost:3002', {
  auth: {
    token: 'your-jwt-token'
  }
});
```

### Anonymous Connections

Anonymous connections are allowed but have limited permissions:
- Can only join the `global` room
- Cannot access user-specific or restricted rooms

### Token Format

JWT tokens should contain:
```json
{
  "userId": "user123",
  "email": "user@example.com",
  "role": "user",
  "iat": 1234567890,
  "exp": 1234567890
}
```

## Frontend Integration

### Using the WebSocket Client Library

```html
<!-- Include the WebSocket client library -->
<script src="websocket-client.js"></script>

<script>
  // Initialize client
  const wsClient = new WebSocketClient({
    url: 'http://localhost:3002',
    token: 'your-jwt-token', // Optional
    autoReconnect: true,
    enableToasts: true
  });

  // Setup event handlers
  wsClient.on('response.new', (data) => {
    console.log('New response:', data);
    // Update UI
  });

  wsClient.on('surveyor.location', (data) => {
    console.log('Location update:', data);
    // Update map
  });

  // Connect
  wsClient.connect().then(() => {
    console.log('Connected to WebSocket server');

    // Join specific rooms
    wsClient.joinSurvey('survey123');
    wsClient.joinProject('project456');
  });
</script>
```

### Manual Integration

```javascript
// Load Socket.io client
const socket = io('http://localhost:3002', {
  transports: ['websocket', 'polling'],
  reconnection: true,
  auth: {
    token: 'your-jwt-token' // Optional
  }
});

// Connection events
socket.on('connect', () => {
  console.log('Connected:', socket.id);
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
});

// Join rooms
socket.emit('join_room', { room: 'survey:123' });

// Listen for events
socket.on('response.new', (data) => {
  console.log('New response:', data);
});
```

## Kafka Integration

### Publishing Events to Kafka

Other services can publish events to Kafka topics, which will be automatically broadcast to WebSocket clients:

#### Survey Response Event

Topic: `survey.responses`

```json
{
  "surveyId": "survey123",
  "responseId": "response456",
  "response": {...},
  "metadata": {
    "projectId": "project789",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

#### Analytics Update Event

Topic: `survey.analytics`

```json
{
  "surveyId": "survey123",
  "projectId": "project789",
  "analytics": {...},
  "type": "realtime"
}
```

#### Location Update Event

Topic: `surveyor.locations`

```json
{
  "surveyorId": "surveyor123",
  "surveyId": "survey456",
  "projectId": "project789",
  "location": {
    "coordinates": {
      "latitude": 25.2048,
      "longitude": 55.2708
    },
    "accuracy": 10
  },
  "metadata": {...}
}
```

#### Notification Event

Topic: `system.notifications`

```json
{
  "userId": "user123", // Optional, omit for global notifications
  "type": "info",
  "title": "Notification Title",
  "message": "Notification message",
  "priority": "normal",
  "metadata": {...}
}
```

## Testing

### Manual Testing with Socket.io Client

```javascript
// Install socket.io-client
npm install socket.io-client

// Test script
const io = require('socket.io-client');

const socket = io('http://localhost:3002');

socket.on('connect', () => {
  console.log('Connected:', socket.id);

  // Join room
  socket.emit('join_room', { room: 'global' });
});

socket.on('notification', (data) => {
  console.log('Notification:', data);
});

socket.on('error', (error) => {
  console.error('Error:', error);
});
```

### Testing Broadcast API

```bash
# Test broadcast to room
curl -X POST http://localhost:3002/api/broadcast/room \
  -H "Content-Type: application/json" \
  -d '{
    "room": "global",
    "event": "test.message",
    "data": {
      "message": "Hello, World!"
    }
  }'

# Get statistics
curl http://localhost:3002/api/stats
```

### Testing with Kafka

```bash
# Produce a test message to Kafka
docker exec -it survey-kafka kafka-console-producer \
  --bootstrap-server localhost:9092 \
  --topic survey.responses

# Paste this JSON:
{"surveyId":"test123","responseId":"resp456","response":{"question1":"answer1"},"metadata":{}}
```

## Deployment

### Docker Deployment

The service is configured in `docker-compose.yml`:

```yaml
websocket-service:
  build: ./services/websocket-service
  ports:
    - "3002:3002"
  environment:
    - NODE_ENV=production
    - KAFKA_BROKERS=kafka:9092
    - JWT_SECRET=${JWT_SECRET}
  depends_on:
    - kafka
```

Start with:
```bash
docker-compose up -d websocket-service
```

### Production Considerations

1. **Use a strong JWT_SECRET** - Change from default value
2. **Configure ALLOWED_ORIGINS** - Restrict to your domain
3. **Set up monitoring** - Monitor connection counts and errors
4. **Enable HTTPS** - Use SSL/TLS in production
5. **Scale horizontally** - Use Redis adapter for Socket.io clustering
6. **Configure rate limits** - Adjust based on your traffic
7. **Set up logging** - Use structured logging with log aggregation

### Scaling with Redis

For multiple instances, use Redis adapter:

```javascript
// In index.js
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');

const pubClient = createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();

io.adapter(createAdapter(pubClient, subClient));
```

## Troubleshooting

### Connection Issues

1. Check that the service is running: `curl http://localhost:3002/health`
2. Verify CORS settings in `ALLOWED_ORIGINS`
3. Check browser console for connection errors
4. Verify JWT token is valid (if using authentication)

### Kafka Integration Issues

1. Verify Kafka is running: `docker ps | grep kafka`
2. Check Kafka consumer logs: `docker logs websocket-service`
3. Verify topics exist: `docker exec -it survey-kafka kafka-topics --list --bootstrap-server localhost:9092`
4. Test message production manually

### Performance Issues

1. Check connection count: `curl http://localhost:3002/api/stats`
2. Verify rate limiting isn't too aggressive
3. Monitor memory usage
4. Consider scaling horizontally with Redis adapter

## Support

For issues or questions:
- Check the logs: `docker logs websocket-service`
- Review the health endpoint: `http://localhost:3002/health`
- Check statistics: `http://localhost:3002/api/stats`

## License

MIT

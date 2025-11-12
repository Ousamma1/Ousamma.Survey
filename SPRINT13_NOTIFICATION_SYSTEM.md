# Sprint 13: Notification Service

## Overview
Multi-channel notification system with support for email, SMS, push notifications, and in-app notifications.

## Architecture

### Services

#### 1. Notification Service (Port 3006)
- **Purpose**: Main API service for managing notifications
- **Technology**: Node.js, Express, MongoDB, Kafka
- **Responsibilities**:
  - REST API for notification CRUD operations
  - Notification template management
  - User notification preferences
  - Publishing notification events to Kafka

#### 2. Notification Consumer Service (Port 3004)
- **Purpose**: Consumes Kafka events and sends notifications
- **Technology**: Node.js, Kafka, Nodemailer, Twilio, Web Push
- **Responsibilities**:
  - Consuming notification events from Kafka
  - Sending emails via SMTP (Nodemailer)
  - Sending SMS via Twilio
  - Sending push notifications (Web Push & FCM)
  - Real-time notifications via WebSocket

## Features

### Notification Channels
1. **Email** - SMTP-based email notifications using Nodemailer
2. **SMS** - SMS notifications using Twilio
3. **Push** - Web push and FCM for mobile
4. **In-App** - Real-time notifications via WebSocket

### Notification Types
- Survey created
- Survey published
- Response submitted
- Surveyor registered
- Target reached
- Account expiring
- Surveyor assigned
- System alerts

### Frontend UI
- Notification bell with unread count badge
- Dropdown for recent notifications
- Full notification page with filtering
- Notification preferences/settings
- Real-time updates via WebSocket
- Mark as read/unread functionality

## API Endpoints

### Notifications
```
POST   /api/notifications              - Create notification
GET    /api/notifications/user/:userId - Get user notifications
GET    /api/notifications/:id          - Get notification by ID
PUT    /api/notifications/:id/read     - Mark as read
PUT    /api/notifications/user/:userId/read-all - Mark all as read
POST   /api/notifications/send         - Send immediate notification
DELETE /api/notifications/:id          - Delete notification
GET    /api/notifications/user/:userId/unread-count - Get unread count
```

### Templates
```
GET    /api/templates                  - List all templates
GET    /api/templates/:id              - Get template by ID
GET    /api/templates/name/:name       - Get template by name
POST   /api/templates                  - Create template
PUT    /api/templates/:id              - Update template
DELETE /api/templates/:id              - Delete template
POST   /api/templates/:id/render       - Render template with variables
```

### Preferences
```
GET    /api/preferences/:userId                  - Get user preferences
PUT    /api/preferences/:userId                  - Update preferences
POST   /api/preferences/:userId/device-token     - Add device token
DELETE /api/preferences/:userId/device-token     - Remove device token
PUT    /api/preferences/:userId/channels         - Update channel preferences
PUT    /api/preferences/:userId/categories       - Update category preferences
```

## MongoDB Models

### Notification
```javascript
{
  userId: String,
  type: 'email' | 'sms' | 'push' | 'in-app',
  title: String,
  message: String,
  data: Object,
  status: 'pending' | 'sent' | 'failed' | 'delivered' | 'read',
  priority: 'low' | 'normal' | 'high' | 'urgent',
  channel: String,
  recipient: Object,
  metadata: Object,
  attempts: Number,
  sentAt: Date,
  readAt: Date,
  expiresAt: Date,
  timestamps: true
}
```

### NotificationTemplate
```javascript
{
  name: String,
  type: 'email' | 'sms' | 'push' | 'in-app',
  subject: String,
  body: String,
  htmlBody: String,
  variables: [String],
  category: 'survey' | 'response' | 'system' | 'account' | 'alert' | 'marketing',
  active: Boolean,
  priority: String,
  metadata: Object,
  timestamps: true
}
```

### NotificationPreference
```javascript
{
  userId: String,
  channels: {
    email: { enabled: Boolean, address: String, verified: Boolean },
    sms: { enabled: Boolean, phoneNumber: String, verified: Boolean },
    push: { enabled: Boolean, deviceTokens: [Object] },
    inApp: { enabled: Boolean }
  },
  categories: {
    survey: Boolean,
    response: Boolean,
    system: Boolean,
    account: Boolean,
    alert: Boolean,
    marketing: Boolean
  },
  quietHours: {
    enabled: Boolean,
    start: String,
    end: String,
    timezone: String
  },
  language: String,
  timestamps: true
}
```

## Configuration

### Environment Variables

#### Email (SMTP)
```bash
EMAIL_PROVIDER=console|smtp
EMAIL_FROM=noreply@survey-platform.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

#### SMS (Twilio)
```bash
SMS_PROVIDER=console|twilio
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_FROM_NUMBER=+1234567890
```

#### Push Notifications
```bash
PUSH_PROVIDER=console|web-push|fcm

# Web Push (for web browsers)
VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
VAPID_SUBJECT=mailto:admin@survey-platform.com

# FCM (for mobile apps)
FCM_SERVER_KEY=your-fcm-server-key
```

#### Other Configuration
```bash
MONGODB_URI=mongodb://mongodb:27017/notifications
KAFKA_BROKERS=kafka:9092
WEBSOCKET_URL=http://websocket-service:3002
MAX_RETRY_ATTEMPTS=3
RETRY_DELAY_MS=5000
```

## Setup & Installation

### 1. Install Dependencies
```bash
cd services/notification-service
npm install

cd ../notification-consumer-service
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env` and configure your providers:

```bash
cp .env.example .env
# Edit .env with your credentials
```

### 3. Start Services
```bash
# Using Docker Compose
docker-compose up notification-service notification-consumer

# Or individually
cd services/notification-service
npm start

cd services/notification-consumer-service
npm start
```

### 4. Access the UI
Open http://localhost:3000/notifications.html

## Usage Examples

### Send Email Notification
```javascript
const response = await fetch('http://localhost:3006/api/notifications/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user123',
    type: 'email',
    recipient: {
      to: 'user@example.com',
      subject: 'Survey Published',
      body: 'Your survey has been published!',
      htmlBody: '<h2>Survey Published</h2><p>Your survey is now live!</p>'
    },
    priority: 'high'
  })
});
```

### Send Notification Using Template
```javascript
const response = await fetch('http://localhost:3006/api/notifications/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user123',
    type: 'email',
    templateName: 'survey-published',
    variables: {
      surveyTitle: 'Customer Satisfaction Survey',
      surveyUrl: 'https://example.com/survey/123'
    },
    recipient: {
      to: 'user@example.com'
    }
  })
});
```

### Get User Notifications
```javascript
const response = await fetch(
  'http://localhost:3006/api/notifications/user/user123?limit=20&status=unread'
);
const data = await response.json();
console.log(data.data); // Array of notifications
console.log(data.unreadCount); // Unread count
```

### Mark Notification as Read
```javascript
await fetch('http://localhost:3006/api/notifications/notif-id-123/read', {
  method: 'PUT'
});
```

### Update Preferences
```javascript
await fetch('http://localhost:3006/api/preferences/user123', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    channels: {
      email: { enabled: true },
      sms: { enabled: false },
      push: { enabled: true }
    },
    categories: {
      survey: true,
      response: true,
      marketing: false
    }
  })
});
```

## Kafka Events

The system listens to these Kafka topics:

- `survey.created` - When a survey is created
- `survey.published` - When a survey is published
- `response.submitted` - When a response is submitted
- `surveyor.registered` - When a surveyor registers
- `notification.send` - Generic notification event
- `notification.email` - Email-specific event
- `notification.sms` - SMS-specific event
- `notification.push` - Push notification event

## Real-Time Notifications

The system integrates with the WebSocket service to provide real-time notifications:

```javascript
// Frontend WebSocket client
const ws = new WebSocketClient();

ws.on('notification', (data) => {
  console.log('New notification:', data);
  // Update UI with new notification
});

ws.on('notification.update', (data) => {
  console.log('Notification updated:', data);
  // Update notification status in UI
});
```

## Testing

### Test Email Service
```bash
# Console mode (development)
EMAIL_PROVIDER=console npm start

# SMTP mode (production)
EMAIL_PROVIDER=smtp SMTP_HOST=smtp.gmail.com npm start
```

### Test SMS Service
```bash
# Console mode
SMS_PROVIDER=console npm start

# Twilio mode
SMS_PROVIDER=twilio TWILIO_ACCOUNT_SID=xxx npm start
```

### Test Push Notifications
```bash
# Generate VAPID keys
node -e "const webpush = require('web-push'); console.log(webpush.generateVAPIDKeys());"

# Use keys in .env
VAPID_PUBLIC_KEY=xxx
VAPID_PRIVATE_KEY=yyy
```

## Troubleshooting

### Email Not Sending
1. Check EMAIL_PROVIDER is set to 'smtp'
2. Verify SMTP credentials
3. Enable "Less secure app access" for Gmail (or use App Password)
4. Check logs: `docker-compose logs notification-consumer`

### SMS Not Sending
1. Verify Twilio credentials
2. Check phone number format (+1234567890)
3. Ensure Twilio account has credits
4. Check logs for error messages

### Push Notifications Not Working
1. Verify VAPID keys are configured
2. Request notification permission in browser
3. Check browser console for errors
4. Ensure service worker is registered

### Real-Time Notifications Not Appearing
1. Verify WebSocket service is running
2. Check WEBSOCKET_URL configuration
3. Open browser console and check WebSocket connection
4. Verify Kafka is running and accessible

## Performance

- **MongoDB Indexes**: Optimized queries with indexes on userId, status, type, createdAt
- **TTL Index**: Automatic cleanup of old notifications (expiresAt)
- **Batch Processing**: Consumer can process notifications in batches
- **Retry Logic**: Failed notifications are retried with exponential backoff
- **Caching**: Notification preferences can be cached in Redis

## Security

- **Rate Limiting**: API endpoints are rate-limited
- **Input Validation**: Joi validation for all inputs
- **CORS**: Configured CORS for allowed origins
- **Helmet**: Security headers via Helmet middleware
- **Authentication**: Ready for JWT/session integration

## Future Enhancements

- [ ] Notification scheduling (send at specific time)
- [ ] Notification batching (digest emails)
- [ ] A/B testing for notification templates
- [ ] Analytics dashboard for notification metrics
- [ ] Unsubscribe management
- [ ] Multi-language support
- [ ] Rich media in notifications
- [ ] Notification grouping/threading

## License
MIT

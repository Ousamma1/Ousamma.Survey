# API Documentation

Complete API reference for the Ousamma Survey System.

## Table of Contents
- [Overview](#overview)
- [Authentication](#authentication)
- [Rate Limiting](#rate-limiting)
- [Error Handling](#error-handling)
- [Endpoints](#endpoints)
- [WebSocket API](#websocket-api)
- [Webhooks](#webhooks)
- [SDKs](#sdks)

---

## Overview

The Ousamma Survey System provides a comprehensive REST API built on microservices architecture. All endpoints return JSON responses and follow RESTful conventions.

**Base URLs:**
- Development: `http://localhost:3000`
- Production: `https://api.yourcompany.com`

**API Version:** v1.0
**OpenAPI Spec:** [openapi.yaml](./openapi.yaml)

---

## Authentication

### JWT Authentication

Most endpoints require JWT (JSON Web Token) authentication. Include the token in the `Authorization` header:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Getting a Token

**Endpoint:** `POST /api/auth/login`

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900,
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "admin"
  }
}
```

### Token Refresh

Tokens expire after 15 minutes. Use the refresh token to get a new access token:

**Endpoint:** `POST /api/auth/refresh`

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### API Keys

For server-to-server communication, use API keys:

```http
X-API-Key: your-api-key-here
```

---

## Rate Limiting

Rate limits protect the API from abuse and ensure fair usage.

### Default Limits
- **General endpoints:** 100 requests per 15 minutes per IP
- **Authentication endpoints:** 5 requests per 15 minutes per IP
- **File upload endpoints:** 10 requests per hour per IP
- **AI endpoints:** 20 requests per hour per user

### Rate Limit Headers

Responses include rate limit information:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1699564800
```

### Exceeding Limits

When rate limit is exceeded, you'll receive:

```json
{
  "success": false,
  "error": "Too many requests",
  "code": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 900
}
```

**HTTP Status:** 429 Too Many Requests

---

## Error Handling

### Error Response Format

All errors follow a consistent format:

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid input data |
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource already exists |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily unavailable |

### Validation Errors

Validation errors include field-specific details:

```json
{
  "success": false,
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": {
    "email": "Invalid email format",
    "password": "Password must be at least 8 characters"
  }
}
```

---

## Endpoints

### Authentication

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "name": "John Doe",
  "role": "surveyor"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

#### Logout
```http
POST /api/auth/logout
Authorization: Bearer <token>
```

#### Verify 2FA
```http
POST /api/auth/verify-2fa
Authorization: Bearer <token>
Content-Type: application/json

{
  "code": "123456"
}
```

---

### AI Services

#### Generate Survey
```http
POST /api/ai/generate-survey
Authorization: Bearer <token>
Content-Type: application/json

{
  "description": "Create a customer satisfaction survey for retail with 10 questions",
  "language": "en",
  "questionCount": 10,
  "includeAnalytics": true
}
```

**Response:**
```json
{
  "success": true,
  "survey": {
    "title": "Customer Satisfaction Survey",
    "description": "Measure customer satisfaction in retail",
    "questions": [...]
  },
  "suggestions": [
    "Consider adding demographic questions",
    "Include NPS score"
  ]
}
```

#### Optimize Survey
```http
POST /api/ai/optimize-survey
Authorization: Bearer <token>
Content-Type: application/json

{
  "survey": {
    "title": "My Survey",
    "questions": [...]
  }
}
```

#### Analyze Responses
```http
POST /api/ai/analyze-responses
Authorization: Bearer <token>
Content-Type: application/json

{
  "surveyId": "retail-survey-2024",
  "analysisType": "sentiment"
}
```

---

### Survey Management

#### List Surveys
```http
GET /api/surveys?page=1&limit=20&status=active&search=retail
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "surveys": [...],
  "pagination": {
    "total": 150,
    "page": 1,
    "pages": 8,
    "limit": 20
  }
}
```

#### Get Survey
```http
GET /api/surveys/retail-survey-2024
Authorization: Bearer <token>
```

#### Create/Update Survey
```http
POST /api/surveys/save
Authorization: Bearer <token>
Content-Type: application/json

{
  "surveyId": "retail-survey-2024",
  "title": "Retail Customer Satisfaction",
  "description": "Measure satisfaction",
  "questions": [
    {
      "id": "q1",
      "type": "radio",
      "text": "How satisfied are you?",
      "required": true,
      "options": [
        {"value": "5", "label": "Very Satisfied", "score": 5},
        {"value": "4", "label": "Satisfied", "score": 4},
        {"value": "3", "label": "Neutral", "score": 3},
        {"value": "2", "label": "Dissatisfied", "score": 2},
        {"value": "1", "label": "Very Dissatisfied", "score": 1}
      ]
    }
  ],
  "status": "active"
}
```

#### Delete Survey
```http
DELETE /api/surveys/retail-survey-2024
Authorization: Bearer <token>
```

---

### Response Collection

#### Submit Response
```http
POST /api/responses/save
Content-Type: application/json

{
  "surveyId": "retail-survey-2024",
  "answers": {
    "q1": "5",
    "q2": "Excellent service",
    "q3": ["product_quality", "customer_service"]
  },
  "status": "completed",
  "metadata": {
    "location": {
      "type": "Point",
      "coordinates": [55.2708, 25.2048]
    }
  }
}
```

#### Get Responses
```http
GET /api/responses/retail-survey-2024?status=completed&startDate=2024-01-01&endDate=2024-12-31
Authorization: Bearer <token>
```

---

### Surveyor Management

#### List Surveyors
```http
GET /api/surveyors?status=active&region=Dubai
Authorization: Bearer <token>
```

#### Create Surveyor
```http
POST /api/surveyors
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+971501234567",
  "employeeId": "EMP001",
  "region": "Dubai",
  "password": "SecurePass123!",
  "territory": ["Downtown", "Marina"]
}
```

#### Update Surveyor
```http
PUT /api/surveyors/507f1f77bcf86cd799439011
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "active",
  "region": "Abu Dhabi"
}
```

#### Bulk Import
```http
POST /api/surveyors/bulk
Authorization: Bearer <token>
Content-Type: application/json

{
  "surveyors": [
    {
      "name": "John Doe",
      "email": "john@example.com",
      "password": "pass123"
    },
    {
      "name": "Jane Smith",
      "email": "jane@example.com",
      "password": "pass456"
    }
  ]
}
```

---

### Analytics

#### Get Survey Analytics
```http
GET /api/analytics/survey/retail-survey-2024?startDate=2024-01-01&endDate=2024-12-31
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "analytics": {
    "surveyId": "retail-survey-2024",
    "totalResponses": 1547,
    "completionRate": 87.5,
    "averageTime": 245,
    "questionAnalytics": [
      {
        "questionId": "q1",
        "questionText": "How satisfied are you?",
        "responseCount": 1547,
        "distribution": {
          "5": 678,
          "4": 521,
          "3": 198,
          "2": 98,
          "1": 52
        },
        "average": 4.2,
        "median": 4,
        "mode": "5"
      }
    ]
  }
}
```

#### Export Data
```http
GET /api/analytics/survey/retail-survey-2024/export?format=csv
Authorization: Bearer <token>
```

#### Real-time Analytics
```http
GET /api/analytics/survey/retail-survey-2024/realtime
Authorization: Bearer <token>
```

---

### Geolocation

#### Capture Location
```http
POST /api/geolocation/capture
Content-Type: application/json

{
  "surveyId": "retail-survey-2024",
  "responseId": "507f1f77bcf86cd799439011",
  "coordinates": [55.2708, 25.2048],
  "accuracy": 10
}
```

#### Reverse Geocode
```http
GET /api/geolocation/reverse?lat=25.2048&lon=55.2708
```

**Response:**
```json
{
  "success": true,
  "address": {
    "street": "Sheikh Zayed Road",
    "city": "Dubai",
    "state": "Dubai",
    "country": "UAE",
    "postalCode": "00000"
  }
}
```

---

### Notifications

#### Send Notification
```http
POST /api/notifications/send
Authorization: Bearer <token>
Content-Type: application/json

{
  "type": "email",
  "to": "user@example.com",
  "template": "survey-invitation",
  "data": {
    "surveyTitle": "Customer Satisfaction Survey",
    "surveyLink": "https://survey.com/retail-2024"
  }
}
```

#### Get Notification Status
```http
GET /api/notifications/507f1f77bcf86cd799439011/status
Authorization: Bearer <token>
```

---

### Projects

#### Create Project
```http
POST /api/projects
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Q4 2024 Campaign",
  "description": "Customer feedback for Q4",
  "surveys": ["survey1", "survey2"],
  "members": ["user1", "user2"]
}
```

#### Get Project Analytics
```http
GET /api/analytics/group/507f1f77bcf86cd799439011
Authorization: Bearer <token>
```

---

### Admin

#### System Health
```http
GET /api/admin/health
Authorization: Bearer <token>
```

**Response:**
```json
{
  "status": "ok",
  "services": {
    "mongodb": "connected",
    "redis": "connected",
    "kafka": "connected"
  },
  "metrics": {
    "uptime": 864000,
    "memory": {
      "used": 512,
      "total": 2048
    },
    "cpu": 15.5
  }
}
```

#### View Audit Logs
```http
GET /api/admin/audit-logs?startDate=2024-01-01&userId=507f1f77bcf86cd799439011
Authorization: Bearer <token>
```

---

### GDPR Compliance

#### Export User Data
```http
POST /api/gdpr/export
Authorization: Bearer <token>
Content-Type: application/json

{
  "userId": "507f1f77bcf86cd799439011"
}
```

#### Delete User Data
```http
POST /api/gdpr/delete
Authorization: Bearer <token>
Content-Type: application/json

{
  "userId": "507f1f77bcf86cd799439011",
  "confirmation": "DELETE"
}
```

---

## WebSocket API

Real-time updates via WebSocket connection.

### Connection

```javascript
const ws = new WebSocket('ws://localhost:3002');

// Authentication
ws.send(JSON.stringify({
  type: 'auth',
  token: 'your-jwt-token'
}));
```

### Subscribe to Events

```javascript
// Subscribe to survey responses
ws.send(JSON.stringify({
  type: 'subscribe',
  channel: 'survey.responses',
  surveyId: 'retail-survey-2024'
}));

// Listen for updates
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('New response:', data);
};
```

### Event Types

| Event | Description |
|-------|-------------|
| `survey.created` | New survey created |
| `survey.updated` | Survey modified |
| `response.submitted` | New response received |
| `analytics.updated` | Analytics data changed |
| `notification.sent` | Notification delivered |

---

## Webhooks

Configure webhooks to receive real-time notifications of events.

### Configuration

```http
POST /api/webhooks
Authorization: Bearer <token>
Content-Type: application/json

{
  "url": "https://your-server.com/webhook",
  "events": ["response.submitted", "survey.completed"],
  "secret": "your-webhook-secret"
}
```

### Webhook Payload

```json
{
  "event": "response.submitted",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "surveyId": "retail-survey-2024",
    "responseId": "507f1f77bcf86cd799439011",
    "status": "completed"
  },
  "signature": "sha256=..."
}
```

### Verifying Webhooks

```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const hash = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');

  return `sha256=${hash}` === signature;
}
```

---

## SDKs

Official SDKs for popular languages:

### JavaScript/Node.js

```bash
npm install @ousamma/survey-sdk
```

```javascript
const { SurveyClient } = require('@ousamma/survey-sdk');

const client = new SurveyClient({
  apiKey: 'your-api-key',
  baseURL: 'https://api.yourcompany.com'
});

// Create survey
const survey = await client.surveys.create({
  title: 'Customer Satisfaction',
  questions: [...]
});

// Submit response
await client.responses.submit({
  surveyId: 'retail-2024',
  answers: { q1: '5' }
});
```

### Python

```bash
pip install ousamma-survey
```

```python
from ousamma import SurveyClient

client = SurveyClient(api_key='your-api-key')

# Create survey
survey = client.surveys.create(
    title='Customer Satisfaction',
    questions=[...]
)

# Get analytics
analytics = client.analytics.get(survey_id='retail-2024')
```

### PHP

```bash
composer require ousamma/survey-sdk
```

```php
use Ousamma\SurveyClient;

$client = new SurveyClient('your-api-key');

// Create survey
$survey = $client->surveys->create([
    'title' => 'Customer Satisfaction',
    'questions' => [...]
]);
```

---

## Best Practices

### 1. Use Caching

Cache frequently accessed data to reduce API calls:

```javascript
const cache = new Map();

async function getSurvey(id) {
  if (cache.has(id)) {
    return cache.get(id);
  }

  const survey = await api.get(`/surveys/${id}`);
  cache.set(id, survey);
  return survey;
}
```

### 2. Handle Rate Limits

Implement exponential backoff:

```javascript
async function apiCall(endpoint, retries = 3) {
  try {
    return await fetch(endpoint);
  } catch (error) {
    if (error.status === 429 && retries > 0) {
      const delay = Math.pow(2, 3 - retries) * 1000;
      await new Promise(r => setTimeout(r, delay));
      return apiCall(endpoint, retries - 1);
    }
    throw error;
  }
}
```

### 3. Validate Input

Always validate data before sending:

```javascript
const Joi = require('joi');

const surveySchema = Joi.object({
  title: Joi.string().min(3).max(200).required(),
  questions: Joi.array().min(1).required()
});

const { error, value } = surveySchema.validate(data);
if (error) {
  console.error('Validation error:', error.details);
}
```

### 4. Use Pagination

For large datasets, always use pagination:

```javascript
async function getAllSurveys() {
  let page = 1;
  const allSurveys = [];

  while (true) {
    const { surveys, pagination } = await api.get(`/surveys?page=${page}`);
    allSurveys.push(...surveys);

    if (page >= pagination.pages) break;
    page++;
  }

  return allSurveys;
}
```

### 5. Secure API Keys

Never expose API keys in client-side code:

```javascript
// ❌ Bad - Client-side
const apiKey = 'sk-1234567890';

// ✅ Good - Server-side only
const apiKey = process.env.OUSAMMA_API_KEY;
```

---

## Support

- **Documentation**: https://docs.ousamma.com
- **GitHub Issues**: https://github.com/Ousamma1/Ousamma.Survey/issues
- **Email**: api-support@ousamma.com
- **Status Page**: https://status.ousamma.com

---

**API Documentation Version**: 1.0
**Last Updated**: 2025-11-14

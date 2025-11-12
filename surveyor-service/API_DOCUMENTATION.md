# Surveyor Management Service - API Documentation

## Overview

The Surveyor Management Service is a microservice for managing surveyors, their assignments, and tracking their activities. It provides comprehensive CRUD operations, bulk import capabilities, assignment management, and performance tracking.

**Base URL:** `http://localhost:3001/api`

---

## Table of Contents

1. [Surveyor Endpoints](#surveyor-endpoints)
2. [Assignment Endpoints](#assignment-endpoints)
3. [Activity Endpoints](#activity-endpoints)
4. [Models](#models)
5. [Error Handling](#error-handling)

---

## Surveyor Endpoints

### Create Surveyor

Create a new surveyor with a temporary password.

**Endpoint:** `POST /surveyors`

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "region": "Dubai",
  "assignedTerritories": ["Zone A", "Zone B"],
  "languages": ["English", "Arabic"],
  "expirationDays": 30,
  "notes": "Experienced surveyor"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Surveyor created successfully",
  "surveyor": {
    "id": "uuid-here",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "plainPassword": "Abc123xyz!",
    "expirationDate": "2025-12-12T00:00:00.000Z",
    "status": "active",
    "region": "Dubai",
    "assignedTerritories": ["Zone A", "Zone B"],
    "languages": ["English", "Arabic"],
    "createdBy": "admin",
    "createdAt": "2025-11-12T00:00:00.000Z"
  }
}
```

**Note:** The `plainPassword` is only returned once upon creation. Store it securely.

---

### Bulk Import Surveyors

Import multiple surveyors at once from a JSON array.

**Endpoint:** `POST /surveyors/bulk`

**Request Body:**
```json
{
  "surveyors": [
    {
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "region": "Dubai"
    },
    {
      "name": "Jane Smith",
      "email": "jane@example.com",
      "phone": "+1234567891",
      "region": "Abu Dhabi"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Bulk import completed: 2 successful, 0 failed",
  "results": {
    "successful": [
      {
        "id": "uuid-1",
        "name": "John Doe",
        "email": "john@example.com"
      },
      {
        "id": "uuid-2",
        "name": "Jane Smith",
        "email": "jane@example.com"
      }
    ],
    "failed": [],
    "passwords": {
      "john@example.com": "Abc123xyz!",
      "jane@example.com": "Xyz456abc!"
    }
  }
}
```

---

### List Surveyors

Get a paginated list of surveyors with optional filtering.

**Endpoint:** `GET /surveyors`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `status` (optional): Filter by status (active, inactive, expired)
- `region` (optional): Filter by region
- `search` (optional): Search by name, email, or phone
- `sortBy` (optional): Field to sort by (default: createdAt)
- `sortOrder` (optional): Sort order (asc, desc) (default: desc)

**Example:** `GET /surveyors?page=1&limit=10&status=active&search=john`

**Response:**
```json
{
  "success": true,
  "surveyors": [
    {
      "id": "uuid-here",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "status": "active",
      "region": "Dubai",
      "expirationDate": "2025-12-12T00:00:00.000Z",
      "assignedSurveys": ["assignment-id-1"],
      "assignedTerritories": ["Zone A"],
      "createdAt": "2025-11-12T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "pages": 3
  }
}
```

---

### Get Surveyor by ID

Get detailed information about a specific surveyor.

**Endpoint:** `GET /surveyors/:id`

**Response:**
```json
{
  "success": true,
  "surveyor": {
    "id": "uuid-here",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "status": "active",
    "region": "Dubai",
    "expirationDate": "2025-12-12T00:00:00.000Z",
    "assignedSurveys": ["assignment-id-1"],
    "assignedTerritories": ["Zone A"],
    "languages": ["English", "Arabic"],
    "lastLoginAt": "2025-11-12T10:30:00.000Z",
    "createdBy": "admin",
    "createdAt": "2025-11-12T00:00:00.000Z",
    "updatedAt": "2025-11-12T00:00:00.000Z"
  }
}
```

---

### Update Surveyor

Update surveyor information.

**Endpoint:** `PUT /surveyors/:id`

**Request Body:**
```json
{
  "name": "John Updated Doe",
  "phone": "+1234567899",
  "region": "Sharjah",
  "status": "active"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Surveyor updated successfully",
  "surveyor": {
    // Updated surveyor object
  }
}
```

---

### Deactivate Surveyor

Deactivate a surveyor (soft delete). This also cancels all active assignments.

**Endpoint:** `DELETE /surveyors/:id`

**Response:**
```json
{
  "success": true,
  "message": "Surveyor deactivated successfully"
}
```

---

### Extend Expiration

Extend the expiration date of a surveyor account.

**Endpoint:** `POST /surveyors/:id/extend`

**Request Body:**
```json
{
  "days": 30
}
```

**Response:**
```json
{
  "success": true,
  "message": "Expiration extended by 30 days",
  "surveyor": {
    // Updated surveyor object with new expiration date
  }
}
```

---

### Get Surveyor Performance

Get comprehensive performance metrics for a surveyor.

**Endpoint:** `GET /surveyors/:id/performance`

**Query Parameters:**
- `startDate` (optional): Filter activities from this date
- `endDate` (optional): Filter activities until this date

**Response:**
```json
{
  "success": true,
  "performance": {
    "surveyorId": "uuid-here",
    "surveyorName": "John Doe",
    "period": {
      "startDate": "2025-01-01",
      "endDate": "now"
    },
    "assignments": {
      "total": 10,
      "active": 3,
      "completed": 6,
      "pending": 1,
      "cancelled": 0,
      "completionRate": 60
    },
    "responses": {
      "target": 500,
      "achieved": 450,
      "remaining": 50,
      "achievementRate": 90
    },
    "activity": {
      "totalLogins": 45,
      "totalResponses": 450,
      "lastLogin": "2025-11-12T10:30:00.000Z",
      "totalActivities": 520
    },
    "recentAssignments": [
      {
        "assignmentId": "uuid",
        "surveyId": "survey-001",
        "status": "active",
        "progress": 85,
        "achievedResponses": 85,
        "targetResponses": 100
      }
    ]
  }
}
```

---

### Reset Password

Generate a new temporary password for a surveyor.

**Endpoint:** `POST /surveyors/:id/reset-password`

**Response:**
```json
{
  "success": true,
  "message": "Password reset successfully",
  "newPassword": "NewAbc123!"
}
```

---

## Assignment Endpoints

### Assign Survey

Assign a survey to a surveyor.

**Endpoint:** `POST /assignments`

**Request Body:**
```json
{
  "surveyorId": "surveyor-uuid",
  "surveyId": "survey-001",
  "territoryId": "Zone A",
  "targetResponses": 100,
  "startDate": "2025-11-12",
  "endDate": "2025-12-12"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Survey assigned successfully",
  "assignment": {
    "id": "assignment-uuid",
    "surveyorId": "surveyor-uuid",
    "surveyId": "survey-001",
    "territoryId": "Zone A",
    "targetResponses": 100,
    "achievedResponses": 0,
    "startDate": "2025-11-12T00:00:00.000Z",
    "endDate": "2025-12-12T00:00:00.000Z",
    "status": "pending",
    "assignedBy": "admin",
    "assignedAt": "2025-11-12T00:00:00.000Z"
  }
}
```

---

### Bulk Assign

Assign multiple surveys to multiple surveyors.

**Endpoint:** `POST /assignments/bulk`

**Request Body:**
```json
{
  "assignments": [
    {
      "surveyorId": "surveyor-uuid-1",
      "surveyId": "survey-001",
      "targetResponses": 50,
      "endDate": "2025-12-12"
    },
    {
      "surveyorId": "surveyor-uuid-2",
      "surveyId": "survey-002",
      "targetResponses": 75,
      "endDate": "2025-12-15"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Bulk assignment completed: 2 successful, 0 failed",
  "results": {
    "successful": [
      {
        "assignmentId": "uuid-1",
        "surveyorId": "surveyor-uuid-1",
        "surveyId": "survey-001"
      }
    ],
    "failed": []
  }
}
```

---

### Get Surveyor Assignments

Get all assignments for a specific surveyor.

**Endpoint:** `GET /surveyors/:id/assignments`

**Query Parameters:**
- `status` (optional): Filter by status (pending, active, completed, cancelled)
- `includeExpired` (optional): Include expired assignments (default: false)

**Response:**
```json
{
  "success": true,
  "assignments": [
    {
      "id": "assignment-uuid",
      "surveyorId": "surveyor-uuid",
      "surveyId": "survey-001",
      "status": "active",
      "targetResponses": 100,
      "achievedResponses": 45,
      "startDate": "2025-11-12T00:00:00.000Z",
      "endDate": "2025-12-12T00:00:00.000Z"
    }
  ]
}
```

---

### Get All Assignments

Get all assignments with filtering and pagination (admin).

**Endpoint:** `GET /assignments`

**Query Parameters:**
- `surveyorId` (optional): Filter by surveyor
- `surveyId` (optional): Filter by survey
- `status` (optional): Filter by status
- `page` (optional): Page number
- `limit` (optional): Items per page

---

### Update Assignment

Update assignment details.

**Endpoint:** `PUT /assignments/:id`

**Request Body:**
```json
{
  "targetResponses": 150,
  "endDate": "2025-12-15",
  "notes": "Extended deadline"
}
```

---

### Activate Assignment

Change assignment status from pending to active.

**Endpoint:** `POST /assignments/:id/activate`

---

### Cancel Assignment

Cancel an assignment.

**Endpoint:** `POST /assignments/:id/cancel`

**Request Body:**
```json
{
  "reason": "Surveyor unavailable"
}
```

---

### Record Response

Increment the achieved responses count for an assignment.

**Endpoint:** `POST /assignments/:id/record-response`

**Request Body:**
```json
{
  "count": 1
}
```

**Response:**
```json
{
  "success": true,
  "message": "Response recorded successfully",
  "assignment": {
    // Updated assignment with incremented achievedResponses
  }
}
```

---

### Get Assignment Statistics

Get overall assignment statistics.

**Endpoint:** `GET /assignments/stats`

**Response:**
```json
{
  "success": true,
  "stats": {
    "byStatus": {
      "active": {
        "count": 15,
        "totalTarget": 1500,
        "totalAchieved": 1200,
        "progress": 80
      },
      "completed": {
        "count": 50,
        "totalTarget": 5000,
        "totalAchieved": 5000,
        "progress": 100
      }
    },
    "overall": {
      "totalAssignments": 75,
      "totalTarget": 7500,
      "totalAchieved": 7000,
      "overallProgress": 93
    }
  }
}
```

---

## Activity Endpoints

### Log Activity

Log a surveyor activity.

**Endpoint:** `POST /activities`

**Request Body:**
```json
{
  "surveyorId": "surveyor-uuid",
  "activityType": "login",
  "location": {
    "latitude": 25.2048,
    "longitude": 55.2708,
    "accuracy": 10,
    "address": "Dubai, UAE"
  },
  "relatedSurveyId": "survey-001",
  "relatedAssignmentId": "assignment-uuid",
  "sessionId": "session-uuid",
  "deviceInfo": {
    "userAgent": "Mozilla/5.0...",
    "platform": "MacIntel",
    "ipAddress": "192.168.1.1"
  }
}
```

**Activity Types:**
- `login`
- `logout`
- `location_checkin`
- `response_submission`
- `survey_view`
- `profile_update`
- `password_change`
- `assignment_view`

**Response:**
```json
{
  "success": true,
  "message": "Activity logged successfully",
  "activity": {
    "id": "activity-uuid",
    "surveyorId": "surveyor-uuid",
    "activityType": "login",
    "timestamp": "2025-11-12T10:30:00.000Z",
    // ... other fields
  }
}
```

---

### Get Surveyor Activities

Get activities for a specific surveyor.

**Endpoint:** `GET /activities/surveyor/:id`

**Query Parameters:**
- `activityType` (optional): Filter by activity type
- `startDate` (optional): Filter from date
- `endDate` (optional): Filter until date
- `page` (optional): Page number
- `limit` (optional): Items per page (default: 50)

---

### Get Daily Summary

Get a daily activity summary for a surveyor.

**Endpoint:** `GET /activities/surveyor/:id/daily-summary`

**Query Parameters:**
- `date` (optional): Target date (default: today)

**Response:**
```json
{
  "success": true,
  "summary": {
    "date": "2025-11-12",
    "totalActivities": 45,
    "loginCount": 3,
    "logoutCount": 2,
    "locationCheckins": 10,
    "responsesSubmitted": 25,
    "surveysViewed": 5,
    "firstActivity": "2025-11-12T08:00:00.000Z",
    "lastActivity": "2025-11-12T17:30:00.000Z",
    "totalSessionDuration": 18000
  }
}
```

---

### Get Response Locations

Get all response submission locations for a surveyor and survey.

**Endpoint:** `GET /activities/surveyor/:id/locations`

**Query Parameters:**
- `surveyId` (required): Survey ID to filter by

**Response:**
```json
{
  "success": true,
  "locations": [
    {
      "location": {
        "latitude": 25.2048,
        "longitude": 55.2708,
        "address": "Dubai, UAE"
      },
      "timestamp": "2025-11-12T10:30:00.000Z",
      "relatedResponseId": "response-uuid"
    }
  ]
}
```

---

### Get Activity Statistics

Get comprehensive activity statistics for a surveyor.

**Endpoint:** `GET /activities/surveyor/:id/stats`

**Query Parameters:**
- `startDate` (optional): Filter from date
- `endDate` (optional): Filter until date

**Response:**
```json
{
  "success": true,
  "stats": {
    "surveyorId": "uuid",
    "surveyorName": "John Doe",
    "period": {
      "startDate": "2025-01-01",
      "endDate": "now"
    },
    "activityCounts": {
      "login": 45,
      "logout": 43,
      "response_submission": 450,
      "location_checkin": 100
    },
    "sessionStats": {
      "totalDuration": 180000,
      "avgDuration": 4000,
      "maxDuration": 7200,
      "minDuration": 1800
    },
    "dailyBreakdown": [
      {
        "_id": "2025-11-12",
        "count": 25,
        "logins": 2,
        "responses": 20
      }
    ]
  }
}
```

---

## Models

### Surveyor Model

```typescript
interface Surveyor {
  id: string;
  name: string;
  email: string;
  phone: string;
  temporaryPassword: string; // Hashed
  hasChangedPassword: boolean;
  expirationDate: Date;
  status: 'active' | 'inactive' | 'expired';
  assignedSurveys: string[];
  assignedTerritories: string[];
  region?: string;
  languages?: string[];
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}
```

### Assignment Model

```typescript
interface Assignment {
  id: string;
  surveyorId: string;
  surveyId: string;
  territoryId?: string;
  targetResponses: number;
  achievedResponses: number;
  startDate: Date;
  endDate: Date;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  assignedBy: string;
  assignedAt: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
  notes?: string;
}
```

### Activity Model

```typescript
interface Activity {
  id: string;
  surveyorId: string;
  activityType: 'login' | 'logout' | 'location_checkin' | 'response_submission' |
                'survey_view' | 'profile_update' | 'password_change' | 'assignment_view';
  timestamp: Date;
  location?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    address?: string;
  };
  relatedSurveyId?: string;
  relatedAssignmentId?: string;
  relatedResponseId?: string;
  sessionId?: string;
  sessionDuration?: number;
  deviceInfo?: {
    userAgent?: string;
    platform?: string;
    browser?: string;
    os?: string;
    ipAddress?: string;
  };
  metadata?: Map<string, any>;
  notes?: string;
}
```

---

## Error Handling

All endpoints follow a consistent error response format:

**Error Response:**
```json
{
  "success": false,
  "error": "Error message here"
}
```

**Validation Error Response:**
```json
{
  "success": false,
  "errors": [
    {
      "field": "email",
      "message": "Valid email is required"
    },
    {
      "field": "phone",
      "message": "Phone is required"
    }
  ]
}
```

**HTTP Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `404` - Not Found
- `500` - Internal Server Error

---

## Health Check

**Endpoint:** `GET /health`

**Response:**
```json
{
  "success": true,
  "service": "surveyor-management-service",
  "status": "running",
  "timestamp": "2025-11-12T10:30:00.000Z"
}
```

---

## Authentication

Currently, the service uses a placeholder authentication system. In production, implement JWT-based authentication by:

1. Adding a login endpoint that returns a JWT token
2. Including the token in the `Authorization` header: `Bearer <token>`
3. Implementing proper role-based access control (Admin, Surveyor)

---

## Rate Limiting

Recommended rate limits (to be implemented):
- Bulk operations: 10 requests per minute
- Regular CRUD: 100 requests per minute
- Activity logging: 200 requests per minute

---

## Best Practices

1. **Password Management**: Always store the temporary password securely when creating surveyors. It's only shown once.

2. **Activity Tracking**: Log activities immediately after user actions for accurate tracking.

3. **Assignment Management**: Check surveyor status and expiration before assigning surveys.

4. **Bulk Operations**: Use bulk endpoints for importing/assigning multiple items at once for better performance.

5. **Pagination**: Always use pagination for list endpoints to avoid performance issues.

6. **Error Handling**: Check the `success` field in responses before processing data.

---

## Support

For issues or questions, please refer to the main application documentation or contact the development team.

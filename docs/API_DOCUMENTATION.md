# API Documentation

## Base URL

```
http://localhost:3000/api/v1
```

## Authentication

Currently, the API does not require authentication. This will be added in future sprints.

## Response Format

All API responses follow this format:

### Success Response
```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message",
  "errors": [ ... ]
}
```

## Survey Service API

### Create Survey

**Endpoint:** `POST /surveys`

**Request Body:**
```json
{
  "title": "Survey Title",
  "title_ar": "عنوان الاستبيان",
  "description": "Survey description",
  "questions": [
    {
      "type": "multiple_choice",
      "question": "Question text",
      "question_ar": "نص السؤال",
      "required": true,
      "options": ["Option 1", "Option 2"],
      "options_ar": ["خيار 1", "خيار 2"]
    }
  ],
  "status": "draft",
  "settings": {
    "allowAnonymous": true,
    "showProgressBar": true
  }
}
```

**Response:** `201 Created`

### Get All Surveys

**Endpoint:** `GET /surveys`

**Query Parameters:**
- `status` - Filter by status (draft, active, closed)
- `category` - Filter by category
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)
- `search` - Search term

**Response:** `200 OK`

### Get Survey by ID

**Endpoint:** `GET /surveys/:id`

**Response:** `200 OK`

### Update Survey

**Endpoint:** `PUT /surveys/:id`

**Request Body:** Same as create survey

**Response:** `200 OK`

### Delete Survey

**Endpoint:** `DELETE /surveys/:id`

**Response:** `200 OK`

### Duplicate Survey

**Endpoint:** `POST /surveys/:id/duplicate`

**Response:** `201 Created`

### Create Version

**Endpoint:** `POST /surveys/:id/version`

**Response:** `201 Created`

### Update Status

**Endpoint:** `PATCH /surveys/:id/status`

**Request Body:**
```json
{
  "status": "active"
}
```

**Response:** `200 OK`

## Response Service API

### Submit Response

**Endpoint:** `POST /responses`

**Request Body:**
```json
{
  "surveyId": "survey-id",
  "answers": [
    {
      "questionId": "question-id",
      "value": "answer value"
    }
  ],
  "respondent": {
    "email": "user@example.com",
    "userId": "user-id"
  }
}
```

**Response:** `201 Created`

### Create Partial Response

**Endpoint:** `POST /responses/partial`

**Request Body:** Same as submit response

**Response:** `201 Created`

### Get All Responses

**Endpoint:** `GET /responses`

**Query Parameters:**
- `surveyId` - Filter by survey ID
- `status` - Filter by status
- `page` - Page number
- `limit` - Items per page
- `startDate` - Filter from date
- `endDate` - Filter to date

**Response:** `200 OK`

### Get Response by ID

**Endpoint:** `GET /responses/:id`

**Response:** `200 OK`

### Update Response

**Endpoint:** `PUT /responses/:id`

**Request Body:**
```json
{
  "answers": [
    {
      "questionId": "question-id",
      "value": "updated value"
    }
  ]
}
```

**Response:** `200 OK`

### Delete Response

**Endpoint:** `DELETE /responses/:id`

**Request Body:**
```json
{
  "reason": "Reason for deletion"
}
```

**Response:** `200 OK`

## Template Service API

### Get All Templates

**Endpoint:** `GET /templates`

**Query Parameters:**
- `category` - Filter by category
- `industry` - Filter by industry
- `tags` - Filter by tags (comma-separated)
- `isPremium` - Filter premium templates
- `page` - Page number
- `limit` - Items per page
- `sortBy` - Sort by (usageCount, rating, newest, oldest)
- `search` - Search term

**Response:** `200 OK`

### Get Template by ID

**Endpoint:** `GET /templates/:id`

**Response:** `200 OK`

### Create Template

**Endpoint:** `POST /templates`

**Request Body:**
```json
{
  "name": "Template Name",
  "description": "Template description",
  "category": "Category",
  "template": {
    "title": "Survey Title",
    "questions": [ ... ]
  }
}
```

**Response:** `201 Created`

### Use Template

**Endpoint:** `POST /templates/:id/use`

**Response:** `200 OK` (Returns template data)

### Rate Template

**Endpoint:** `POST /templates/:id/rate`

**Request Body:**
```json
{
  "rating": 5
}
```

**Response:** `200 OK`

### Get Categories

**Endpoint:** `GET /templates/categories`

**Response:** `200 OK`

### Get Popular Templates

**Endpoint:** `GET /templates/popular`

**Query Parameters:**
- `limit` - Number of templates (default: 10)

**Response:** `200 OK`

## File Service API

### Upload File

**Endpoint:** `POST /files/upload`

**Request:** `multipart/form-data`
- `file` - File to upload
- `relatedTo` - Related entity type
- `relatedId` - Related entity ID
- `uploadedBy` - Uploader ID

**Response:** `201 Created`

### Upload Multiple Files

**Endpoint:** `POST /files/upload/multiple`

**Request:** `multipart/form-data`
- `files` - Array of files (max 10)
- `relatedTo` - Related entity type
- `relatedId` - Related entity ID
- `uploadedBy` - Uploader ID

**Response:** `201 Created`

### Get All Files

**Endpoint:** `GET /files`

**Query Parameters:**
- `relatedTo` - Filter by related type
- `relatedId` - Filter by related ID
- `uploadedBy` - Filter by uploader
- `page` - Page number
- `limit` - Items per page

**Response:** `200 OK`

### Get File by ID

**Endpoint:** `GET /files/:id`

**Response:** `200 OK`

### Download File

**Endpoint:** `GET /files/:id/download`

**Response:** File download

### Delete File

**Endpoint:** `DELETE /files/:id`

**Response:** `200 OK`

## Question Types

### Available Types

- `multiple_choice` - Single selection
- `checkbox` - Multiple selections
- `text` - Short text input
- `textarea` - Long text input
- `dropdown` - Dropdown selection
- `rating` - Rating scale
- `date` - Date picker
- `file` - File upload

### Question Schema

```json
{
  "type": "multiple_choice",
  "question": "Question text",
  "question_ar": "Arabic question",
  "description": "Optional description",
  "required": true,
  "options": ["Option 1", "Option 2"],
  "options_ar": ["خيار 1", "خيار 2"],
  "validation": {
    "min": 1,
    "max": 5,
    "pattern": "regex",
    "minLength": 10,
    "maxLength": 500
  },
  "conditionalLogic": {
    "dependsOn": "question-id",
    "condition": "equals",
    "value": "specific value"
  }
}
```

## Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `404` - Not Found
- `429` - Too Many Requests
- `500` - Internal Server Error

## Rate Limiting

- **Window:** 15 minutes
- **Max Requests:** 100 per window per IP

Headers included in response:
- `RateLimit-Limit` - Request limit
- `RateLimit-Remaining` - Remaining requests
- `RateLimit-Reset` - Time when limit resets

## Pagination

Paginated responses include:

```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "pages": 10
  }
}
```

## Error Codes

| Code | Message | Description |
|------|---------|-------------|
| VALIDATION_ERROR | Validation failed | Input validation error |
| NOT_FOUND | Resource not found | Requested resource doesn't exist |
| SURVEY_NOT_ACTIVE | Survey is not active | Cannot submit to inactive survey |
| MISSING_REQUIRED | Missing required questions | Required questions not answered |
| FILE_TYPE_NOT_ALLOWED | File type not allowed | Unsupported file type |
| FILE_TOO_LARGE | File too large | File exceeds size limit |

## Event Types (Kafka)

Events published by Response Service:

- `survey.created` - New survey created
- `survey.updated` - Survey updated
- `survey.deleted` - Survey deleted
- `response.submitted` - Response submitted
- `response.updated` - Response updated
- `file.uploaded` - File uploaded

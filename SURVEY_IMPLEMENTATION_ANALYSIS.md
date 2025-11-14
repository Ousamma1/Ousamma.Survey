# Ousamma Survey Platform - Current Implementation Analysis

## Overview

The Ousamma Survey Platform is an AI-powered survey application with a microservices architecture. It consists of multiple independent services that handle different aspects of survey management, analytics, notifications, and surveyor management.

---

## 1. SURVEY MODELS & SCHEMAS

### Main API Server (index.js - Port 3000)
- **Survey Storage**: File-based JSON storage in `/public/Surveys/` directory
- **Response Storage**: File-based JSON storage in `/data/responses/` directory
- **Structure**: Surveys stored as individual JSON files with surveyId as filename

### Database Models (MongoDB via Microservices)

#### Project Service (`services/project-service/models/`)

**Project Model** (`Project.js`)
- Manages projects and their members with role-based access control
- Fields:
  - `name`: Project name (required, 3-100 chars)
  - `description`: Optional description
  - `ownerId`: Owner reference
  - `members[]`: Array with userId, role (owner/admin/editor/viewer), addedAt, addedBy
  - `surveys[]`: Array of survey IDs
  - `groups[]`: Array of survey group IDs
  - `settings`: Object with:
    - `allowPublicAccess`: Boolean
    - `requireApproval`: Boolean
    - `defaultSurveyPermission`: view/edit/none
    - `notifications`: onNewResponse, onNewMember, onSurveyUpdate
  - `status`: active/archived
  - `metadata`: totalSurveys, totalGroups, totalMembers
- Methods:
  - `isMember()`: Check if user is member
  - `getUserRole()`: Get user's role
  - `hasPermission()`: Check role permissions
  - `addMember()`, `removeMember()`, `updateMemberRole()`

**SurveyGroup Model** (`SurveyGroup.js`)
- Groups surveys within projects
- Fields:
  - `projectId`: Parent project reference
  - `name`: Group name
  - `description`: Optional
  - `surveyIds[]`: Array of survey IDs
  - `createdBy`: Creator reference
  - `metadata`: totalSurveys, totalResponses, lastActivityAt
  - `settings`: color, icon
  - `status`: active/archived
- Methods:
  - `addSurvey()`, `removeSurvey()`, `hasSurvey()`

#### Analytics Service (`services/analytics-service/models/`)

**SurveyAnalytics Model** (`SurveyAnalytics.js`)
- Aggregated analytics for surveys
- Fields:
  - `surveyId`: Unique reference to survey
  - `totalResponses`: Count of all responses
  - `completionRate`: Percentage (0-100)
  - `averageTime`: Average completion time in seconds
  - `dropOffPoints[]`: Array with questionId, count, percentage
  - `demographics`: Mixed object for demographic data
  - `locationDistribution`: Geographic data
  - `deviceDistribution`: desktop/mobile/tablet counts
  - `timeBasedTrends`: hourly/daily/weekly maps
  - `lastUpdated`: Timestamp
- Methods:
  - `incrementResponses()`, `calculateCompletionRate()`

**ResponseEvent Model** (`ResponseEvent.js`)
- Individual response events for time-series analysis
- Fields:
  - `surveyId`: Reference to survey
  - `responseId`: Unique response identifier
  - `userId`: Responder identifier
  - `responses`: Mixed object with all question answers
  - `metadata`: device, browser, os, ipAddress, userAgent
  - `location`: GeoJSON Point with coordinates, country, city
  - `completionTime`: Seconds to complete
  - `isComplete`: Boolean flag
  - `timestamp`: When response was submitted
- Indexes: Geospatial (2dsphere), time-series optimized
- Methods:
  - Static methods for date range queries, completion rate calculation

**QuestionAnalytics Model** (`QuestionAnalytics.js`)
- Per-question analytics
- Fields:
  - `questionId`: Question identifier
  - `surveyId`: Parent survey reference
  - `questionType`: text/multiple_choice/rating/scale/boolean/date/number
  - `responseCount`: Number of responses
  - `valueDistribution`: Distribution of answer values
  - `statistics`: mean, median, mode, stdDev, variance, min, max, percentiles
  - `textAnalytics`: averageLength, totalWords, commonWords, sentiment
  - `responseTime`: average, median, min, max
  - `lastUpdated`: Timestamp
- Methods:
  - `incrementResponses()`, `updateDistribution()`
  - Static methods for queries by survey/question

---

## 2. SURVEY RESPONSE HANDLING

### Main API Endpoints (index.js)

**Save Survey Response**
- Endpoint: `POST /api/responses/save`
- Input: `{ surveyId, responses }`
- Stores in `/data/responses/{surveyId}-{timestamp}.json`
- Broadcasts to WebSocket subscribers

**Get Survey Responses**
- Endpoint: `GET /api/responses/:surveyId`
- Returns array of response objects with:
  - id, surveyId, answers, timestamp, createdAt, completed status
  - Additional fields from response file

**Response Structure** (from index.js storage)
```json
{
  "surveyId": "string",
  "responses": { "questionId": "answer" },
  "timestamp": number,
  "submittedAt": "ISO8601 string",
  "completed": boolean
}
```

### Analytics Processing

**responseConsumer** (`analytics-consumer-service/consumers/responseConsumer.js`)
- Kafka consumer for response events
- Processes responses and updates analytics

---

## 3. QUESTION TYPES & RENDERING

### Supported Question Types (from survey-builder.js and analytics)

1. **multiple_choice**: Single selection from options
   - Rendering: Radio buttons (○ symbol)
   - Data structure: `{ options_en[], options_ar[], question_en, question_ar }`

2. **checkboxes**: Multiple selections from options
   - Rendering: Checkboxes (☐ symbol)
   - Similar structure to multiple_choice

3. **dropdown**: Single selection from dropdown
   - Rendering: Select element
   - Uses options_en/options_ar

4. **paragraph**: Long text answer
   - Rendering: Textarea element
   - Min height: 100px

5. **short_answer**: Short text input
   - Rendering: Text input
   - Single line

6. **scale**: Numeric scale (typically 1-5 or 1-10)
   - Rendering: Range input with labels
   - Structure: scale-labels for min/max labels

7. **ranked**: Ranking question
   - Multiple options that need to be ordered
   - Supported in schema but rendering not fully shown

### Question Object Structure
```javascript
{
  type: 'question_type',
  question_en: 'English question text',
  question_ar: 'Arabic question text',
  options_en: [], // for choice types
  options_ar: [],
  required: boolean,
  questionId?: string
}
```

### Rendering (from survey-builder.js)

**renderQuestionCard()** method:
- Displays question with type label
- Shows options for multiple choice/checkboxes
- Includes edit and delete buttons
- Uses `typeLabels` map for display names

---

## 4. CURRENT SURVEY BUILDER/EDITOR COMPONENTS

### Survey Builder Frontend (`public/survey-builder.js`)

**SurveyBuilder Class** with methods:
- `init()`: Initialize with AI chat widget
- `showEmptyState()`: Display initial empty state
- `showGenerateView()`: Show survey generation panel
- `showOptimizeView()`: Show optimization suggestions
- `showAnalysisView()`: Show response analysis
- `generateSurvey()`: Create survey from natural language
- `parseSurveyFromAI()`: Parse AI response to survey structure
- `displaySurveyPreview()`: Render questions to preview area
- `renderQuestionCard()`: Individual question rendering
- `editQuestion()`: In-line question editing (prompt-based)
- `deleteQuestion()`: Remove question from survey
- `optimizeSurvey()`: Get AI optimization suggestions
- `displayOptimizationSuggestions()`: Show improvement suggestions
- `loadAndAnalyzeResponses()`: Fetch and analyze responses
- `queryData()`: Natural language queries on responses
- `generateReport()`: Create automated report
- `saveSurvey()`: Save to `/api/surveys/save`
- `loadSurvey()`: Load from `/api/surveys/:surveyId`

### Survey API Endpoints (index.js)

**Survey Management**
- `POST /api/surveys/save`: Save survey JSON
- `GET /api/surveys/:surveyId`: Load specific survey
- `GET /api/surveys`: List all surveys

---

## 5. SURVEY SETTINGS & CONFIGURATION

### Project-Level Settings

**Project Settings** (from Project model):
```javascript
settings: {
  allowPublicAccess: boolean,
  requireApproval: boolean,
  defaultSurveyPermission: 'view' | 'edit' | 'none',
  notifications: {
    onNewResponse: boolean,
    onNewMember: boolean,
    onSurveyUpdate: boolean
  }
}
```

### Group Settings

**SurveyGroup Settings** (from SurveyGroup model):
```javascript
settings: {
  color: string (hex color, default '#3B82F6'),
  icon: string (icon name, default 'folder')
}
```

### Surveyor Assignment Settings

**Assignment Configuration** (from Assignment model):
- Target response count
- Start and end dates
- Territory assignment
- Status tracking (pending/active/completed/cancelled)
- Automatic completion when target reached

---

## 6. EXISTING LOGIC & CONDITIONAL FEATURES

### Surveyor Management Logic

**Surveyor Service** (`surveyor-service/`)

**Expiration Logic**:
- Account expiration dates with automatic status updates
- Methods: `isExpired()`, `extendExpiration(days)`
- Auto-reactivation when extended

**Status Management**:
- States: active, inactive, expired
- Password management: temporary password with change tracking
- `hasChangedPassword` flag

**Assignment Auto-completion** (Assignment model):
```javascript
if (achievedResponses >= targetResponses && status === 'active') {
  status = 'completed';
  completedAt = new Date();
}
```

**Surveyor Filtering**:
- By status, region, search (name/email/phone)
- Pagination support
- Sort by any field (ascending/descending)

**Performance Tracking**:
- `GET /surveyors/:id/performance` endpoint
- Metrics: assignment counts, response targets, achievement rates
- Activity tracking integration

### Project-Level Permissions

**Role Hierarchy**:
```javascript
roleHierarchy = {
  owner: 4,
  admin: 3,
  editor: 2,
  viewer: 1
}
```

**Permission Checks**: `hasPermission(userId, requiredRole)`

### Analytics Aggregation Logic

**Drop-off Analysis** (from analytics-service.js):
- Tracks where responses are abandoned
- Calculates percentage at each drop-off point

**Completion Rate Calculation**:
```javascript
completionRate = (completeResponses / totalResponses) * 100
```

**Time-based Trends**:
- Hourly, daily, weekly response distribution

**Demographic Analysis** (from AnalyticsService):
- `analyzeDemographics()` method
- Mixed object storage for flexible demographic data

### Response Timeline Generation

**`generateTimeline(responses, interval)` method**:
- Groups responses by time interval
- Supports 'day' interval (and potentially others)
- For visualization of response patterns

---

## 7. DATABASE MODELS FOR SURVEYS & RESPONSES

### File-Based Models (Main API)

**Survey File Structure**:
```
/public/Surveys/{surveyId}.json
{
  "title": "Survey Title",
  "name": "Alternative name",
  "description": "Survey description",
  "questions": [
    {
      "type": "multiple_choice",
      "question_en": "Question?",
      "question_ar": "السؤال؟",
      "options_en": ["Option 1", "Option 2"],
      "options_ar": ["خيار 1", "خيار 2"],
      "required": true
    }
  ],
  "createdAt": "ISO8601",
  ...
}
```

**Response File Structure**:
```
/data/responses/{surveyId}-{timestamp}.json
{
  "surveyId": "survey-id",
  "responses": {
    "q1": "answer_value",
    "q2": "answer_value"
  },
  "timestamp": 1234567890,
  "submittedAt": "ISO8601",
  "completed": true
}
```

### MongoDB Collections

**Projects**: `projects`
- Index: name, description (text search), ownerId, createdAt

**Survey Groups**: `survey_groups`
- Index: projectId, surveyIds, text search on name/description

**Survey Analytics**: `survey_analytics`
- Index: surveyId (unique), totalResponses, completionRate

**Response Events**: `response_events`
- Time-series collection with granularity: 'hours'
- Geospatial index for location queries
- Compound indexes for efficient filtering

**Question Analytics**: `question_analytics`
- Compound unique index: surveyId + questionId
- Index: surveyId with responseCount sorting

---

## 8. API ENDPOINTS FOR SURVEYS

### Main Server (Port 3000)

**Survey Management**:
- `POST /api/surveys/save` - Save/update survey
- `GET /api/surveys` - List all surveys
- `GET /api/surveys/:surveyId` - Get specific survey

**Response Management**:
- `POST /api/responses/save` - Submit survey response
- `GET /api/responses/:surveyId` - Get all responses for survey

**AI Features**:
- `POST /api/ai/chat` - Chat with AI
- `POST /api/ai/generate-survey` - Generate survey from description
- `POST /api/ai/optimize-survey` - Get optimization suggestions
- `POST /api/ai/analyze-responses` - Analyze survey responses
- `POST /api/ai/query-data` - Natural language queries on data
- `POST /api/ai/identify-trends` - Trend identification
- `POST /api/ai/detect-anomalies` - Anomaly detection
- `POST /api/ai/generate-report` - Automated report generation
- `POST /api/ai/ab-test-suggestions` - A/B testing recommendations

**Context Management**:
- `POST /api/context/upload` - Upload context file
- `GET /api/context/files` - List uploaded files
- `DELETE /api/context/files/:filename` - Delete file

**WebSocket**:
- `ws://localhost:3000/ws` - Real-time updates
- Subscribe: `{ type: 'subscribe', data: { surveyId } }`
- Unsubscribe: `{ type: 'unsubscribe', data: { surveyId } }`
- Ping/Pong for keep-alive

### Project Service (Port 3002)

**Projects**:
- `GET /api/projects` - List user's projects
- `POST /api/projects` - Create project
- `GET /api/projects/:id` - Get project details
- `PUT /api/projects/:id` - Update project
- `POST /api/projects/:id/archive` - Archive project
- `DELETE /api/projects/:id` - Delete project

**Groups**:
- `GET /api/projects/:id/groups` - List groups
- `POST /api/projects/:id/groups` - Create group
- `GET /api/projects/:id/groups/:groupId` - Get group
- `PUT /api/projects/:id/groups/:groupId` - Update group
- `DELETE /api/projects/:id/groups/:groupId` - Delete group
- `POST /api/projects/:id/groups/:groupId/surveys` - Add survey to group
- `DELETE /api/projects/:id/groups/:groupId/surveys/:surveyId` - Remove survey

**Members**:
- `GET /api/projects/:id/members` - List members
- `POST /api/projects/:id/members` - Add member
- `PUT /api/projects/:id/members/:userId` - Update role
- `DELETE /api/projects/:id/members/:userId` - Remove member

**Analytics**:
- `GET /api/projects/:id/analytics` - Project-wide analytics
- `GET /api/projects/:id/groups/:groupId/analytics` - Group analytics
- `GET /api/projects/:id/analytics/compare` - Compare groups

### Analytics Service (Port 3003)

**Survey Analytics**:
- `GET /analytics/survey/:id` - Survey analytics
- `GET /analytics/survey/:id/questions` - Question-level analytics
- `GET /analytics/survey/:id/realtime` - Real-time stats
- `GET /analytics/survey/:id/export` - Export analytics
- `GET /analytics/group/:id` - Group analytics
- `GET /analytics/compare` - Compare surveys
- `POST /analytics/custom` - Custom analytics query

### Surveyor Service (Port 3001)

**Surveyors**:
- `POST /api/surveyors` - Create surveyor
- `POST /api/surveyors/bulk` - Bulk import
- `GET /api/surveyors` - List surveyors
- `GET /api/surveyors/:id` - Get surveyor
- `PUT /api/surveyors/:id` - Update surveyor
- `DELETE /api/surveyors/:id` - Deactivate surveyor
- `POST /api/surveyors/:id/extend` - Extend expiration
- `GET /api/surveyors/:id/performance` - Performance metrics
- `POST /api/surveyors/:id/reset-password` - Reset password

**Assignments**:
- `POST /api/assignments` - Assign survey to surveyor
- `POST /api/assignments/bulk` - Bulk assign
- `GET /api/assignments` - List assignments
- `GET /api/assignments/:id` - Get assignment
- `PUT /api/assignments/:id` - Update assignment
- `POST /api/assignments/:id/activate` - Activate
- `POST /api/assignments/:id/cancel` - Cancel
- `POST /api/assignments/:id/record-response` - Increment response count
- `GET /api/assignments/stats` - Assignment statistics
- `GET /api/surveyors/:id/assignments` - Get surveyor's assignments

**Activities**:
- `POST /api/activities` - Log activity
- `GET /api/activities/surveyor/:id` - Get surveyor activities
- `GET /api/activities/surveyor/:id/daily-summary` - Daily summary
- `GET /api/activities/surveyor/:id/locations` - Response locations
- `GET /api/activities/surveyor/:id/stats` - Activity statistics

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│         Frontend (HTML/JS Files in /public/)            │
│  - survey-builder.html (AI Survey Builder)              │
│  - dubaisurvey.html (Survey Form)                       │
│  - admin-surveyors.html (Admin Panel)                   │
│  - analytics-dashboard.html (Analytics)                 │
└──────────────────┬──────────────────────────────────────┘
                   │
        ┌──────────┼──────────┐
        │          │          │
    ┌───▼──┐  ┌───▼──┐  ┌───▼──┐
    │Main  │  │Project│  │Analytics
    │API   │  │Service│  │Service
    │:3000 │  │:3002  │  │:3003
    └──┬───┘  └───┬───┘  └───┬──┘
       │          │          │
       └──────────┼──────────┘
                  │
         ┌────────▼────────┐
         │    MongoDB      │
         │  + Redis Cache  │
         │  + Kafka Events │
         └─────────────────┘
```

---

## Key Observations

### Strengths
1. **Modular Architecture**: Clear separation of concerns with microservices
2. **Analytics Ready**: Comprehensive analytics models with time-series optimization
3. **Bilingual Support**: Questions support both English and Arabic
4. **AI Integration**: Multiple AI providers supported
5. **Real-time**: WebSocket support for live updates
6. **Scalable**: Kafka for async processing, Redis for caching

### Current Limitations
1. **No Conditional Logic**: No branching/skip logic based on answers
2. **No Survey Publishing**: Surveys not published to URL for public responses
3. **No Response Validation Rules**: Limited to required/optional at question level
4. **File-Based Storage**: Main surveys stored as JSON files, not in database
5. **No Survey Templates**: No built-in template library
6. **Limited Question Types**: Missing matrix, ranking with proper rendering

### For Advanced Features Implementation
1. Need database model for surveys (not just file storage)
2. Need conditional logic engine for branching
3. Need validation rules framework
4. Need response submission with unique links
5. Need survey versioning system
6. Need question randomization/rotation logic


# Survey Implementation - Quick Reference Guide

## File Locations

### Core Survey Files
| Type | Location | Purpose |
|------|----------|---------|
| Survey Storage | `/public/Surveys/{surveyId}.json` | Persisted survey definitions |
| Response Storage | `/data/responses/{surveyId}-{timestamp}.json` | Individual response submissions |
| Main API | `/index.js` | Port 3000 - Survey/AI/WebSocket endpoints |

### Microservices
| Service | Port | Location | Purpose |
|---------|------|----------|---------|
| Main API | 3000 | `/index.js` | Survey & AI endpoints |
| Surveyor Service | 3001 | `/surveyor-service/` | Surveyor management |
| Project Service | 3002 | `/services/project-service/` | Projects & groups |
| Analytics Service | 3003 | `/services/analytics-service/` | Analytics & reporting |

### Model Files
| Model | Location | Storage |
|-------|----------|---------|
| Project | `/services/project-service/models/Project.js` | MongoDB |
| SurveyGroup | `/services/project-service/models/SurveyGroup.js` | MongoDB |
| SurveyAnalytics | `/services/analytics-service/models/SurveyAnalytics.js` | MongoDB |
| ResponseEvent | `/services/analytics-service/models/ResponseEvent.js` | MongoDB (TimeSeries) |
| QuestionAnalytics | `/services/analytics-service/models/QuestionAnalytics.js` | MongoDB |
| Surveyor | `/surveyor-service/models/Surveyor.js` | MongoDB |
| Assignment | `/surveyor-service/models/Assignment.js` | MongoDB |

---

## Key Data Structures

### Survey Object (JSON File)
```javascript
{
  title: "string",
  description: "string",
  questions: [{
    type: "multiple_choice|checkboxes|dropdown|paragraph|short_answer|scale|ranked",
    question_en: "string",
    question_ar: "string",
    options_en: [], // for choice types
    options_ar: [],
    required: boolean,
    questionId: "string" (optional)
  }],
  createdAt: "ISO8601"
}
```

### Response Object (JSON File)
```javascript
{
  surveyId: "string",
  responses: { "questionId": "answer_value" },
  timestamp: number,
  submittedAt: "ISO8601",
  completed: boolean
}
```

### Project Settings
```javascript
{
  allowPublicAccess: boolean,
  requireApproval: boolean,
  defaultSurveyPermission: "view|edit|none",
  notifications: {
    onNewResponse: boolean,
    onNewMember: boolean,
    onSurveyUpdate: boolean
  }
}
```

---

## Essential APIs

### Survey Management (Port 3000)
```
POST   /api/surveys/save              → Save survey
GET    /api/surveys                   → List all surveys
GET    /api/surveys/:surveyId         → Get survey
POST   /api/responses/save            → Save response
GET    /api/responses/:surveyId       → Get responses
```

### Project Management (Port 3002)
```
POST   /api/projects                  → Create project
GET    /api/projects                  → List projects
PUT    /api/projects/:id              → Update project
POST   /api/projects/:id/groups       → Create group
POST   /api/projects/:id/members      → Add member
```

### Surveyor Management (Port 3001)
```
POST   /api/surveyors                 → Create surveyor
GET    /api/surveyors                 → List surveyors
POST   /api/assignments               → Assign survey
GET    /api/surveyors/:id/assignments → Get assignments
```

### Analytics (Port 3003)
```
GET    /analytics/survey/:id          → Survey analytics
GET    /analytics/survey/:id/questions → Question analytics
GET    /analytics/group/:id           → Group analytics
```

---

## Question Types Reference

| Type | Display | Input | Options |
|------|---------|-------|---------|
| multiple_choice | Radio buttons | Select one | options_en[], options_ar[] |
| checkboxes | Checkboxes | Select multiple | options_en[], options_ar[] |
| dropdown | Select element | Select one | options_en[], options_ar[] |
| short_answer | Text input | Free text | N/A |
| paragraph | Textarea | Free text | N/A |
| scale | Range slider | Numeric | N/A |
| ranked | Rank items | Ordered list | options_en[], options_ar[] |

---

## Frontend Components

### Survey Builder (`/public/survey-builder.js`)
```javascript
new SurveyBuilder()
  .generateSurvey()        // From natural language
  .displaySurveyPreview()  // Show questions
  .saveSurvey()            // Save to API
  .optimizeSurvey()        // AI improvements
  .loadAndAnalyzeResponses() // Analyze answers
```

### AI Chat Widget (`/public/ai-chat-widget.js`)
- Interactive chat with AI
- Context file uploads
- Response analysis
- Survey generation assistance

### Analytics Dashboard (`/public/analytics-dashboard.js`)
- Real-time response tracking
- Question breakdowns
- Timeline visualization
- Demographic analysis

---

## Common Workflows

### 1. Create and Publish Survey
```
1. POST /api/surveys/save          → Save survey
2. Survey available at /api/surveys/:surveyId
3. Responses submitted to POST /api/responses/save
```

### 2. Analyze Responses
```
1. GET /api/responses/:surveyId     → Fetch responses
2. AI analyzes via POST /api/ai/analyze-responses
3. Results available in analytics service
```

### 3. Manage Surveyor Assignments
```
1. POST /api/surveyors              → Create surveyor
2. POST /api/assignments            → Assign survey
3. POST /api/assignments/:id/record-response → Track responses
4. GET /api/surveyors/:id/performance → View metrics
```

### 4. Track Real-time Updates
```
1. WebSocket: ws://localhost:3000/ws
2. Send: { type: 'subscribe', data: { surveyId } }
3. Receive: { type: 'new_response', data: {...} }
```

---

## Important Notes

### Bilingual Support
- All questions have `question_en` and `question_ar` fields
- Options have `options_en` and `options_ar` arrays
- Responses stored with original answer values

### Analytics Flow
1. Response submitted to `/api/responses/save`
2. WebSocket broadcasts to subscribers
3. Kafka processes via `analytics-consumer-service`
4. MongoDB updates analytics models
5. Dashboard fetches from `/analytics/*` endpoints

### Permissions
- **Owner** (4): Full control including deletion
- **Admin** (3): Manage members and settings
- **Editor** (2): Create and edit surveys
- **Viewer** (1): Read-only access

### Storage
- **Surveys**: JSON files (not database)
- **Responses**: JSON files (time-based naming)
- **Analytics**: MongoDB time-series
- **Projects**: MongoDB document store
- **Cache**: Redis (project queries)

---

## Database Indexes

| Collection | Indexes | Purpose |
|------------|---------|---------|
| projects | name (text), ownerId, createdAt | Search, filtering |
| survey_groups | projectId, surveyIds | Queries |
| survey_analytics | surveyId (unique), totalResponses | Lookups |
| response_events | surveyId, timestamp, location (2dsphere) | Time-series, geo |
| question_analytics | surveyId + questionId (unique) | Per-question stats |

---

## Troubleshooting

### Survey Not Saving
- Check `/public/Surveys/` directory exists
- Verify POST /api/surveys/save response
- Check file permissions

### Responses Not Tracked
- Verify WebSocket connection: ws://localhost:3000/ws
- Check analytics service is running (port 3003)
- Check Kafka broker connectivity

### Analytics Missing
- Verify ResponseEvent records in MongoDB
- Check QuestionAnalytics indexes
- Review analytics-consumer-service logs

### Permission Denied
- Verify user role in project.members[]
- Check role hierarchy (owner > admin > editor > viewer)
- Review permission middleware in routes

---

## Environment Variables

```bash
# Main API (index.js)
PORT=3000
AI_PROVIDER=openai
AI_API_URL=https://api.example.com
AI_API_KEY=your-api-key

# Project Service
PORT=3002
MONGODB_URI=mongodb://localhost:27017/projects
REDIS_URL=redis://localhost:6379

# Analytics Service
PORT=3003
MONGODB_URI=mongodb://localhost:27017/analytics
KAFKA_BROKERS=localhost:9092

# Surveyor Service
PORT=3001
MONGODB_URI=mongodb://localhost:27017/surveyors
ACCOUNT_EXPIRATION_DAYS=30
```

---

## Next Steps for Advanced Features

To implement conditional logic, branching, or other advanced features:

1. **Create Survey Schema in MongoDB** instead of JSON files
2. **Add Conditional Logic Engine** for branching questions
3. **Implement Response Validation** rules beyond required/optional
4. **Add Survey Publishing** for public survey links
5. **Create Survey Versioning** system for tracking changes
6. **Implement Question Randomization** for A/B testing
7. **Add Matrix Question Type** for more complex surveys
8. **Create Survey Templates** library for quick creation


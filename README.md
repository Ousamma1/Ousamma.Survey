# Ousamma Survey Platform - Sprint 2

A microservices-based survey management platform built with Node.js, Express, MongoDB, and Kafka.

## Architecture

This platform consists of 4 core microservices:

1. **Survey Service** - Survey CRUD, versioning, and management
2. **Response Service** - Response collection with Kafka event streaming
3. **Template Service** - Pre-built survey templates
4. **File Service** - File uploads and management

All services are accessed through a unified **API Gateway** with rate limiting and request routing.

## Tech Stack

- **Runtime**: Node.js 18
- **Framework**: Express.js
- **Database**: MongoDB 7.0
- **Message Queue**: Apache Kafka
- **Containerization**: Docker & Docker Compose
- **Image Processing**: Sharp
- **API Gateway**: http-proxy-middleware

## Project Structure

```
Ousamma.Survey/
├── api-gateway/              # API Gateway service
│   ├── src/
│   │   └── index.js
│   ├── Dockerfile
│   └── package.json
├── services/
│   ├── survey-service/       # Survey management
│   │   ├── src/
│   │   │   ├── controllers/
│   │   │   ├── models/
│   │   │   ├── routes/
│   │   │   └── index.js
│   │   ├── Dockerfile
│   │   └── package.json
│   ├── response-service/     # Response collection
│   │   ├── src/
│   │   │   ├── controllers/
│   │   │   ├── models/
│   │   │   ├── routes/
│   │   │   ├── kafka/
│   │   │   └── index.js
│   │   ├── Dockerfile
│   │   └── package.json
│   ├── template-service/     # Survey templates
│   │   ├── src/
│   │   │   ├── controllers/
│   │   │   ├── models/
│   │   │   ├── routes/
│   │   │   ├── scripts/
│   │   │   └── index.js
│   │   ├── Dockerfile
│   │   └── package.json
│   └── file-service/         # File management
│       ├── src/
│       │   ├── controllers/
│       │   ├── models/
│       │   ├── routes/
│       │   ├── middleware/
│       │   └── index.js
│       ├── Dockerfile
│       └── package.json
├── shared/                   # Shared utilities
│   ├── config/
│   └── utils/
├── docker-compose.yml
└── package.json
```

## Quick Start

### Prerequisites

- Docker Desktop or Docker Engine
- Docker Compose
- Node.js 18+ (for local development)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Ousamma.Survey
   ```

2. **Start all services with Docker Compose**
   ```bash
   docker-compose up --build
   ```

   This will start:
   - MongoDB (port 27017)
   - Zookeeper (port 2181)
   - Kafka (ports 9092, 9093)
   - Survey Service (port 3001)
   - Response Service (port 3002)
   - Template Service (port 3003)
   - File Service (port 3004)
   - API Gateway (port 3000)

3. **Access the API**
   - API Gateway: http://localhost:3000
   - API Documentation: http://localhost:3000/api/v1

### Seed Template Data

To populate the template service with pre-built templates:

```bash
docker exec -it template-service npm run seed
```

## API Endpoints

### Survey Service (via Gateway)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/surveys` | Create a new survey |
| GET | `/api/v1/surveys` | Get all surveys |
| GET | `/api/v1/surveys/:id` | Get survey by ID |
| PUT | `/api/v1/surveys/:id` | Update survey |
| DELETE | `/api/v1/surveys/:id` | Delete survey |
| POST | `/api/v1/surveys/:id/duplicate` | Duplicate survey |
| POST | `/api/v1/surveys/:id/version` | Create new version |
| PATCH | `/api/v1/surveys/:id/status` | Update status |
| GET | `/api/v1/surveys/stats` | Get statistics |

### Response Service (via Gateway)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/responses` | Submit response |
| POST | `/api/v1/responses/partial` | Save partial response |
| GET | `/api/v1/responses` | Get all responses |
| GET | `/api/v1/responses/:id` | Get response by ID |
| PUT | `/api/v1/responses/:id` | Update draft response |
| DELETE | `/api/v1/responses/:id` | Delete response |
| GET | `/api/v1/responses/stats` | Get statistics |

### Template Service (via Gateway)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/templates` | Get all templates |
| GET | `/api/v1/templates/:id` | Get template by ID |
| POST | `/api/v1/templates` | Create template |
| PUT | `/api/v1/templates/:id` | Update template |
| DELETE | `/api/v1/templates/:id` | Delete template |
| POST | `/api/v1/templates/:id/use` | Use template |
| POST | `/api/v1/templates/:id/rate` | Rate template |
| GET | `/api/v1/templates/categories` | Get categories |
| GET | `/api/v1/templates/popular` | Get popular templates |

### File Service (via Gateway)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/files/upload` | Upload single file |
| POST | `/api/v1/files/upload/multiple` | Upload multiple files |
| GET | `/api/v1/files` | Get all files |
| GET | `/api/v1/files/:id` | Get file metadata |
| GET | `/api/v1/files/:id/download` | Download file |
| DELETE | `/api/v1/files/:id` | Delete file |
| GET | `/api/v1/files/stats` | Get statistics |

## Example API Calls

### Create a Survey

```bash
curl -X POST http://localhost:3000/api/v1/surveys \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Customer Satisfaction Survey",
    "description": "Tell us about your experience",
    "questions": [
      {
        "type": "rating",
        "question": "How satisfied are you?",
        "required": true,
        "validation": { "min": 1, "max": 5 }
      },
      {
        "type": "textarea",
        "question": "Additional comments?",
        "required": false
      }
    ],
    "status": "active"
  }'
```

### Submit a Response

```bash
curl -X POST http://localhost:3000/api/v1/responses \
  -H "Content-Type: application/json" \
  -d '{
    "surveyId": "your-survey-id",
    "answers": [
      {
        "questionId": "question-id-1",
        "value": 5
      },
      {
        "questionId": "question-id-2",
        "value": "Great service!"
      }
    ]
  }'
```

### Get Templates

```bash
curl http://localhost:3000/api/v1/templates?category=Customer%20Feedback
```

### Upload File

```bash
curl -X POST http://localhost:3000/api/v1/files/upload \
  -F "file=@/path/to/file.pdf" \
  -F "relatedTo=response" \
  -F "relatedId=response-id"
```

## Features

### Survey Service
- ✅ Full CRUD operations
- ✅ Survey versioning
- ✅ Survey status management (draft, active, closed)
- ✅ Conditional logic storage
- ✅ Question bank management
- ✅ Survey duplication
- ✅ Bilingual support (English/Arabic)

### Response Service
- ✅ Response submission with validation
- ✅ Partial response saving
- ✅ Response status tracking
- ✅ Kafka event publishing
- ✅ Survey validation
- ✅ Soft delete with audit trail

### Template Service
- ✅ Pre-built templates (5 templates included)
- ✅ Template categories and industries
- ✅ Template rating system
- ✅ Usage tracking
- ✅ Bilingual templates

### File Service
- ✅ File upload (single/multiple)
- ✅ File type validation
- ✅ Image thumbnail generation
- ✅ File metadata extraction
- ✅ Secure file storage
- ✅ Download tracking

### API Gateway
- ✅ Service routing
- ✅ Rate limiting
- ✅ CORS support
- ✅ Request logging
- ✅ Error handling

## Development

### Local Development (without Docker)

1. **Install dependencies for all services**
   ```bash
   npm run install:all
   ```

2. **Start MongoDB and Kafka locally**

3. **Set up environment variables**
   Copy `.env.example` to `.env` in each service directory

4. **Start services individually**
   ```bash
   # Terminal 1 - Survey Service
   cd services/survey-service
   npm run dev

   # Terminal 2 - Response Service
   cd services/response-service
   npm run dev

   # Terminal 3 - Template Service
   cd services/template-service
   npm run dev

   # Terminal 4 - File Service
   cd services/file-service
   npm run dev

   # Terminal 5 - API Gateway
   cd api-gateway
   npm run dev
   ```

### Stopping Services

```bash
docker-compose down
```

To remove volumes as well:
```bash
docker-compose down -v
```

## Monitoring

### Health Checks

Each service exposes a `/health` endpoint:

- API Gateway: http://localhost:3000/health
- Survey Service: http://localhost:3001/health
- Response Service: http://localhost:3002/health
- Template Service: http://localhost:3003/health
- File Service: http://localhost:3004/health

### Logs

View logs for all services:
```bash
docker-compose logs -f
```

View logs for specific service:
```bash
docker-compose logs -f survey-service
```

## Inter-Service Communication

```
┌─────────────────┐
│   API Gateway   │
│   (Port 3000)   │
└────────┬────────┘
         │
    ┌────┴─────┬─────────┬──────────┐
    │          │         │          │
    ▼          ▼         ▼          ▼
┌────────┐ ┌────────┐ ┌──────┐ ┌──────┐
│Survey  │ │Response│ │Template│ │File  │
│Service │◄┤Service │ │Service │ │Service│
│:3001   │ │:3002   │ │:3003  │ │:3004  │
└───┬────┘ └───┬────┘ └──────┘ └──────┘
    │          │
    ▼          ▼
┌─────────────────┐  ┌──────────┐
│    MongoDB      │  │  Kafka   │
│   (Port 27017)  │  │ (9092)   │
└─────────────────┘  └──────────┘
```

## Configuration

### Environment Variables

Key environment variables (see `.env.example` for complete list):

- `PORT` - Service port
- `MONGO_URI` - MongoDB connection string
- `KAFKA_BROKERS` - Kafka broker addresses
- `LOG_LEVEL` - Logging level (info, debug, error)
- `NODE_ENV` - Environment (development, production)

### Rate Limiting

API Gateway implements rate limiting:
- Window: 15 minutes (configurable)
- Max requests: 100 per window (configurable)

## Security Features

- Helmet.js for security headers
- CORS configuration
- File type validation
- File size limits
- Rate limiting
- Input validation with express-validator

## Next Steps

- [ ] Add authentication & authorization
- [ ] Implement response analytics service
- [ ] Add notification service
- [ ] Create frontend application
- [ ] Add API versioning
- [ ] Implement caching with Redis
- [ ] Add comprehensive testing
- [ ] Set up CI/CD pipeline

## License

ISC

## Author

Ousamma

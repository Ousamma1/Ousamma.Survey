# Ousamma Survey Platform - Sprint 4: AI Service

A comprehensive AI-powered survey platform with multi-provider support, context management, and advanced analytics.

## 🚀 Features

### Multi-Provider AI Support
- **OpenAI** (GPT-4, GPT-3.5)
- **Claude** (Anthropic)
- **Gemini** (Google)
- **Ollama** (Local)
- **Azure OpenAI**
- **Custom Providers** (Generic API)

### AI Capabilities
- 📝 **Survey Generation** - Generate surveys from natural language descriptions
- ⚡ **Survey Optimization** - Improve existing surveys for better engagement
- 📊 **Response Analysis** - Analyze survey responses with AI insights
- 📈 **Report Generation** - Generate comprehensive reports
- 💬 **Chat Interface** - Interactive AI chat with context awareness

### Advanced Features
- 🔄 **Streaming Responses** (SSE)
- 🔐 **Encrypted API Key Storage**
- 📊 **Usage Tracking & Analytics**
- 💰 **Cost Management**
- ⚡ **Rate Limiting**
- 🌐 **Bilingual Support** (English & Arabic)
- 🔁 **Provider Fallback**
- 📝 **Conversation History**
- 🎯 **Context Management**

## 📋 Project Structure

```
Ousamma.Survey/
├── services/
│   └── ai-service/
│       ├── src/
│       │   ├── agents/           # AI agents and orchestration
│       │   │   ├── AIService.ts
│       │   │   └── SurveyAgent.ts
│       │   ├── config/           # Configuration
│       │   │   └── database.ts
│       │   ├── controllers/      # Route controllers
│       │   │   ├── ai.controller.ts
│       │   │   ├── config.controller.ts
│       │   │   └── analytics.controller.ts
│       │   ├── middleware/       # Express middleware
│       │   │   ├── errorHandler.ts
│       │   │   ├── rateLimit.ts
│       │   │   └── validation.ts
│       │   ├── models/          # MongoDB models
│       │   │   ├── Conversation.ts
│       │   │   ├── Context.ts
│       │   │   ├── ProviderConfigModel.ts
│       │   │   └── UsageMetric.ts
│       │   ├── providers/       # AI provider implementations
│       │   │   ├── interfaces/
│       │   │   │   └── AIProvider.ts
│       │   │   ├── OpenAIProvider.ts
│       │   │   ├── ClaudeProvider.ts
│       │   │   ├── GeminiProvider.ts
│       │   │   ├── OllamaProvider.ts
│       │   │   ├── AzureOpenAIProvider.ts
│       │   │   ├── CustomProvider.ts
│       │   │   └── ProviderFactory.ts
│       │   ├── routes/          # API routes
│       │   │   ├── ai.routes.ts
│       │   │   ├── config.routes.ts
│       │   │   └── analytics.routes.ts
│       │   ├── services/        # Business logic services
│       │   │   ├── ContextService.ts
│       │   │   ├── EncryptionService.ts
│       │   │   ├── ProviderConfigService.ts
│       │   │   └── UsageTrackingService.ts
│       │   ├── types/           # TypeScript type definitions
│       │   │   └── index.ts
│       │   ├── utils/           # Utility functions
│       │   │   └── logger.ts
│       │   ├── app.ts           # Express app setup
│       │   └── index.ts         # Entry point
│       ├── package.json
│       ├── tsconfig.json
│       └── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

## 🛠️ Setup & Installation

### Prerequisites
- Node.js >= 18.0.0
- MongoDB >= 5.0
- npm >= 9.0.0

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/Ousamma1/Ousamma.Survey.git
cd Ousamma.Survey
```

2. **Install dependencies**
```bash
npm install
cd services/ai-service
npm install
```

3. **Configure environment variables**
```bash
cd services/ai-service
cp .env.example .env
```

Edit `.env` and add your API keys and configuration:
```env
# Server
PORT=3001
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/ousamma-survey

# Encryption (32+ characters)
ENCRYPTION_KEY=your-32-character-encryption-key-here

# API Keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...
AZURE_OPENAI_API_KEY=...
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
OLLAMA_BASE_URL=http://localhost:11434
```

4. **Build the project**
```bash
npm run build
```

5. **Start the service**
```bash
# Development
npm run dev

# Production
npm start
```

## 📡 API Endpoints

### AI Operations

#### Chat with AI
```http
POST /api/ai/chat
Content-Type: application/json

{
  "message": "Hello, how can you help me?",
  "conversationId": "optional-conversation-id",
  "userId": "user123",
  "tenantId": "tenant123",
  "providerId": "openai-default",
  "maxTokens": 2000,
  "temperature": 0.7
}
```

#### Stream Chat
```http
POST /api/ai/stream
Content-Type: application/json

{
  "message": "Generate a survey about customer satisfaction",
  "userId": "user123"
}
```

#### Generate Survey
```http
POST /api/ai/generate-survey
Content-Type: application/json

{
  "description": "Customer satisfaction survey for a restaurant",
  "questionCount": 10,
  "language": "bilingual",
  "questionTypes": ["multiple_choice", "paragraph", "dropdown"],
  "targetAudience": "restaurant customers",
  "userId": "user123"
}
```

#### Optimize Survey
```http
POST /api/ai/optimize-survey
Content-Type: application/json

{
  "survey": { /* survey object */ },
  "optimizationGoals": ["clarity", "engagement", "response rate"],
  "userId": "user123"
}
```

#### Analyze Responses
```http
POST /api/ai/analyze-responses
Content-Type: application/json

{
  "survey": { /* survey object */ },
  "responses": [ /* array of responses */ ],
  "userId": "user123"
}
```

#### Generate Report
```http
POST /api/ai/generate-report
Content-Type: application/json

{
  "survey": { /* survey object */ },
  "responses": [ /* array of responses */ ],
  "reportType": "detailed",
  "userId": "user123"
}
```

### Provider Management

#### List Providers
```http
GET /api/ai/providers?tenantId=tenant123
```

#### Health Check
```http
GET /api/ai/health
```

### Configuration

#### Create Provider Configuration
```http
POST /api/config/providers
Content-Type: application/json

{
  "type": "openai",
  "name": "OpenAI GPT-4",
  "apiKey": "sk-...",
  "model": "gpt-4-turbo-preview",
  "enabled": true,
  "priority": 10
}
```

#### List Provider Configurations
```http
GET /api/config/providers?enabled=true
```

#### Update Provider
```http
PUT /api/config/providers/{providerId}
Content-Type: application/json

{
  "enabled": false,
  "priority": 5
}
```

#### Toggle Provider
```http
POST /api/config/providers/{providerId}/toggle
Content-Type: application/json

{
  "enabled": true
}
```

### Analytics

#### Get Usage Metrics
```http
GET /api/analytics/usage?userId=user123&startDate=2024-01-01&endDate=2024-01-31
```

#### Get Usage Statistics
```http
GET /api/analytics/stats?tenantId=tenant123
```

#### Get Cost Summary
```http
GET /api/analytics/cost?tenantId=tenant123&startDate=2024-01-01
```

## 🔑 Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `PORT` | Server port | No | 3001 |
| `NODE_ENV` | Environment | No | development |
| `MONGODB_URI` | MongoDB connection string | Yes | - |
| `ENCRYPTION_KEY` | 32+ character encryption key | Yes | - |
| `OPENAI_API_KEY` | OpenAI API key | No | - |
| `ANTHROPIC_API_KEY` | Anthropic API key | No | - |
| `GOOGLE_API_KEY` | Google API key | No | - |
| `AZURE_OPENAI_API_KEY` | Azure OpenAI API key | No | - |
| `AZURE_OPENAI_ENDPOINT` | Azure OpenAI endpoint | No | - |
| `OLLAMA_BASE_URL` | Ollama base URL | No | http://localhost:11434 |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | No | 60000 |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | No | 100 |

## 🏗️ Architecture

### Provider Abstraction Layer
All AI providers implement the `IAIProvider` interface, ensuring consistent behavior:

```typescript
interface IAIProvider {
  generateCompletion(request: CompletionRequest): Promise<CompletionResponse>;
  streamCompletion(request: CompletionRequest): AsyncIterableIterator<StreamChunk>;
  validateConfig(): boolean;
  testConnection(): Promise<boolean>;
  getHealthStatus(): Promise<HealthStatus>;
}
```

### Context Management
- **Conversations** - Store chat history
- **Contexts** - Store survey, response, and file contexts
- **Session Management** - User and tenant-specific contexts

### Provider Selection
1. Explicit provider ID
2. Provider type with fallback
3. Default provider (highest priority enabled)

### Security
- API keys encrypted with AES-256
- Rate limiting per endpoint
- Request validation
- Error sanitization

## 🧪 Testing

```bash
# Run tests
npm test

# Watch mode
npm run test:watch
```

## 📊 Monitoring & Analytics

The service tracks:
- Request counts
- Token usage
- Costs per provider
- Latency metrics
- Error rates
- Success rates

Access analytics via `/api/analytics/*` endpoints.

## 🔄 Provider Fallback

Configure fallback order for high availability:

```typescript
providerManager.setFallbackOrder([
  ProviderType.OPENAI,
  ProviderType.CLAUDE,
  ProviderType.GEMINI
]);
```

If OpenAI fails, the service automatically falls back to Claude, then Gemini.

## 🌐 Deployment

### Docker Deployment (Recommended)

See `docker-compose.yml` for complete setup with MongoDB and Redis.

```bash
docker-compose up -d
```

### Manual Deployment

1. Build the project: `npm run build`
2. Start MongoDB
3. Set environment variables
4. Run: `npm start`

## 📝 License

MIT

## 👥 Contributing

Contributions are welcome! Please follow the existing code style and add tests for new features.

## 📧 Support

For issues and questions, please open an issue on GitHub.

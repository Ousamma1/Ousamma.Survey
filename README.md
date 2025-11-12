# AI-Powered Survey Platform



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
├── index.js                    # Main Express server (port 3000)
├── package.json                # Main dependencies and scripts
├── .env.example               # Environment configuration template
├── .gitignore                 # Git ignore rules
├── README.md                  # This file
├── surveyor-service/          # Surveyor Management Microservice
│   ├── index.js               # Surveyor service server (port 3001)
│   ├── package.json           # Surveyor service dependencies
│   ├── .env                   # Surveyor service configuration
│   ├── .env.example          # Configuration template
│   ├── API_DOCUMENTATION.md  # Complete API documentation
│   ├── models/               # MongoDB models
│   │   ├── Surveyor.js       # Surveyor model
│   │   ├── Assignment.js     # Assignment model
│   │   └── Activity.js       # Activity tracking model
│   ├── controllers/          # Business logic
│   │   ├── surveyorController.js
│   │   ├── assignmentController.js
│   │   └── activityController.js
│   ├── routes/               # API routes
│   │   ├── surveyors.js
│   │   ├── assignments.js
│   │   └── activities.js
│   ├── middleware/           # Middleware
│   │   ├── auth.js           # Authentication
│   │   └── validation.js     # Request validation
│   └── database/             # Database configuration
│       └── connection.js     # MongoDB connection
└── public/
    ├── index.html             # Landing page
    ├── survey-builder.html    # AI Survey Builder interface
    ├── dubaisurvey.html       # Survey form with AI enhancement
    ├── thankyou.html          # Thank you page
    ├── surveyor-login.html    # Surveyor portal login
    ├── surveyor-dashboard.html # Surveyor dashboard
    ├── admin-surveyors.html   # Admin surveyor management
    ├── admin-performance.html # Admin performance dashboard
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

### Main Application

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

4. **Start the main server**
   ```bash
   npm start
   ```

### Surveyor Management Service

1. **Install MongoDB**
   ```bash
   # On macOS
   brew install mongodb-community
   brew services start mongodb-community

   # On Ubuntu
   sudo apt-get install mongodb
   sudo systemctl start mongodb

   # Or use MongoDB Atlas (cloud)
   # Update MONGODB_URI in surveyor-service/.env
   ```

2. **Install surveyor service dependencies**
   ```bash
   cd surveyor-service
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your MongoDB URI and other settings
   ```

4. **Start the surveyor service**
   ```bash
   # From surveyor-service directory
   npm start

   # Or for development with auto-reload
   npm run dev
   ```

### Access the Application

- **Main Application**: http://localhost:3000
- **Survey Builder**: http://localhost:3000/survey-builder.html
- **Survey Form**: http://localhost:3000/dubaisurvey.html
- **Surveyor Login**: http://localhost:3000/surveyor-login.html
- **Admin Surveyor Management**: http://localhost:3000/admin-surveyors.html
- **Surveyor Service API**: http://localhost:3001/api
- **Surveyor Service Health**: http://localhost:3001/health

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


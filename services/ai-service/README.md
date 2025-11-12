# AI Service

Multi-provider AI service for the Ousamma Survey Platform.

## Quick Start

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env` and configure
3. Run development server: `npm run dev`
4. Build for production: `npm run build`
5. Start production server: `npm start`

## Supported Providers

- OpenAI (GPT-4, GPT-3.5)
- Claude (Anthropic)
- Gemini (Google)
- Ollama (Local)
- Azure OpenAI
- Custom Providers

## Documentation

See the main README in the root directory for complete documentation.

## API Endpoints

- `POST /api/ai/chat` - Chat with AI
- `POST /api/ai/stream` - Stream chat responses
- `POST /api/ai/generate-survey` - Generate survey
- `POST /api/ai/optimize-survey` - Optimize survey
- `POST /api/ai/analyze-responses` - Analyze responses
- `POST /api/ai/generate-report` - Generate report
- `GET /api/ai/providers` - List providers
- `GET /api/ai/health` - Health check

For complete API documentation, see the main README.

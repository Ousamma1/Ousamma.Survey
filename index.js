const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const http = require('http');
const WebSocket = require('ws');
const compression = require('compression');
require('dotenv').config();

// Import cache utilities
const cache = require('./services/shared/cache/redis-cache');
const { cacheMiddleware, invalidateMiddleware, etagMiddleware } = require('./services/shared/cache/cache-middleware');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: '/ws' });
const PORT = process.env.PORT || 3000;

// Middleware - Order matters!
app.use(cors());

// Response compression (before other middleware)
app.use(compression({
  threshold: 1024, // Compress responses > 1KB
  level: 6,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static('public'));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
    } catch (error) {
      console.error('Error creating upload directory:', error);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx|txt|csv|json/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images, PDFs, documents, and text files are allowed.'));
    }
  }
});

// AI Configuration
const AI_CONFIG = {
  provider: process.env.AI_PROVIDER || 'openai',
  apiUrl: process.env.AI_API_URL || 'https://ousammai.onrender.com/api/ai',
  apiKey: process.env.AI_API_KEY || '',
  model: process.env.AI_MODEL || 'gpt-4'
};

// Helper function to call AI API
async function callAI(endpoint, data) {
  try {
    const response = await fetch(`${AI_CONFIG.apiUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': AI_CONFIG.apiKey ? `Bearer ${AI_CONFIG.apiKey}` : ''
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('AI API call failed:', error);
    throw error;
  }
}

// ============================================
// AI ENDPOINTS
// ============================================

// Chat endpoint - streaming support
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { message, history, context, provider } = req.body;

    const aiResponse = await callAI('/chat', {
      message,
      history: history || [],
      context: context || {},
      provider: provider || AI_CONFIG.provider,
      model: AI_CONFIG.model,
      stream: false
    });

    res.json(aiResponse);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Survey generation from natural language
app.post('/api/ai/generate-survey', async (req, res) => {
  try {
    const { description, requirements, context } = req.body;

    const aiResponse = await callAI('/generate-survey', {
      description,
      requirements: requirements || {},
      context: context || {},
      provider: AI_CONFIG.provider
    });

    res.json(aiResponse);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Survey optimization
app.post('/api/ai/optimize-survey', async (req, res) => {
  try {
    const { survey, optimizationGoals, context } = req.body;

    const aiResponse = await callAI('/optimize-survey', {
      survey,
      goals: optimizationGoals || ['clarity', 'engagement', 'completion_rate'],
      context: context || {},
      provider: AI_CONFIG.provider
    });

    res.json(aiResponse);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Response analysis
app.post('/api/ai/analyze-responses', async (req, res) => {
  try {
    const { responses, query, analysisType } = req.body;

    const aiResponse = await callAI('/analyze-responses', {
      responses,
      query: query || '',
      analysisType: analysisType || 'general',
      provider: AI_CONFIG.provider
    });

    res.json(aiResponse);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Natural language query about data
app.post('/api/ai/query-data', async (req, res) => {
  try {
    const { query, data, context } = req.body;

    const aiResponse = await callAI('/query-data', {
      query,
      data,
      context: context || {},
      provider: AI_CONFIG.provider
    });

    res.json(aiResponse);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Trend identification
app.post('/api/ai/identify-trends', async (req, res) => {
  try {
    const { responses, timeframe, categories } = req.body;

    const aiResponse = await callAI('/identify-trends', {
      responses,
      timeframe: timeframe || 'all',
      categories: categories || [],
      provider: AI_CONFIG.provider
    });

    res.json(aiResponse);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Anomaly detection
app.post('/api/ai/detect-anomalies', async (req, res) => {
  try {
    const { responses, threshold } = req.body;

    const aiResponse = await callAI('/detect-anomalies', {
      responses,
      threshold: threshold || 0.05,
      provider: AI_CONFIG.provider
    });

    res.json(aiResponse);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Report generation
app.post('/api/ai/generate-report', async (req, res) => {
  try {
    const { responses, reportType, format, sections } = req.body;

    const aiResponse = await callAI('/generate-report', {
      responses,
      reportType: reportType || 'comprehensive',
      format: format || 'markdown',
      sections: sections || ['summary', 'insights', 'recommendations'],
      provider: AI_CONFIG.provider
    });

    res.json(aiResponse);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Text enhancement (existing feature)
app.post('/api/ai/enhance', async (req, res) => {
  try {
    const { text } = req.body;

    const aiResponse = await callAI('/enhance', {
      text,
      provider: AI_CONFIG.provider
    });

    res.json(aiResponse);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// A/B testing suggestions
app.post('/api/ai/ab-test-suggestions', async (req, res) => {
  try {
    const { survey, metric } = req.body;

    const aiResponse = await callAI('/ab-test-suggestions', {
      survey,
      metric: metric || 'completion_rate',
      provider: AI_CONFIG.provider
    });

    res.json(aiResponse);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// FILE UPLOAD & CONTEXT MANAGEMENT
// ============================================

// Upload context file
app.post('/api/context/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileData = {
      filename: req.file.originalname,
      path: req.file.path,
      size: req.file.size,
      mimetype: req.file.mimetype,
      uploadedAt: new Date().toISOString()
    };

    // Store file metadata
    const contextDir = path.join(__dirname, 'data', 'context');
    await fs.mkdir(contextDir, { recursive: true });

    const metadataPath = path.join(contextDir, 'files.json');
    let files = [];
    try {
      const existing = await fs.readFile(metadataPath, 'utf8');
      files = JSON.parse(existing);
    } catch (error) {
      // File doesn't exist yet
    }

    files.push(fileData);
    await fs.writeFile(metadataPath, JSON.stringify(files, null, 2));

    res.json({ success: true, file: fileData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get context files
app.get('/api/context/files', async (req, res) => {
  try {
    const metadataPath = path.join(__dirname, 'data', 'context', 'files.json');
    try {
      const data = await fs.readFile(metadataPath, 'utf8');
      res.json({ files: JSON.parse(data) });
    } catch (error) {
      res.json({ files: [] });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete context file
app.delete('/api/context/files/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const metadataPath = path.join(__dirname, 'data', 'context', 'files.json');

    let files = [];
    try {
      const data = await fs.readFile(metadataPath, 'utf8');
      files = JSON.parse(data);
    } catch (error) {
      return res.status(404).json({ error: 'File not found' });
    }

    const fileIndex = files.findIndex(f => f.filename === filename);
    if (fileIndex === -1) {
      return res.status(404).json({ error: 'File not found' });
    }

    const file = files[fileIndex];

    // Delete physical file
    try {
      await fs.unlink(file.path);
    } catch (error) {
      console.error('Error deleting physical file:', error);
    }

    // Remove from metadata
    files.splice(fileIndex, 1);
    await fs.writeFile(metadataPath, JSON.stringify(files, null, 2));

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// SURVEY MANAGEMENT
// ============================================

// Save survey (with cache invalidation)
app.post('/api/surveys/save',
  invalidateMiddleware({
    namespace: 'survey',
    pattern: '*'
  }),
  async (req, res) => {
    try {
      const { surveyId, survey } = req.body;

      if (!surveyId || !survey) {
        return res.status(400).json({ error: 'Survey ID and survey data are required' });
      }

      const surveysDir = path.join(__dirname, 'public', 'Surveys');
      await fs.mkdir(surveysDir, { recursive: true });

      const filePath = path.join(surveysDir, `${surveyId}.json`);
      await fs.writeFile(filePath, JSON.stringify(survey, null, 2));

      // Invalidate specific survey cache
      await cache.del('survey', surveyId);
      await cache.del('survey', 'list:all');

      res.json({ success: true, surveyId });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Get survey (with caching)
app.get('/api/surveys/:surveyId',
  cacheMiddleware('survey', {
    namespace: 'survey',
    keyGenerator: (req) => req.params.surveyId
  }),
  async (req, res) => {
    try {
      const { surveyId } = req.params;
      const filePath = path.join(__dirname, 'public', 'Surveys', `${surveyId}.json`);

      const data = await fs.readFile(filePath, 'utf8');
      res.json(JSON.parse(data));
    } catch (error) {
      res.status(404).json({ error: 'Survey not found' });
    }
  }
);

// List surveys (with caching)
app.get('/api/surveys',
  cacheMiddleware('medium', {
    namespace: 'survey',
    keyGenerator: (req) => 'list:all'
  }),
  async (req, res) => {
    try {
      const surveysDir = path.join(__dirname, 'public', 'Surveys');
      await fs.mkdir(surveysDir, { recursive: true });

      const files = await fs.readdir(surveysDir);
      const surveys = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const filePath = path.join(surveysDir, file);
            const data = await fs.readFile(filePath, 'utf8');
            const survey = JSON.parse(data);
            surveys.push({
              id: file.replace('.json', ''),
              title: survey.title || survey.name || `Survey ${file.replace('.json', '')}`,
              description: survey.description || '',
              questions: survey.questions || [],
              createdAt: survey.createdAt || new Date().toISOString(),
              ...survey
            });
          } catch (error) {
            console.error(`Error reading survey ${file}:`, error);
          }
        }
      }

      res.json(surveys);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Save survey responses
app.post('/api/responses/save', async (req, res) => {
  try {
    const { surveyId, responses } = req.body;

    const responsesDir = path.join(__dirname, 'data', 'responses');
    await fs.mkdir(responsesDir, { recursive: true });

    const timestamp = Date.now();
    const responseData = {
      surveyId,
      responses,
      timestamp,
      submittedAt: new Date().toISOString()
    };

    const filePath = path.join(responsesDir, `${surveyId}-${timestamp}.json`);
    await fs.writeFile(filePath, JSON.stringify(responseData, null, 2));

    // Broadcast new response to WebSocket clients
    broadcastToSurveySubscribers(surveyId, {
      type: 'new_response',
      data: {
        surveyId,
        responseId: `${surveyId}-${timestamp}`,
        timestamp: responseData.submittedAt
      }
    });

    res.json({ success: true, responseId: `${surveyId}-${timestamp}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get survey responses
app.get('/api/responses/:surveyId', async (req, res) => {
  try {
    const { surveyId } = req.params;
    const responsesDir = path.join(__dirname, 'data', 'responses');

    try {
      await fs.mkdir(responsesDir, { recursive: true });
    } catch (error) {
      // Directory exists
    }

    let files = [];
    try {
      files = await fs.readdir(responsesDir);
    } catch (error) {
      return res.json([]);
    }

    const surveyResponses = [];

    for (const file of files) {
      if (file.startsWith(surveyId) && file.endsWith('.json')) {
        try {
          const data = await fs.readFile(path.join(responsesDir, file), 'utf8');
          const response = JSON.parse(data);
          surveyResponses.push({
            id: file.replace('.json', ''),
            surveyId: response.surveyId,
            answers: response.responses || response.answers || {},
            timestamp: response.timestamp,
            createdAt: response.submittedAt || response.createdAt,
            completed: response.completed !== false,
            ...response
          });
        } catch (error) {
          console.error(`Error reading response ${file}:`, error);
        }
      }
    }

    res.json(surveyResponses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// WEBSOCKET REAL-TIME UPDATES
// ============================================

// Store WebSocket client subscriptions
const surveySubscriptions = new Map(); // surveyId -> Set of WebSocket clients

// WebSocket connection handler
wss.on('connection', (ws) => {
  console.log('New WebSocket client connected');
  ws.subscribedSurveys = new Set();

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      switch (data.type) {
        case 'subscribe':
          const surveyId = data.data?.surveyId;
          if (surveyId) {
            // Add client to survey subscribers
            if (!surveySubscriptions.has(surveyId)) {
              surveySubscriptions.set(surveyId, new Set());
            }
            surveySubscriptions.get(surveyId).add(ws);
            ws.subscribedSurveys.add(surveyId);
            console.log(`Client subscribed to survey: ${surveyId}`);
          }
          break;

        case 'unsubscribe':
          const unsubSurveyId = data.data?.surveyId;
          if (unsubSurveyId && surveySubscriptions.has(unsubSurveyId)) {
            surveySubscriptions.get(unsubSurveyId).delete(ws);
            ws.subscribedSurveys.delete(unsubSurveyId);
            console.log(`Client unsubscribed from survey: ${unsubSurveyId}`);
          }
          break;

        case 'ping':
          ws.send(JSON.stringify({ type: 'pong' }));
          break;

        default:
          console.log('Unknown WebSocket message type:', data.type);
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
    }
  });

  ws.on('close', () => {
    console.log('WebSocket client disconnected');
    // Remove client from all subscriptions
    ws.subscribedSurveys.forEach(surveyId => {
      if (surveySubscriptions.has(surveyId)) {
        surveySubscriptions.get(surveyId).delete(ws);
        if (surveySubscriptions.get(surveyId).size === 0) {
          surveySubscriptions.delete(surveyId);
        }
      }
    });
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Broadcast message to all subscribers of a survey
function broadcastToSurveySubscribers(surveyId, message) {
  if (!surveySubscriptions.has(surveyId)) return;

  const subscribers = surveySubscriptions.get(surveyId);
  const messageStr = JSON.stringify(message);

  subscribers.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageStr);
    }
  });

  console.log(`Broadcast to ${subscribers.size} subscribers of survey ${surveyId}`);
}

// Broadcast to all connected clients
function broadcastToAll(message) {
  const messageStr = JSON.stringify(message);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageStr);
    }
  });
}

// ============================================
// HEALTH CHECK
// ============================================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    aiProvider: AI_CONFIG.provider,
    websocket: {
      connected: wss.clients.size,
      subscriptions: surveySubscriptions.size
    }
  });
});

// Start server with Redis initialization
async function startServer() {
  try {
    // Connect to Redis
    await cache.connect();
    console.log('✅ Redis cache connected');

    // Start HTTP server
    server.listen(PORT, () => {
      console.log(`🚀 Ousamma Survey Server running on port ${PORT}`);
      console.log(`📊 AI Provider: ${AI_CONFIG.provider}`);
      console.log(`🔗 API URL: http://localhost:${PORT}`);
      console.log(`🔌 WebSocket URL: ws://localhost:${PORT}/ws`);
      console.log(`💾 Cache: Enabled (Redis)`);
      console.log(`📦 Compression: Enabled (gzip)`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    console.warn('⚠️  Starting server without cache (degraded mode)');

    // Start server without cache
    server.listen(PORT, () => {
      console.log(`🚀 Ousamma Survey Server running on port ${PORT} (degraded mode)`);
    });
  }
}

// Graceful shutdown
async function shutdown() {
  console.log('\n🛑 Shutting down gracefully...');

  try {
    // Close WebSocket server
    wss.close(() => {
      console.log('✅ WebSocket server closed');
    });

    // Disconnect Redis
    await cache.disconnect();
    console.log('✅ Redis disconnected');

    // Close HTTP server
    server.close(() => {
      console.log('✅ HTTP server closed');
      process.exit(0);
    });

    // Force exit after 10 seconds
    setTimeout(() => {
      console.error('⚠️  Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
}

// Handle shutdown signals
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start the server
startServer();

module.exports = { app, server, wss };

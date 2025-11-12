const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const { createProxyMiddleware } = require('http-proxy-middleware');
const rateLimit = require('express-rate-limit');
const createLogger = require('../../shared/utils/logger');

dotenv.config();

const app = express();
const logger = createLogger('api-gateway');
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

// Request logging
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Service URLs
const services = {
  survey: process.env.SURVEY_SERVICE_URL || 'http://survey-service:3001',
  response: process.env.RESPONSE_SERVICE_URL || 'http://response-service:3002',
  template: process.env.TEMPLATE_SERVICE_URL || 'http://template-service:3003',
  file: process.env.FILE_SERVICE_URL || 'http://file-service:3004'
};

// Proxy options
const proxyOptions = {
  changeOrigin: true,
  onError: (err, req, res) => {
    logger.error('Proxy error:', err);
    res.status(500).json({
      success: false,
      message: 'Service temporarily unavailable',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  },
  onProxyReq: (proxyReq, req, res) => {
    logger.info(`Proxying ${req.method} ${req.url}`);
  }
};

// Route to Survey Service
app.use('/api/v1/surveys', createProxyMiddleware({
  target: services.survey,
  ...proxyOptions,
  pathRewrite: {
    '^/api/v1/surveys': '/api/v1/surveys'
  }
}));

app.use('/api/v1/questions', createProxyMiddleware({
  target: services.survey,
  ...proxyOptions,
  pathRewrite: {
    '^/api/v1/questions': '/api/v1/questions'
  }
}));

// Route to Response Service
app.use('/api/v1/responses', createProxyMiddleware({
  target: services.response,
  ...proxyOptions,
  pathRewrite: {
    '^/api/v1/responses': '/api/v1/responses'
  }
}));

// Route to Template Service
app.use('/api/v1/templates', createProxyMiddleware({
  target: services.template,
  ...proxyOptions,
  pathRewrite: {
    '^/api/v1/templates': '/api/v1/templates'
  }
}));

// Route to File Service
app.use('/api/v1/files', createProxyMiddleware({
  target: services.file,
  ...proxyOptions,
  pathRewrite: {
    '^/api/v1/files': '/api/v1/files'
  }
}));

// Serve uploaded files through gateway
app.use('/uploads', createProxyMiddleware({
  target: services.file,
  ...proxyOptions,
  pathRewrite: {
    '^/uploads': '/uploads'
  }
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
    services: {
      survey: services.survey,
      response: services.response,
      template: services.template,
      file: services.file
    }
  });
});

// API documentation
app.get('/api/v1', (req, res) => {
  res.json({
    name: 'Ousamma Survey Platform API',
    version: '1.0.0',
    endpoints: {
      surveys: {
        base: '/api/v1/surveys',
        description: 'Survey management operations',
        methods: ['GET', 'POST', 'PUT', 'DELETE']
      },
      questions: {
        base: '/api/v1/questions',
        description: 'Question bank operations',
        methods: ['GET', 'POST', 'PUT', 'DELETE']
      },
      responses: {
        base: '/api/v1/responses',
        description: 'Response collection and management',
        methods: ['GET', 'POST', 'PUT', 'DELETE']
      },
      templates: {
        base: '/api/v1/templates',
        description: 'Survey templates',
        methods: ['GET', 'POST', 'PUT', 'DELETE']
      },
      files: {
        base: '/api/v1/files',
        description: 'File upload and management',
        methods: ['GET', 'POST', 'DELETE']
      }
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error('Gateway error:', err);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`API Gateway listening on port ${PORT}`);
  logger.info('Service routing configuration:');
  Object.entries(services).forEach(([name, url]) => {
    logger.info(`  ${name}: ${url}`);
  });
});

module.exports = app;

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const database = require('./config/database');
const redisClient = require('./config/redis');
const analyticsRoutes = require('./routes/analytics');

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'analytics-service',
    timestamp: new Date().toISOString(),
    database: database.isConnected(),
    redis: redisClient.isConnected()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Analytics Service',
    version: '1.0.0',
    description: 'Real-time analytics and aggregation service',
    endpoints: {
      health: '/health',
      analytics: '/api/analytics',
      docs: '/api/analytics/docs'
    }
  });
});

// API documentation
app.get('/api/analytics/docs', (req, res) => {
  res.json({
    service: 'Analytics Service API',
    version: '1.0.0',
    endpoints: [
      {
        method: 'GET',
        path: '/api/analytics/survey/:id',
        description: 'Get survey analytics'
      },
      {
        method: 'GET',
        path: '/api/analytics/survey/:id/questions',
        description: 'Get question-level analytics',
        query: { questionId: 'optional - specific question ID' }
      },
      {
        method: 'GET',
        path: '/api/analytics/survey/:id/realtime',
        description: 'Get real-time statistics'
      },
      {
        method: 'GET',
        path: '/api/analytics/survey/:id/export',
        description: 'Export analytics data',
        query: { format: 'json or csv (default: json)' }
      },
      {
        method: 'GET',
        path: '/api/analytics/group/:id',
        description: 'Get group analytics'
      },
      {
        method: 'GET',
        path: '/api/analytics/compare',
        description: 'Compare multiple surveys',
        query: { surveyIds: 'comma-separated survey IDs' }
      },
      {
        method: 'POST',
        path: '/api/analytics/custom',
        description: 'Custom analytics query',
        body: {
          surveyId: 'required',
          startDate: 'optional',
          endDate: 'optional',
          metrics: 'array of metrics',
          filters: 'additional filters'
        }
      }
    ]
  });
});

// API Routes
app.use('/api/analytics', analyticsRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

/**
 * Start server
 */
async function startServer() {
  try {
    // Connect to MongoDB
    await database.connect();
    console.log('✓ MongoDB connected');

    // Connect to Redis
    await redisClient.connect();
    console.log('✓ Redis connected');

    // Start Express server
    app.listen(PORT, () => {
      console.log('=================================');
      console.log(`Analytics Service running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
      console.log(`API docs: http://localhost:${PORT}/api/analytics/docs`);
      console.log('=================================');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

/**
 * Graceful shutdown
 */
async function shutdown() {
  console.log('\nShutting down gracefully...');
  try {
    await database.disconnect();
    await redisClient.disconnect();
    console.log('✓ Connections closed');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start the server
startServer();

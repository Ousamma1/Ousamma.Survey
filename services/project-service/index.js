require('dotenv').config();
const express = require('express');
const cors = require('cors');
const database = require('./config/database');
const redisClient = require('./config/redis');
const kafkaClient = require('./config/kafka');
const projectRoutes = require('./routes/projects');

const app = express();
const PORT = process.env.PORT || 3006;

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
    service: 'project-service',
    timestamp: new Date().toISOString(),
    database: database.isConnected(),
    redis: redisClient.isConnected(),
    kafka: kafkaClient.isProducerConnected()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Project Service',
    version: '1.0.0',
    description: 'Project and survey group management service',
    endpoints: {
      health: '/health',
      projects: '/api/projects',
      docs: '/api/projects/docs'
    }
  });
});

// API documentation
app.get('/api/projects/docs', (req, res) => {
  res.json({
    service: 'Project Service API',
    version: '1.0.0',
    endpoints: [
      {
        group: 'Projects',
        routes: [
          { method: 'GET', path: '/api/projects', description: 'Get all projects for user' },
          { method: 'POST', path: '/api/projects', description: 'Create a new project' },
          { method: 'GET', path: '/api/projects/:id', description: 'Get project by ID' },
          { method: 'PUT', path: '/api/projects/:id', description: 'Update project' },
          { method: 'POST', path: '/api/projects/:id/archive', description: 'Archive project' },
          { method: 'DELETE', path: '/api/projects/:id', description: 'Delete project' },
          { method: 'GET', path: '/api/projects/stats', description: 'Get project statistics' }
        ]
      },
      {
        group: 'Members',
        routes: [
          { method: 'GET', path: '/api/projects/:id/members', description: 'Get project members' },
          { method: 'POST', path: '/api/projects/:id/members', description: 'Add member to project' },
          { method: 'GET', path: '/api/projects/:id/members/:userId', description: 'Get member role' },
          { method: 'PUT', path: '/api/projects/:id/members/:userId', description: 'Update member role' },
          { method: 'DELETE', path: '/api/projects/:id/members/:userId', description: 'Remove member' }
        ]
      },
      {
        group: 'Groups',
        routes: [
          { method: 'GET', path: '/api/projects/:id/groups', description: 'Get all groups' },
          { method: 'POST', path: '/api/projects/:id/groups', description: 'Create group' },
          { method: 'GET', path: '/api/projects/:id/groups/:groupId', description: 'Get group by ID' },
          { method: 'PUT', path: '/api/projects/:id/groups/:groupId', description: 'Update group' },
          { method: 'DELETE', path: '/api/projects/:id/groups/:groupId', description: 'Delete group' },
          { method: 'POST', path: '/api/projects/:id/groups/:groupId/surveys', description: 'Add survey to group' },
          { method: 'DELETE', path: '/api/projects/:id/groups/:groupId/surveys/:surveyId', description: 'Remove survey from group' }
        ]
      },
      {
        group: 'Analytics',
        routes: [
          { method: 'GET', path: '/api/projects/:id/analytics', description: 'Get project analytics' },
          { method: 'GET', path: '/api/projects/:id/analytics/export', description: 'Export project analytics' },
          { method: 'GET', path: '/api/projects/:id/groups/:groupId/analytics', description: 'Get group analytics' },
          { method: 'GET', path: '/api/projects/:id/groups/:groupId/analytics/cross-survey', description: 'Get cross-survey analytics' },
          { method: 'GET', path: '/api/projects/:id/analytics/compare', description: 'Compare groups' }
        ]
      }
    ],
    authentication: {
      type: 'User ID Header',
      header: 'x-user-id',
      description: 'Pass user ID in x-user-id header for authentication'
    },
    permissions: {
      owner: 'Full control over project',
      admin: 'Manage members, groups, and settings',
      editor: 'Create and edit surveys and groups',
      viewer: 'View only access'
    }
  });
});

// API Routes
app.use('/api/projects', projectRoutes);

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
    try {
      await redisClient.connect();
      console.log('✓ Redis connected');
    } catch (error) {
      console.warn('⚠ Redis connection failed, continuing without cache:', error.message);
    }

    // Connect to Kafka
    try {
      await kafkaClient.connectProducer();
      console.log('✓ Kafka producer connected');
    } catch (error) {
      console.warn('⚠ Kafka connection failed, continuing without events:', error.message);
    }

    // Start Express server
    app.listen(PORT, () => {
      console.log('=================================');
      console.log(`Project Service running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
      console.log(`API docs: http://localhost:${PORT}/api/projects/docs`);
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
    await kafkaClient.disconnectProducer();
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

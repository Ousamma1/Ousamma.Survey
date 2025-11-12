require('dotenv').config();

const express = require('express');
const http = require('http');
const cors = require('cors');
const logger = require('./config/logger');
const websocketService = require('./services/websocketService');
const kafkaConsumer = require('./services/kafkaConsumer');
const broadcastController = require('./controllers/broadcastController');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Configuration
const PORT = process.env.PORT || 3002;
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',');

// Middleware
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'websocket-service',
    timestamp: new Date(),
    uptime: process.uptime(),
    connections: websocketService.getStats()
  });
});

// Broadcast API endpoints
app.post('/api/broadcast/room', broadcastController.broadcastToRoom);
app.post('/api/broadcast/user', broadcastController.broadcastToUser);
app.post('/api/broadcast/global', broadcastController.broadcastGlobal);
app.post('/api/broadcast/survey-response', broadcastController.broadcastSurveyResponse);
app.post('/api/broadcast/location', broadcastController.broadcastLocationUpdate);

// Statistics endpoint
app.get('/api/stats', broadcastController.getStats);

// Status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    websocket: {
      initialized: websocketService.io !== null,
      stats: websocketService.getStats()
    },
    kafka: kafkaConsumer.getStatus(),
    timestamp: new Date()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path
  });
});

// Error handler
app.use((error, req, res, next) => {
  logger.error('Express error:', error);
  res.status(500).json({
    error: 'Internal Server Error',
    message: error.message
  });
});

// Initialize WebSocket service
websocketService.initialize(server);

// Start Kafka consumer
kafkaConsumer.start().catch(error => {
  logger.error('Failed to start Kafka consumer:', error);
  logger.warn('WebSocket service will continue without Kafka integration');
});

// Start server
server.listen(PORT, () => {
  logger.info(`WebSocket service listening on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`Allowed origins: ${allowedOrigins.join(', ')}`);
});

// Graceful shutdown
const shutdown = async () => {
  logger.info('Shutting down gracefully...');

  // Stop accepting new connections
  server.close(() => {
    logger.info('HTTP server closed');
  });

  // Shutdown WebSocket service
  await websocketService.shutdown();

  // Stop Kafka consumer
  await kafkaConsumer.stop();

  // Exit process
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Uncaught exception handler
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  shutdown();
});

// Unhandled rejection handler
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

module.exports = { app, server };

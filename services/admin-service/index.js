require('dotenv').config();
const express = require('express');
const cors = require('cors');

const database = require('./config/database');
const redisClient = require('./config/redis');
const kafkaClient = require('./config/kafka');
const monitoringService = require('./services/monitoringService');
const SystemSettings = require('./models/SystemSettings');
const requestLogger = require('./middleware/requestLogger');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 3007;

// ==================== MIDDLEWARE ====================

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// ==================== ROUTES ====================

app.use('/', routes);

// ==================== ERROR HANDLER ====================

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ==================== 404 HANDLER ====================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// ==================== STARTUP ====================

async function startServer() {
  try {
    console.log('🚀 Starting Admin Service...');

    // Connect to MongoDB
    await database.connect();

    // Connect to Redis
    try {
      await redisClient.connect();
    } catch (error) {
      console.warn('⚠️  Redis connection failed, continuing without cache:', error.message);
    }

    // Connect to Kafka
    try {
      await kafkaClient.connectProducer();
    } catch (error) {
      console.warn('⚠️  Kafka connection failed, continuing without events:', error.message);
    }

    // Initialize default settings
    try {
      await SystemSettings.initializeDefaults();
    } catch (error) {
      console.warn('⚠️  Failed to initialize settings:', error.message);
    }

    // Start periodic health checks
    try {
      monitoringService.startPeriodicHealthChecks();
    } catch (error) {
      console.warn('⚠️  Failed to start health checks:', error.message);
    }

    // Start server
    app.listen(PORT, () => {
      console.log('✅ Admin Service started successfully');
      console.log(`📡 Server running on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('');
      console.log('📋 Available endpoints:');
      console.log(`   GET  /health - Service health check`);
      console.log(`   GET  /admin/health - System health status`);
      console.log(`   GET  /admin/services - Service status`);
      console.log(`   GET  /admin/users - User management`);
      console.log(`   GET  /admin/audit - Audit logs`);
      console.log(`   GET  /admin/settings - System settings`);
      console.log(`   GET  /admin/stats - System statistics`);
      console.log(`   POST /admin/backup - Trigger backup`);
      console.log('');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// ==================== GRACEFUL SHUTDOWN ====================

async function gracefulShutdown(signal) {
  console.log(`\n${signal} received, shutting down gracefully...`);

  try {
    // Stop health checks
    monitoringService.stopPeriodicHealthChecks();

    // Disconnect from services
    await Promise.all([
      database.disconnect(),
      redisClient.disconnect(),
      kafkaClient.disconnect()
    ]);

    console.log('✅ Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ==================== START ====================

startServer();

require('dotenv').config();
const database = require('./config/database');
const redisClient = require('./config/redis');
const responseConsumer = require('./consumers/responseConsumer');

/**
 * Analytics Consumer Service
 * Consumes Kafka events and processes real-time analytics
 */

console.log('=================================');
console.log('Analytics Consumer Service');
console.log('=================================');

/**
 * Start the consumer service
 */
async function startService() {
  try {
    console.log('Starting Analytics Consumer Service...');

    // Connect to MongoDB
    await database.connect();
    console.log('✓ MongoDB connected');

    // Connect to Redis
    await redisClient.connect();
    console.log('✓ Redis connected');

    // Start consuming messages
    await responseConsumer.start();
    console.log('✓ Kafka consumer started');

    console.log('=================================');
    console.log('Analytics Consumer Service is running');
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Topics: ${process.env.KAFKA_TOPICS || 'response.submitted'}`);
    console.log('=================================');
  } catch (error) {
    console.error('Failed to start service:', error);
    process.exit(1);
  }
}

/**
 * Graceful shutdown
 */
async function shutdown() {
  console.log('\nShutting down gracefully...');
  try {
    await responseConsumer.stop();
    await database.disconnect();
    await redisClient.disconnect();
    console.log('✓ Service stopped');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
}

// Handle shutdown signals
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  shutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
  shutdown();
});

// Start the service
startService();

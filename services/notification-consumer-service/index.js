/**
 * Notification Consumer Service
 * Consumes events and sends notifications via email, SMS, and push
 */

const express = require('express');
const { KafkaConsumer } = require('../shared/kafka');
const config = require('./config/config');
const database = require('./config/database');
const notificationService = require('./services/notificationService');

const app = express();
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'notification-consumer',
    timestamp: new Date().toISOString()
  });
});

// Notification status endpoint
app.get('/api/notifications/:notificationId', async (req, res) => {
  try {
    const { notificationId } = req.params;
    const status = await notificationService.getNotificationStatus(notificationId);
    res.json(status);
  } catch (error) {
    console.error('Error fetching notification status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Initialize Kafka consumer
let consumer;

async function startConsumer() {
  try {
    // Connect to MongoDB
    await database.connect();

    // Initialize notification services
    await notificationService.initialize();

    consumer = new KafkaConsumer({
      groupId: 'notification-consumer-group',
      clientId: 'notification-consumer'
    });

    await consumer.connect();

    // Subscribe to notification topics
    await consumer.subscribe([
      'survey.created',
      'survey.published',
      'response.submitted',
      'surveyor.registered',
      'notification.send',
      'notification.email',
      'notification.sms',
      'notification.push'
    ]);

    // Register event handlers
    consumer.on('survey.created', async (event) => {
      await notificationService.notifySurveyCreated(event);
    });

    consumer.on('survey.published', async (event) => {
      await notificationService.notifySurveyPublished(event);
    });

    consumer.on('response.submitted', async (event) => {
      await notificationService.notifyResponseSubmitted(event);
    });

    consumer.on('surveyor.registered', async (event) => {
      await notificationService.notifySurveyorRegistered(event);
    });

    consumer.on('notification.send', async (event) => {
      await notificationService.sendNotification(event);
    });

    consumer.on('notification.email', async (event) => {
      await notificationService.sendEmail(event);
    });

    consumer.on('notification.sms', async (event) => {
      await notificationService.sendSMS(event);
    });

    consumer.on('notification.push', async (event) => {
      await notificationService.sendPushNotification(event);
    });

    // Start consuming
    await consumer.consume();

    console.log('✓ Notification consumer started successfully');
  } catch (error) {
    console.error('Failed to start notification consumer:', error);
    process.exit(1);
  }
}

// Graceful shutdown
async function shutdown() {
  console.log('Shutting down notification consumer...');
  if (consumer) {
    await consumer.disconnect();
  }
  await database.disconnect();
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start server
const PORT = config.port || 3004;
app.listen(PORT, async () => {
  console.log(`✓ Notification Consumer Service listening on port ${PORT}`);
  await startConsumer();
});

module.exports = app;

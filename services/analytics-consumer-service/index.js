/**
 * Analytics Consumer Service
 * Consumes survey response events and generates real-time analytics
 */

const express = require('express');
const { KafkaConsumer } = require('../shared/kafka');
const config = require('./config/config');
const analyticsService = require('./services/analyticsService');
const cacheService = require('./services/cacheService');

const app = express();
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'analytics-consumer',
    timestamp: new Date().toISOString()
  });
});

// Analytics API endpoints
app.get('/api/analytics/:surveyId', async (req, res) => {
  try {
    const { surveyId } = req.params;
    const analytics = await analyticsService.getAnalytics(surveyId);
    res.json(analytics);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/analytics/:surveyId/realtime', async (req, res) => {
  try {
    const { surveyId } = req.params;
    const analytics = await cacheService.get(`analytics:${surveyId}`);
    res.json(analytics || { message: 'No real-time analytics available' });
  } catch (error) {
    console.error('Error fetching real-time analytics:', error);
    res.status(500).json({ error: error.message });
  }
});

// Initialize Kafka consumer
let consumer;

async function startConsumer() {
  try {
    consumer = new KafkaConsumer({
      groupId: 'analytics-consumer-group',
      clientId: 'analytics-consumer'
    });

    // Connect to Kafka
    await consumer.connect();

    // Subscribe to topics
    await consumer.subscribe([
      'response.submitted',
      'response.updated',
      'response.deleted',
      'survey.created',
      'survey.published'
    ]);

    // Register event handlers
    consumer.on('response.submitted', async (event, metadata) => {
      console.log('Processing response.submitted event:', event.responseId);
      await analyticsService.processResponseSubmitted(event);
    });

    consumer.on('response.updated', async (event, metadata) => {
      console.log('Processing response.updated event:', event.responseId);
      await analyticsService.processResponseUpdated(event);
    });

    consumer.on('response.deleted', async (event, metadata) => {
      console.log('Processing response.deleted event:', event.responseId);
      await analyticsService.processResponseDeleted(event);
    });

    consumer.on('survey.created', async (event, metadata) => {
      console.log('Processing survey.created event:', event.surveyId);
      await analyticsService.initializeSurveyAnalytics(event);
    });

    consumer.on('survey.published', async (event, metadata) => {
      console.log('Processing survey.published event:', event.surveyId);
      await analyticsService.markSurveyPublished(event);
    });

    // Start consuming
    await consumer.consume();

    console.log('✓ Analytics consumer started successfully');
  } catch (error) {
    console.error('Failed to start analytics consumer:', error);
    process.exit(1);
  }
}

// Graceful shutdown
async function shutdown() {
  console.log('Shutting down analytics consumer...');

  if (consumer) {
    await consumer.disconnect();
  }

  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start server
const PORT = config.port || 3003;
app.listen(PORT, async () => {
  console.log(`✓ Analytics Consumer Service listening on port ${PORT}`);
  await startConsumer();
});

module.exports = app;

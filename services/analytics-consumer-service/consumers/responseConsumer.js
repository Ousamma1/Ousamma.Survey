const kafkaConfig = require('../config/kafka');
const AggregationService = require('../services/aggregationService');
const redisClient = require('../config/redis');

/**
 * Response Consumer
 * Consumes response.submitted events from Kafka and processes them
 */
class ResponseConsumer {
  constructor() {
    this.batchSize = parseInt(process.env.BATCH_SIZE) || 100;
    this.batchTimeout = parseInt(process.env.BATCH_TIMEOUT) || 5000;
    this.messageQueue = [];
    this.processingBatch = false;
  }

  /**
   * Start consuming messages
   */
  async start() {
    try {
      console.log('Starting Response Consumer...');

      // Get topics from environment
      const topics = process.env.KAFKA_TOPICS
        ? process.env.KAFKA_TOPICS.split(',')
        : ['response.submitted'];

      // Subscribe to topics
      await kafkaConfig.subscribe(topics);

      // Start consuming with message handler
      await kafkaConfig.consume(this.handleMessage.bind(this));

      // Start batch processor
      this.startBatchProcessor();

      console.log('Response Consumer started successfully');
    } catch (error) {
      console.error('Failed to start Response Consumer:', error);
      throw error;
    }
  }

  /**
   * Handle incoming message
   */
  async handleMessage(message) {
    try {
      const { topic, value } = message;

      if (!value) {
        console.warn('Received empty message');
        return;
      }

      const data = JSON.parse(value);

      console.log(`Processing ${topic} event`);

      // Route to appropriate handler based on topic
      switch (topic) {
        case 'response.submitted':
          await this.handleResponseSubmitted(data);
          break;
        case 'survey.created':
          await this.handleSurveyCreated(data);
          break;
        case 'survey.updated':
          await this.handleSurveyUpdated(data);
          break;
        default:
          console.warn(`Unknown topic: ${topic}`);
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  }

  /**
   * Handle response.submitted event
   */
  async handleResponseSubmitted(data) {
    try {
      console.log(`Processing response for survey: ${data.surveyId}`);

      // Process response immediately (real-time aggregation)
      await AggregationService.processResponse(data);

      // Invalidate cache for this survey
      await this.invalidateCache(data.surveyId);

      // Publish analytics.update event (if needed)
      // await this.publishAnalyticsUpdate(data.surveyId);

      console.log(`✓ Response processed for survey: ${data.surveyId}`);
    } catch (error) {
      console.error('Error handling response submitted:', error);
      throw error;
    }
  }

  /**
   * Handle survey.created event
   */
  async handleSurveyCreated(data) {
    try {
      console.log(`Survey created: ${data.surveyId}`);
      // Initialize analytics for new survey
      const SurveyAnalytics = require('../models/SurveyAnalytics');

      const analytics = new SurveyAnalytics({
        surveyId: data.surveyId
      });

      await analytics.save();
      console.log(`✓ Analytics initialized for survey: ${data.surveyId}`);
    } catch (error) {
      console.error('Error handling survey created:', error);
    }
  }

  /**
   * Handle survey.updated event
   */
  async handleSurveyUpdated(data) {
    try {
      console.log(`Survey updated: ${data.surveyId}`);
      // Invalidate cache when survey is updated
      await this.invalidateCache(data.surveyId);
      console.log(`✓ Cache invalidated for survey: ${data.surveyId}`);
    } catch (error) {
      console.error('Error handling survey updated:', error);
    }
  }

  /**
   * Invalidate cache for a survey
   */
  async invalidateCache(surveyId) {
    try {
      if (!redisClient.isConnected()) {
        console.warn('Redis not connected, skipping cache invalidation');
        return;
      }

      // Invalidate all cache keys related to this survey
      await redisClient.delPattern(`survey_analytics:${surveyId}`);
      await redisClient.delPattern(`question_analytics:${surveyId}:*`);
      await redisClient.delPattern(`realtime_stats:${surveyId}`);

      console.log(`Cache invalidated for survey: ${surveyId}`);
    } catch (error) {
      console.error('Error invalidating cache:', error);
    }
  }

  /**
   * Add message to batch queue
   */
  addToBatch(message) {
    this.messageQueue.push(message);

    // Process batch if it reaches the size limit
    if (this.messageQueue.length >= this.batchSize) {
      this.processBatch();
    }
  }

  /**
   * Start batch processor with timeout
   */
  startBatchProcessor() {
    setInterval(() => {
      if (this.messageQueue.length > 0 && !this.processingBatch) {
        this.processBatch();
      }
    }, this.batchTimeout);
  }

  /**
   * Process batch of messages
   */
  async processBatch() {
    if (this.processingBatch || this.messageQueue.length === 0) {
      return;
    }

    this.processingBatch = true;
    const batch = this.messageQueue.splice(0, this.batchSize);

    try {
      console.log(`Processing batch of ${batch.length} messages`);

      // Process all messages in batch
      await Promise.all(batch.map(msg => this.handleMessage(msg)));

      console.log(`✓ Batch processed: ${batch.length} messages`);
    } catch (error) {
      console.error('Error processing batch:', error);
    } finally {
      this.processingBatch = false;
    }
  }

  /**
   * Stop consumer
   */
  async stop() {
    try {
      console.log('Stopping Response Consumer...');
      await kafkaConfig.disconnect();
      console.log('Response Consumer stopped');
    } catch (error) {
      console.error('Error stopping consumer:', error);
      throw error;
    }
  }
}

module.exports = new ResponseConsumer();

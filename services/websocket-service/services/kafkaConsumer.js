const kafkaConfig = require('../config/kafka');
const logger = require('../config/logger');
const websocketService = require('./websocketService');
const RoomManager = require('../utils/roomManager');

class KafkaConsumerService {
  constructor() {
    this.consumer = null;
    this.isRunning = false;
    this.topics = [
      process.env.KAFKA_TOPIC_RESPONSES || 'survey.responses',
      process.env.KAFKA_TOPIC_ANALYTICS || 'survey.analytics',
      process.env.KAFKA_TOPIC_LOCATIONS || 'surveyor.locations',
      process.env.KAFKA_TOPIC_NOTIFICATIONS || 'system.notifications'
    ];
  }

  /**
   * Start consuming Kafka messages
   */
  async start() {
    try {
      this.consumer = await kafkaConfig.getConsumer();

      // Subscribe to topics
      await kafkaConfig.subscribe(this.topics);

      // Start consuming
      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          await this.handleMessage(topic, partition, message);
        }
      });

      this.isRunning = true;
      logger.info('Kafka consumer started successfully');

    } catch (error) {
      logger.error('Error starting Kafka consumer:', error);
      throw error;
    }
  }

  /**
   * Handle incoming Kafka message
   */
  async handleMessage(topic, partition, message) {
    try {
      const value = message.value.toString();
      const data = JSON.parse(value);

      logger.debug(`Received message from topic ${topic}:`, data);

      // Route message to appropriate handler
      switch (topic) {
        case process.env.KAFKA_TOPIC_RESPONSES || 'survey.responses':
          await this.handleSurveyResponse(data);
          break;

        case process.env.KAFKA_TOPIC_ANALYTICS || 'survey.analytics':
          await this.handleAnalyticsUpdate(data);
          break;

        case process.env.KAFKA_TOPIC_LOCATIONS || 'surveyor.locations':
          await this.handleLocationUpdate(data);
          break;

        case process.env.KAFKA_TOPIC_NOTIFICATIONS || 'system.notifications':
          await this.handleNotification(data);
          break;

        default:
          logger.warn(`Unknown topic: ${topic}`);
      }

    } catch (error) {
      logger.error(`Error handling message from topic ${topic}:`, error);
    }
  }

  /**
   * Handle survey response event
   */
  async handleSurveyResponse(data) {
    const { surveyId, responseId, response, metadata } = data;

    logger.info(`New survey response: Survey ${surveyId}, Response ${responseId}`);

    // Broadcast to survey room
    const surveyRoom = RoomManager.getSurveyRoom(surveyId);
    websocketService.broadcastToRoom(surveyRoom, 'response.new', {
      type: 'response.new',
      surveyId,
      responseId,
      response,
      metadata
    });

    // Broadcast to project room if projectId is provided
    if (metadata?.projectId) {
      const projectRoom = RoomManager.getProjectRoom(metadata.projectId);
      websocketService.broadcastToRoom(projectRoom, 'response.new', {
        type: 'response.new',
        surveyId,
        responseId,
        response,
        metadata
      });
    }

    // Notify global room (limited info)
    websocketService.broadcastGlobal('response.notification', {
      type: 'response.notification',
      surveyId,
      message: 'New survey response received'
    });
  }

  /**
   * Handle analytics update event
   */
  async handleAnalyticsUpdate(data) {
    const { surveyId, projectId, analytics, type } = data;

    logger.info(`Analytics update: ${type} for Survey ${surveyId}`);

    // Broadcast to survey room
    if (surveyId) {
      const surveyRoom = RoomManager.getSurveyRoom(surveyId);
      websocketService.broadcastToRoom(surveyRoom, 'analytics.update', {
        type: 'analytics.update',
        surveyId,
        analytics,
        updateType: type
      });
    }

    // Broadcast to project room
    if (projectId) {
      const projectRoom = RoomManager.getProjectRoom(projectId);
      websocketService.broadcastToRoom(projectRoom, 'analytics.update', {
        type: 'analytics.update',
        projectId,
        analytics,
        updateType: type
      });
    }
  }

  /**
   * Handle surveyor location update
   */
  async handleLocationUpdate(data) {
    const { surveyorId, surveyId, projectId, location, metadata } = data;

    logger.info(`Location update: Surveyor ${surveyorId}`);

    // Broadcast to survey room
    if (surveyId) {
      const surveyRoom = RoomManager.getSurveyRoom(surveyId);
      websocketService.broadcastToRoom(surveyRoom, 'surveyor.location', {
        type: 'surveyor.location',
        surveyorId,
        surveyId,
        location,
        metadata
      });
    }

    // Broadcast to project room
    if (projectId) {
      const projectRoom = RoomManager.getProjectRoom(projectId);
      websocketService.broadcastToRoom(projectRoom, 'surveyor.location', {
        type: 'surveyor.location',
        surveyorId,
        projectId,
        location,
        metadata
      });
    }

    // Broadcast to surveyor's user room
    if (surveyorId) {
      const userRoom = RoomManager.getUserRoom(surveyorId);
      websocketService.broadcastToRoom(userRoom, 'location.updated', {
        type: 'location.updated',
        location,
        metadata
      });
    }
  }

  /**
   * Handle system notification
   */
  async handleNotification(data) {
    const { userId, type, title, message, priority, metadata } = data;

    logger.info(`Notification: ${type} for ${userId || 'global'}`);

    // User-specific notification
    if (userId) {
      websocketService.broadcastToUser(userId, 'notification', {
        type: 'notification',
        notificationType: type,
        title,
        message,
        priority: priority || 'normal',
        metadata
      });
    } else {
      // Global notification
      websocketService.broadcastGlobal('notification', {
        type: 'notification',
        notificationType: type,
        title,
        message,
        priority: priority || 'normal',
        metadata
      });
    }
  }

  /**
   * Stop consuming
   */
  async stop() {
    try {
      if (this.consumer) {
        await this.consumer.disconnect();
        this.isRunning = false;
        logger.info('Kafka consumer stopped');
      }
    } catch (error) {
      logger.error('Error stopping Kafka consumer:', error);
    }
  }

  /**
   * Get consumer status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      topics: this.topics
    };
  }
}

module.exports = new KafkaConsumerService();

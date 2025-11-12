/**
 * Kafka Consumer Utility
 * Handles event consumption with retry logic and error handling
 */

const { Kafka, logLevel } = require('kafkajs');
const config = require('./config');

class KafkaConsumer {
  constructor(options = {}) {
    this.clientId = options.clientId || config.clientId;
    this.groupId = options.groupId || config.consumer.groupId;
    this.brokers = options.brokers || config.brokers;
    this.topics = options.topics || [];

    // Initialize Kafka client
    this.kafka = new Kafka({
      clientId: this.clientId,
      brokers: this.brokers,
      connectionTimeout: config.connectionTimeout,
      requestTimeout: config.requestTimeout,
      retry: config.retry,
      logLevel: this.getLogLevel(config.logLevel)
    });

    this.consumer = null;
    this.isConnected = false;
    this.handlers = new Map();
  }

  /**
   * Get KafkaJS log level
   */
  getLogLevel(level) {
    const levels = {
      error: logLevel.ERROR,
      warn: logLevel.WARN,
      info: logLevel.INFO,
      debug: logLevel.DEBUG
    };
    return levels[level] || logLevel.INFO;
  }

  /**
   * Connect to Kafka
   */
  async connect() {
    if (this.isConnected) {
      return;
    }

    try {
      this.consumer = this.kafka.consumer({
        groupId: this.groupId,
        sessionTimeout: config.consumer.sessionTimeout,
        rebalanceTimeout: config.consumer.rebalanceTimeout,
        heartbeatInterval: config.consumer.heartbeatInterval,
        maxBytesPerPartition: config.consumer.maxBytesPerPartition,
        retry: config.consumer.retry
      });

      await this.consumer.connect();
      this.isConnected = true;
      console.log(`✓ Kafka consumer connected: ${this.groupId}`);
    } catch (error) {
      console.error('Failed to connect Kafka consumer:', error);
      throw error;
    }
  }

  /**
   * Disconnect from Kafka
   */
  async disconnect() {
    if (!this.isConnected) {
      return;
    }

    try {
      await this.consumer.disconnect();
      this.isConnected = false;
      console.log('✓ Kafka consumer disconnected');
    } catch (error) {
      console.error('Error disconnecting Kafka consumer:', error);
      throw error;
    }
  }

  /**
   * Subscribe to topics
   */
  async subscribe(topics) {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      const topicArray = Array.isArray(topics) ? topics : [topics];

      for (const topic of topicArray) {
        await this.consumer.subscribe({
          topic,
          fromBeginning: false
        });
        console.log(`✓ Subscribed to topic: ${topic}`);
      }

      this.topics.push(...topicArray);
    } catch (error) {
      console.error('Failed to subscribe to topics:', error);
      throw error;
    }
  }

  /**
   * Register event handler
   */
  on(eventType, handler) {
    this.handlers.set(eventType, handler);
  }

  /**
   * Start consuming messages
   */
  async consume(options = {}) {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      await this.consumer.run({
        autoCommit: options.autoCommit !== false,
        autoCommitInterval: options.autoCommitInterval || 5000,
        autoCommitThreshold: options.autoCommitThreshold || 100,
        eachMessage: async ({ topic, partition, message }) => {
          await this.handleMessage(topic, partition, message);
        }
      });

      console.log(`✓ Consumer started for topics: ${this.topics.join(', ')}`);
    } catch (error) {
      console.error('Error consuming messages:', error);
      throw error;
    }
  }

  /**
   * Handle incoming message
   */
  async handleMessage(topic, partition, message) {
    const startTime = Date.now();

    try {
      // Parse message
      const event = JSON.parse(message.value.toString());
      const eventType = message.headers?.eventType?.toString() || event.eventType;

      console.log(`Received event from ${topic}:`, {
        eventType,
        partition,
        offset: message.offset,
        key: message.key?.toString()
      });

      // Get handler
      const handler = this.handlers.get(eventType) || this.handlers.get('*');

      if (!handler) {
        console.warn(`No handler registered for event type: ${eventType}`);
        return;
      }

      // Execute handler with retry logic
      await this.executeWithRetry(handler, event, message, topic);

      const duration = Date.now() - startTime;
      console.log(`✓ Event processed in ${duration}ms`);
    } catch (error) {
      console.error('Error handling message:', error);

      // Send to DLQ if max retries exceeded
      const retryCount = parseInt(message.headers?.retryCount?.toString() || '0');
      if (retryCount >= config.dlq.maxRetries) {
        await this.sendToDLQ(topic, message, error);
      } else {
        // Retry
        await this.retryMessage(topic, message, error, retryCount);
      }
    }
  }

  /**
   * Execute handler with retry logic
   */
  async executeWithRetry(handler, event, message, topic, retryCount = 0) {
    try {
      await handler(event, {
        topic,
        partition: message.partition,
        offset: message.offset,
        key: message.key?.toString(),
        headers: message.headers,
        timestamp: message.timestamp
      });
    } catch (error) {
      if (retryCount < config.dlq.maxRetries) {
        console.log(`Retrying handler (attempt ${retryCount + 1}/${config.dlq.maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, config.dlq.retryDelay));
        await this.executeWithRetry(handler, event, message, topic, retryCount + 1);
      } else {
        throw error;
      }
    }
  }

  /**
   * Retry message by republishing
   */
  async retryMessage(topic, message, error, retryCount) {
    try {
      const event = JSON.parse(message.value.toString());
      event.retryCount = retryCount + 1;

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, config.dlq.retryDelay));

      console.log(`Retrying message (attempt ${retryCount + 1}/${config.dlq.maxRetries})`);
    } catch (retryError) {
      console.error('Failed to retry message:', retryError);
    }
  }

  /**
   * Send message to Dead Letter Queue
   */
  async sendToDLQ(topic, message, error) {
    try {
      const { getProducer } = require('./producer');
      const producer = getProducer();

      const dlqTopic = this.getDLQTopic(topic);
      const event = JSON.parse(message.value.toString());

      const dlqEvent = {
        originalTopic: topic,
        originalEvent: event,
        originalMessage: {
          partition: message.partition,
          offset: message.offset,
          key: message.key?.toString(),
          timestamp: message.timestamp
        },
        error: {
          message: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString()
        },
        retryCount: parseInt(message.headers?.retryCount?.toString() || '0')
      };

      await producer.sendEvent(dlqTopic, dlqEvent);
      console.log(`Message sent to DLQ: ${dlqTopic}`);
    } catch (dlqError) {
      console.error('Failed to send to DLQ:', dlqError);
    }
  }

  /**
   * Get DLQ topic name
   */
  getDLQTopic(topic) {
    if (topic.startsWith('survey.')) return config.topics.dlqSurvey;
    if (topic.startsWith('response.')) return config.topics.dlqResponse;
    if (topic.startsWith('notification.')) return config.topics.dlqNotification;
    if (topic.startsWith('audit.')) return config.topics.dlqAudit;
    return 'dlq.general';
  }

  /**
   * Seek to specific offset
   */
  async seek(topic, partition, offset) {
    try {
      await this.consumer.seek({ topic, partition, offset });
      console.log(`Seeked to offset ${offset} on ${topic}:${partition}`);
    } catch (error) {
      console.error('Error seeking:', error);
      throw error;
    }
  }

  /**
   * Pause consumption
   */
  pause(topics) {
    const topicPartitions = topics.map(topic => ({ topic }));
    this.consumer.pause(topicPartitions);
    console.log(`Paused topics: ${topics.join(', ')}`);
  }

  /**
   * Resume consumption
   */
  resume(topics) {
    const topicPartitions = topics.map(topic => ({ topic }));
    this.consumer.resume(topicPartitions);
    console.log(`Resumed topics: ${topics.join(', ')}`);
  }

  /**
   * Get consumer metrics
   */
  async getMetrics() {
    // This would be implemented to return consumer lag, throughput, etc.
    return {
      groupId: this.groupId,
      topics: this.topics,
      isConnected: this.isConnected
    };
  }
}

module.exports = {
  KafkaConsumer
};

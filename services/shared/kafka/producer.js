/**
 * Kafka Producer Utility
 * Handles event production with retry logic and error handling
 */

const { Kafka, logLevel } = require('kafkajs');
const config = require('./config');

class KafkaProducer {
  constructor(options = {}) {
    this.clientId = options.clientId || config.clientId;
    this.brokers = options.brokers || config.brokers;

    // Initialize Kafka client
    this.kafka = new Kafka({
      clientId: this.clientId,
      brokers: this.brokers,
      connectionTimeout: config.connectionTimeout,
      requestTimeout: config.requestTimeout,
      retry: config.retry,
      logLevel: this.getLogLevel(config.logLevel)
    });

    this.producer = null;
    this.isConnected = false;
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
      this.producer = this.kafka.producer({
        ...config.producer,
        allowAutoTopicCreation: config.producer.allowAutoTopicCreation,
        idempotent: config.producer.idempotent,
        maxInFlightRequests: config.producer.maxInFlightRequests
      });

      await this.producer.connect();
      this.isConnected = true;
      console.log(`✓ Kafka producer connected: ${this.clientId}`);
    } catch (error) {
      console.error('Failed to connect Kafka producer:', error);
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
      await this.producer.disconnect();
      this.isConnected = false;
      console.log('✓ Kafka producer disconnected');
    } catch (error) {
      console.error('Error disconnecting Kafka producer:', error);
      throw error;
    }
  }

  /**
   * Send a single event
   */
  async sendEvent(topic, event, options = {}) {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      const message = {
        key: options.key || event.id || event.eventId || Date.now().toString(),
        value: JSON.stringify(event),
        headers: {
          eventType: event.eventType || 'unknown',
          timestamp: new Date().toISOString(),
          ...options.headers
        }
      };

      // Add partition key if specified
      if (options.partition !== undefined) {
        message.partition = options.partition;
      }

      const result = await this.producer.send({
        topic,
        messages: [message],
        acks: config.producer.acks,
        timeout: config.producer.timeout,
        compression: config.producer.compression
      });

      console.log(`✓ Event sent to ${topic}:`, {
        eventType: event.eventType,
        key: message.key,
        partition: result[0].partition
      });

      return result;
    } catch (error) {
      console.error(`Failed to send event to ${topic}:`, error);

      // Send to DLQ if enabled
      if (config.dlq.enabled) {
        await this.sendToDLQ(topic, event, error);
      }

      throw error;
    }
  }

  /**
   * Send multiple events in batch
   */
  async sendBatch(topic, events, options = {}) {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      const messages = events.map((event, index) => ({
        key: options.key || event.id || event.eventId || `${Date.now()}-${index}`,
        value: JSON.stringify(event),
        headers: {
          eventType: event.eventType || 'unknown',
          timestamp: new Date().toISOString(),
          ...options.headers
        }
      }));

      const result = await this.producer.send({
        topic,
        messages,
        acks: config.producer.acks,
        timeout: config.producer.timeout,
        compression: config.producer.compression
      });

      console.log(`✓ Batch of ${events.length} events sent to ${topic}`);
      return result;
    } catch (error) {
      console.error(`Failed to send batch to ${topic}:`, error);
      throw error;
    }
  }

  /**
   * Send event with transaction support
   */
  async sendTransactional(transactions) {
    if (!this.isConnected) {
      await this.connect();
    }

    const transaction = await this.producer.transaction();

    try {
      for (const { topic, events } of transactions) {
        const messages = events.map((event, index) => ({
          key: event.id || event.eventId || `${Date.now()}-${index}`,
          value: JSON.stringify(event),
          headers: {
            eventType: event.eventType || 'unknown',
            timestamp: new Date().toISOString()
          }
        }));

        await transaction.send({
          topic,
          messages
        });
      }

      await transaction.commit();
      console.log('✓ Transactional events committed');
    } catch (error) {
      await transaction.abort();
      console.error('Transaction aborted:', error);
      throw error;
    }
  }

  /**
   * Send event to Dead Letter Queue
   */
  async sendToDLQ(originalTopic, event, error) {
    try {
      const dlqTopic = this.getDLQTopic(originalTopic);
      const dlqEvent = {
        originalTopic,
        originalEvent: event,
        error: {
          message: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString()
        },
        retryCount: (event.retryCount || 0) + 1
      };

      await this.producer.send({
        topic: dlqTopic,
        messages: [{
          key: event.id || Date.now().toString(),
          value: JSON.stringify(dlqEvent),
          headers: {
            originalTopic,
            errorType: error.name
          }
        }]
      });

      console.log(`Event sent to DLQ: ${dlqTopic}`);
    } catch (dlqError) {
      console.error('Failed to send to DLQ:', dlqError);
    }
  }

  /**
   * Get DLQ topic name for a given topic
   */
  getDLQTopic(topic) {
    if (topic.startsWith('survey.')) return config.topics.dlqSurvey;
    if (topic.startsWith('response.')) return config.topics.dlqResponse;
    if (topic.startsWith('notification.')) return config.topics.dlqNotification;
    if (topic.startsWith('audit.')) return config.topics.dlqAudit;
    return 'dlq.general';
  }
}

// Singleton instance
let producerInstance = null;

/**
 * Get or create producer instance
 */
function getProducer(options) {
  if (!producerInstance) {
    producerInstance = new KafkaProducer(options);
  }
  return producerInstance;
}

module.exports = {
  KafkaProducer,
  getProducer
};

const { Kafka } = require('kafkajs');

/**
 * Kafka configuration and setup
 */
class KafkaConfig {
  constructor() {
    this.kafka = null;
    this.consumer = null;
  }

  /**
   * Initialize Kafka client
   */
  initialize() {
    try {
      const brokers = process.env.KAFKA_BROKERS
        ? process.env.KAFKA_BROKERS.split(',')
        : ['localhost:9092'];

      this.kafka = new Kafka({
        clientId: process.env.KAFKA_CLIENT_ID || 'analytics-consumer',
        brokers: brokers,
        connectionTimeout: 10000,
        requestTimeout: 30000,
        retry: {
          initialRetryTime: 100,
          retries: 8
        }
      });

      console.log('Kafka client initialized');
      return this.kafka;
    } catch (error) {
      console.error('Failed to initialize Kafka:', error);
      throw error;
    }
  }

  /**
   * Create consumer
   */
  async createConsumer() {
    try {
      if (!this.kafka) {
        this.initialize();
      }

      this.consumer = this.kafka.consumer({
        groupId: process.env.KAFKA_GROUP_ID || 'analytics-consumer-group',
        sessionTimeout: 30000,
        heartbeatInterval: 3000,
        maxBytesPerPartition: 1048576,
        retry: {
          initialRetryTime: 100,
          retries: 8
        }
      });

      // Error handling
      this.consumer.on('consumer.crash', (event) => {
        console.error('Consumer crashed:', event.payload.error);
      });

      this.consumer.on('consumer.disconnect', () => {
        console.warn('Consumer disconnected');
      });

      await this.consumer.connect();
      console.log('Kafka consumer connected');

      return this.consumer;
    } catch (error) {
      console.error('Failed to create consumer:', error);
      throw error;
    }
  }

  /**
   * Subscribe to topics
   */
  async subscribe(topics) {
    try {
      if (!this.consumer) {
        await this.createConsumer();
      }

      const topicList = Array.isArray(topics) ? topics : [topics];

      for (const topic of topicList) {
        await this.consumer.subscribe({ topic, fromBeginning: false });
        console.log(`Subscribed to topic: ${topic}`);
      }
    } catch (error) {
      console.error('Failed to subscribe to topics:', error);
      throw error;
    }
  }

  /**
   * Start consuming messages
   */
  async consume(messageHandler) {
    try {
      if (!this.consumer) {
        await this.createConsumer();
      }

      await this.consumer.run({
        autoCommit: true,
        autoCommitInterval: 5000,
        eachMessage: async ({ topic, partition, message }) => {
          try {
            const value = message.value ? message.value.toString() : null;
            const key = message.key ? message.key.toString() : null;

            console.log(`Received message from ${topic}:${partition}`);

            await messageHandler({
              topic,
              partition,
              key,
              value,
              offset: message.offset,
              timestamp: message.timestamp
            });
          } catch (error) {
            console.error('Error processing message:', error);
            // Continue processing other messages
          }
        }
      });

      console.log('Consumer is running...');
    } catch (error) {
      console.error('Failed to start consumer:', error);
      throw error;
    }
  }

  /**
   * Disconnect consumer
   */
  async disconnect() {
    try {
      if (this.consumer) {
        await this.consumer.disconnect();
        this.consumer = null;
        console.log('Kafka consumer disconnected');
      }
    } catch (error) {
      console.error('Error disconnecting consumer:', error);
      throw error;
    }
  }

  /**
   * Get consumer instance
   */
  getConsumer() {
    return this.consumer;
  }
}

// Export singleton instance
module.exports = new KafkaConfig();

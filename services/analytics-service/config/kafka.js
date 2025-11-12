const { Kafka } = require('kafkajs');

/**
 * Kafka connection manager
 * Singleton pattern to ensure only one connection instance
 */
class KafkaClient {
  constructor() {
    this.kafka = null;
    this.producer = null;
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
        clientId: process.env.KAFKA_CLIENT_ID || 'analytics-service',
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
   * Get or create producer
   */
  async getProducer() {
    try {
      if (!this.kafka) {
        this.initialize();
      }

      if (!this.producer) {
        this.producer = this.kafka.producer({
          allowAutoTopicCreation: true,
          transactionTimeout: 30000
        });

        await this.producer.connect();
        console.log('Kafka producer connected');
      }

      return this.producer;
    } catch (error) {
      console.error('Failed to get producer:', error);
      throw error;
    }
  }

  /**
   * Send a message to a topic
   */
  async sendMessage(topic, message, key = null) {
    try {
      const producer = await this.getProducer();

      await producer.send({
        topic,
        messages: [
          {
            key: key,
            value: JSON.stringify(message),
            timestamp: Date.now().toString()
          }
        ]
      });

      return true;
    } catch (error) {
      console.error('Failed to send message:', error);
      return false;
    }
  }

  /**
   * Disconnect producer
   */
  async disconnect() {
    try {
      if (this.producer) {
        await this.producer.disconnect();
        this.producer = null;
        console.log('Kafka producer disconnected');
      }
      if (this.consumer) {
        await this.consumer.disconnect();
        this.consumer = null;
        console.log('Kafka consumer disconnected');
      }
    } catch (error) {
      console.error('Error disconnecting Kafka:', error);
    }
  }

  /**
   * Get Kafka instance
   */
  getInstance() {
    if (!this.kafka) {
      this.initialize();
    }
    return this.kafka;
  }
}

// Export singleton instance
module.exports = new KafkaClient();

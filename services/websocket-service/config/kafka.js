const { Kafka } = require('kafkajs');
const logger = require('./logger');

class KafkaConfig {
  constructor() {
    this.kafka = new Kafka({
      clientId: process.env.KAFKA_CLIENT_ID || 'websocket-service',
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
      retry: {
        initialRetryTime: 100,
        retries: 8
      },
      logLevel: 2 // ERROR level
    });

    this.consumer = null;
    this.producer = null;
  }

  /**
   * Get Kafka consumer instance
   */
  async getConsumer() {
    if (!this.consumer) {
      this.consumer = this.kafka.consumer({
        groupId: process.env.KAFKA_GROUP_ID || 'websocket-consumers',
        sessionTimeout: 30000,
        heartbeatInterval: 3000
      });
      await this.consumer.connect();
      logger.info('Kafka consumer connected');
    }
    return this.consumer;
  }

  /**
   * Get Kafka producer instance
   */
  async getProducer() {
    if (!this.producer) {
      this.producer = this.kafka.producer({
        allowAutoTopicCreation: true,
        transactionTimeout: 30000
      });
      await this.producer.connect();
      logger.info('Kafka producer connected');
    }
    return this.producer;
  }

  /**
   * Subscribe to topics
   */
  async subscribe(topics) {
    const consumer = await this.getConsumer();
    for (const topic of topics) {
      await consumer.subscribe({
        topic,
        fromBeginning: false
      });
      logger.info(`Subscribed to Kafka topic: ${topic}`);
    }
  }

  /**
   * Disconnect consumer and producer
   */
  async disconnect() {
    try {
      if (this.consumer) {
        await this.consumer.disconnect();
        logger.info('Kafka consumer disconnected');
      }
      if (this.producer) {
        await this.producer.disconnect();
        logger.info('Kafka producer disconnected');
      }
    } catch (error) {
      logger.error('Error disconnecting from Kafka:', error);
    }
  }
}

module.exports = new KafkaConfig();

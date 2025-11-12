const { Kafka, logLevel } = require('kafkajs');

/**
 * Kafka client manager for Project Service
 * Handles event publishing and consumption
 */
class KafkaClient {
  constructor() {
    this.kafka = null;
    this.producer = null;
    this.consumer = null;
    this.isConnected = false;
  }

  /**
   * Initialize Kafka client
   */
  initialize() {
    try {
      const brokers = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');

      this.kafka = new Kafka({
        clientId: process.env.KAFKA_CLIENT_ID || 'project-service',
        brokers,
        logLevel: logLevel.INFO,
        retry: {
          initialRetryTime: 300,
          retries: 8,
          maxRetryTime: 30000,
          multiplier: 2,
          factor: 0.2
        }
      });

      console.log('Kafka client initialized');
      return this.kafka;
    } catch (error) {
      console.error('Failed to initialize Kafka client:', error);
      throw error;
    }
  }

  /**
   * Connect Kafka producer
   */
  async connectProducer() {
    try {
      if (!this.kafka) {
        this.initialize();
      }

      this.producer = this.kafka.producer({
        allowAutoTopicCreation: true,
        transactionTimeout: 30000
      });

      console.log('Connecting Kafka producer...');
      await this.producer.connect();
      console.log('Kafka producer connected successfully');

      this.isConnected = true;
      return this.producer;
    } catch (error) {
      console.error('Failed to connect Kafka producer:', error);
      throw error;
    }
  }

  /**
   * Disconnect Kafka producer
   */
  async disconnectProducer() {
    try {
      if (this.producer) {
        await this.producer.disconnect();
        this.producer = null;
        console.log('Kafka producer disconnected');
      }
    } catch (error) {
      console.error('Error disconnecting Kafka producer:', error);
      throw error;
    }
  }

  /**
   * Publish an event to Kafka
   */
  async publish(topic, message, key = null) {
    try {
      if (!this.producer || !this.isConnected) {
        console.warn('Kafka producer not connected, skipping publish');
        return false;
      }

      const payload = {
        topic,
        messages: [{
          key: key || null,
          value: JSON.stringify(message),
          timestamp: Date.now().toString()
        }]
      };

      await this.producer.send(payload);
      console.log(`Event published to topic: ${topic}`);
      return true;
    } catch (error) {
      console.error('Error publishing to Kafka:', error);
      return false;
    }
  }

  /**
   * Publish multiple events to Kafka
   */
  async publishBatch(topic, messages) {
    try {
      if (!this.producer || !this.isConnected) {
        console.warn('Kafka producer not connected, skipping batch publish');
        return false;
      }

      const formattedMessages = messages.map(msg => ({
        key: msg.key || null,
        value: JSON.stringify(msg.value || msg),
        timestamp: Date.now().toString()
      }));

      await this.producer.send({
        topic,
        messages: formattedMessages
      });

      console.log(`Batch of ${messages.length} events published to topic: ${topic}`);
      return true;
    } catch (error) {
      console.error('Error publishing batch to Kafka:', error);
      return false;
    }
  }

  /**
   * Check if Kafka is connected
   */
  isProducerConnected() {
    return this.isConnected && this.producer !== null;
  }

  /**
   * Get Kafka instance
   */
  getKafka() {
    return this.kafka;
  }

  /**
   * Get producer instance
   */
  getProducer() {
    return this.producer;
  }
}

// Export singleton instance
module.exports = new KafkaClient();

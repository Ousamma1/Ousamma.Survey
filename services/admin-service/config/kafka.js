const { Kafka } = require('kafkajs');

class KafkaClient {
  constructor() {
    this.kafka = null;
    this.producer = null;
    this.isConnected = false;
  }

  initialize() {
    try {
      const brokers = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');

      this.kafka = new Kafka({
        clientId: process.env.KAFKA_CLIENT_ID || 'admin-service',
        brokers,
        retry: {
          retries: 8,
          maxRetryTime: 30000
        },
        connectionTimeout: 10000,
        requestTimeout: 30000
      });

      console.log('✅ Kafka client initialized');
      return this.kafka;
    } catch (error) {
      console.error('❌ Kafka initialization failed:', error);
      throw error;
    }
  }

  async connectProducer() {
    try {
      if (!this.kafka) {
        this.initialize();
      }

      this.producer = this.kafka.producer({
        allowAutoTopicCreation: false,
        transactionTimeout: 30000
      });

      await this.producer.connect();
      this.isConnected = true;
      console.log('✅ Kafka producer connected');

      return this.producer;
    } catch (error) {
      console.error('❌ Kafka producer connection failed:', error);
      this.isConnected = false;
      throw error;
    }
  }

  async disconnect() {
    try {
      if (this.producer) {
        await this.producer.disconnect();
        console.log('Kafka producer disconnected');
      }
      this.isConnected = false;
    } catch (error) {
      console.error('Error disconnecting Kafka:', error);
    }
  }

  async publish(topic, message, key = null) {
    try {
      if (!this.isConnected) {
        console.warn('⚠️  Kafka producer not connected, attempting to reconnect...');
        await this.connectProducer();
      }

      const kafkaMessage = {
        key: key ? String(key) : null,
        value: JSON.stringify(message),
        timestamp: Date.now().toString()
      };

      await this.producer.send({
        topic,
        messages: [kafkaMessage]
      });

      return true;
    } catch (error) {
      console.error(`❌ Error publishing to topic ${topic}:`, error);
      return false;
    }
  }

  async publishBatch(topic, messages) {
    try {
      if (!this.isConnected) {
        console.warn('⚠️  Kafka producer not connected, attempting to reconnect...');
        await this.connectProducer();
      }

      const kafkaMessages = messages.map(msg => ({
        key: msg.key ? String(msg.key) : null,
        value: JSON.stringify(msg.value),
        timestamp: Date.now().toString()
      }));

      await this.producer.send({
        topic,
        messages: kafkaMessages
      });

      return true;
    } catch (error) {
      console.error(`❌ Error publishing batch to topic ${topic}:`, error);
      return false;
    }
  }

  getStatus() {
    return {
      connected: this.isConnected,
      status: this.isConnected ? 'connected' : 'disconnected'
    };
  }
}

module.exports = new KafkaClient();

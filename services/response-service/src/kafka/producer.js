const { Kafka } = require('kafkajs');
const createLogger = require('../../../../shared/utils/logger');
const config = require('../../../../shared/config/config');

const logger = createLogger('kafka-producer');

let producer;

const initKafka = async () => {
  try {
    const kafka = new Kafka({
      clientId: process.env.KAFKA_CLIENT_ID || config.kafka.clientId,
      brokers: process.env.KAFKA_BROKERS?.split(',') || config.kafka.brokers,
      retry: {
        retries: 8,
        initialRetryTime: 300
      }
    });

    producer = kafka.producer();
    await producer.connect();
    logger.info('Kafka producer connected successfully');
  } catch (error) {
    logger.error('Kafka producer connection error:', error);
    // Don't exit process, just log error
  }
};

const publishEvent = async (topic, message) => {
  try {
    if (!producer) {
      logger.warn('Kafka producer not initialized, skipping event publish');
      return;
    }

    await producer.send({
      topic,
      messages: [
        {
          key: message.id || Date.now().toString(),
          value: JSON.stringify(message),
          timestamp: Date.now().toString()
        }
      ]
    });

    logger.info(`Event published to ${topic}:`, message.id || 'N/A');
  } catch (error) {
    logger.error(`Error publishing event to ${topic}:`, error);
  }
};

const disconnect = async () => {
  if (producer) {
    await producer.disconnect();
    logger.info('Kafka producer disconnected');
  }
};

module.exports = {
  initKafka,
  publishEvent,
  disconnect
};

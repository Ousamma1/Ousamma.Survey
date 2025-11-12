/**
 * Kafka Library - Main Export
 * Provides all Kafka utilities and configurations
 */

const config = require('./config');
const { KafkaProducer, getProducer } = require('./producer');
const { KafkaConsumer } = require('./consumer');
const schemas = require('./schemas');

module.exports = {
  // Configuration
  config,

  // Producer
  KafkaProducer,
  getProducer,

  // Consumer
  KafkaConsumer,

  // Schemas
  schemas,

  // Helper functions
  createProducer: (options) => new KafkaProducer(options),
  createConsumer: (options) => new KafkaConsumer(options)
};

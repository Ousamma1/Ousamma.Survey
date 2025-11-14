/**
 * Kafka Test Helper
 * Sprint 19: Testing & QA
 *
 * Mock Kafka producer/consumer for testing
 */

/**
 * Mock Kafka Producer
 */
class MockKafkaProducer {
  constructor() {
    this.messages = [];
    this.connected = false;
  }

  async connect() {
    this.connected = true;
  }

  async disconnect() {
    this.connected = false;
  }

  async send({ topic, messages }) {
    if (!this.connected) {
      throw new Error('Producer not connected');
    }

    const sentMessages = messages.map(msg => ({
      topic,
      ...msg,
      timestamp: Date.now()
    }));

    this.messages.push(...sentMessages);

    return sentMessages.map((_, index) => ({
      topicName: topic,
      partition: 0,
      errorCode: 0,
      offset: String(this.messages.length + index),
      timestamp: String(Date.now())
    }));
  }

  getMessages(topic = null) {
    if (topic) {
      return this.messages.filter(m => m.topic === topic);
    }
    return this.messages;
  }

  clearMessages() {
    this.messages = [];
  }

  isConnected() {
    return this.connected;
  }
}

/**
 * Mock Kafka Consumer
 */
class MockKafkaConsumer {
  constructor() {
    this.subscriptions = [];
    this.handlers = new Map();
    this.connected = false;
    this.running = false;
  }

  async connect() {
    this.connected = true;
  }

  async disconnect() {
    this.connected = false;
    this.running = false;
  }

  async subscribe({ topics, fromBeginning }) {
    if (!this.connected) {
      throw new Error('Consumer not connected');
    }

    this.subscriptions.push(...topics);
  }

  async run({ eachMessage }) {
    if (!this.connected) {
      throw new Error('Consumer not connected');
    }

    this.running = true;
    this.handlers.set('eachMessage', eachMessage);
  }

  async simulateMessage(topic, message) {
    if (!this.running) {
      throw new Error('Consumer not running');
    }

    const handler = this.handlers.get('eachMessage');
    if (handler) {
      await handler({
        topic,
        partition: 0,
        message: {
          key: message.key ? Buffer.from(message.key) : null,
          value: Buffer.from(JSON.stringify(message.value)),
          headers: message.headers || {},
          offset: String(Date.now()),
          timestamp: String(Date.now())
        }
      });
    }
  }

  isSubscribed(topic) {
    return this.subscriptions.includes(topic);
  }

  isRunning() {
    return this.running;
  }
}

/**
 * Mock Kafka Instance
 */
class MockKafka {
  constructor(config) {
    this.config = config;
    this.producers = new Map();
    this.consumers = new Map();
  }

  producer() {
    const producer = new MockKafkaProducer();
    this.producers.set(Date.now(), producer);
    return producer;
  }

  consumer({ groupId }) {
    const consumer = new MockKafkaConsumer();
    this.consumers.set(groupId, consumer);
    return consumer;
  }

  admin() {
    return {
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      createTopics: jest.fn().mockResolvedValue(true),
      deleteTopics: jest.fn().mockResolvedValue(undefined),
      listTopics: jest.fn().mockResolvedValue([])
    };
  }
}

/**
 * Create mock Kafka instance
 */
function createMockKafka(config = {}) {
  return new MockKafka({
    clientId: 'test-client',
    brokers: ['localhost:9092'],
    ...config
  });
}

/**
 * Mock Kafka event data
 */
function createMockKafkaMessage(topic, data) {
  return {
    topic,
    key: `key-${Date.now()}`,
    value: data,
    headers: {
      'correlation-id': `corr-${Date.now()}`
    }
  };
}

/**
 * Wait for Kafka message to be processed
 */
async function waitForKafkaMessage(producer, topic, timeout = 5000) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const messages = producer.getMessages(topic);
    if (messages.length > 0) {
      return messages[messages.length - 1];
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  throw new Error(`Timeout waiting for Kafka message on topic: ${topic}`);
}

module.exports = {
  MockKafka,
  MockKafkaProducer,
  MockKafkaConsumer,
  createMockKafka,
  createMockKafkaMessage,
  waitForKafkaMessage
};

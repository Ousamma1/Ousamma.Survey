/**
 * Global Test Setup
 * Sprint 19: Testing & QA
 *
 * This file runs before all tests to configure the test environment
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-for-testing-only';
process.env.ENCRYPTION_KEY = 'test-encryption-key-32-chars!!';

// MongoDB Test URI
process.env.MONGODB_URI = 'mongodb://localhost:27017/ousamma_test';

// Redis Test Config
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.REDIS_PASSWORD = '';

// Kafka Test Config
process.env.KAFKA_BROKERS = 'localhost:9092';
process.env.KAFKA_CLIENT_ID = 'test-client';

// Disable external services during tests
process.env.DISABLE_KAFKA = 'true';
process.env.DISABLE_REDIS = 'false';

// Test database configuration
process.env.TEST_DB_NAME = 'ousamma_test';

// Extend Jest timeout for integration tests
jest.setTimeout(30000);

// Global test utilities
global.testTimeout = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Clean up after all tests
afterAll(async () => {
  // Close any open handles
  await new Promise(resolve => setTimeout(resolve, 500));
});

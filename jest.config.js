/**
 * Root Jest Configuration for Ousamma Survey Platform
 * Sprint 19: Testing & QA
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Coverage collection
  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],

  // Coverage thresholds (80%+ target)
  coverageThresholds: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },

  // Files to collect coverage from
  collectCoverageFrom: [
    '**/*.js',
    '!**/node_modules/**',
    '!**/coverage/**',
    '!**/dist/**',
    '!**/*.config.js',
    '!**/*.test.js',
    '!**/*.spec.js',
    '!**/tests/**',
    '!**/test-client.js'
  ],

  // Test match patterns
  testMatch: [
    '**/__tests__/**/*.js',
    '**/*.test.js',
    '**/*.spec.js'
  ],

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

  // Module paths
  moduleDirectories: ['node_modules', '<rootDir>'],

  // Test timeout
  testTimeout: 30000,

  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // Verbose output
  verbose: true,

  // Detect open handles
  detectOpenHandles: true,
  forceExit: true,

  // Projects for multi-service testing
  projects: [
    {
      displayName: 'main-app',
      testMatch: ['<rootDir>/__tests__/**/*.test.js'],
      testEnvironment: 'node'
    },
    {
      displayName: 'survey-service',
      testMatch: ['<rootDir>/services/survey-service/**/*.test.js'],
      testEnvironment: 'node'
    },
    {
      displayName: 'project-service',
      testMatch: ['<rootDir>/services/project-service/**/*.test.js'],
      testEnvironment: 'node'
    },
    {
      displayName: 'analytics-service',
      testMatch: ['<rootDir>/services/analytics-service/**/*.test.js'],
      testEnvironment: 'node'
    },
    {
      displayName: 'notification-service',
      testMatch: ['<rootDir>/services/notification-service/**/*.test.js'],
      testEnvironment: 'node'
    },
    {
      displayName: 'geolocation-service',
      testMatch: ['<rootDir>/services/geolocation-service/**/*.test.js'],
      testEnvironment: 'node'
    },
    {
      displayName: 'admin-service',
      testMatch: ['<rootDir>/services/admin-service/**/*.test.js'],
      testEnvironment: 'node'
    },
    {
      displayName: 'websocket-service',
      testMatch: ['<rootDir>/services/websocket-service/**/*.test.js'],
      testEnvironment: 'node'
    },
    {
      displayName: 'consumer-services',
      testMatch: ['<rootDir>/services/*-consumer-service/**/*.test.js'],
      testEnvironment: 'node'
    },
    {
      displayName: 'surveyor-service',
      testMatch: ['<rootDir>/surveyor-service/**/*.test.js'],
      testEnvironment: 'node'
    }
  ]
};

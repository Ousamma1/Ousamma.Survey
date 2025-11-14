/**
 * Mock Data Generator
 * Sprint 19: Testing & QA
 *
 * Generate realistic test data for all entities
 */

const { v4: uuidv4 } = require('uuid');

/**
 * Generate mock user data
 */
function createMockUser(overrides = {}) {
  return {
    _id: uuidv4(),
    email: `test-${Date.now()}@example.com`,
    password: '$2a$10$testhashpassword',
    name: 'Test User',
    role: 'user',
    isVerified: true,
    twoFactorEnabled: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  };
}

/**
 * Generate mock survey data
 */
function createMockSurvey(overrides = {}) {
  return {
    _id: uuidv4(),
    surveyId: `survey-${uuidv4()}`,
    title: 'Test Survey',
    description: 'A test survey for testing purposes',
    createdBy: uuidv4(),
    status: 'active',
    questions: [
      {
        questionId: `q-${uuidv4()}`,
        type: 'text',
        question: 'What is your name?',
        required: true,
        order: 1
      },
      {
        questionId: `q-${uuidv4()}`,
        type: 'multiple_choice',
        question: 'What is your favorite color?',
        required: false,
        order: 2,
        options: ['Red', 'Blue', 'Green', 'Yellow']
      }
    ],
    settings: {
      allowAnonymous: true,
      oneResponsePerUser: false,
      showResults: false,
      collectLocation: false
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  };
}

/**
 * Generate mock survey response
 */
function createMockResponse(surveyId, overrides = {}) {
  return {
    _id: uuidv4(),
    responseId: `resp-${uuidv4()}`,
    surveyId: surveyId || `survey-${uuidv4()}`,
    respondentId: uuidv4(),
    answers: [
      {
        questionId: `q-${uuidv4()}`,
        answer: 'John Doe'
      },
      {
        questionId: `q-${uuidv4()}`,
        answer: 'Blue'
      }
    ],
    status: 'completed',
    submittedAt: new Date(),
    ipAddress: '127.0.0.1',
    userAgent: 'Test Agent',
    completionTime: 120,
    ...overrides
  };
}

/**
 * Generate mock project data
 */
function createMockProject(overrides = {}) {
  return {
    _id: uuidv4(),
    name: 'Test Project',
    description: 'A test project for testing purposes',
    ownerId: uuidv4(),
    status: 'active',
    members: [],
    settings: {
      visibility: 'private',
      allowMemberInvites: true
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  };
}

/**
 * Generate mock notification data
 */
function createMockNotification(overrides = {}) {
  return {
    _id: uuidv4(),
    userId: uuidv4(),
    type: 'email',
    channel: 'email',
    subject: 'Test Notification',
    message: 'This is a test notification',
    status: 'pending',
    priority: 'normal',
    metadata: {},
    createdAt: new Date(),
    ...overrides
  };
}

/**
 * Generate mock location data
 */
function createMockLocation(overrides = {}) {
  return {
    _id: uuidv4(),
    latitude: 40.7128,
    longitude: -74.0060,
    accuracy: 10,
    altitude: 0,
    altitudeAccuracy: 0,
    heading: 0,
    speed: 0,
    address: {
      street: '123 Test St',
      city: 'Test City',
      state: 'TS',
      country: 'Test Country',
      postalCode: '12345'
    },
    metadata: {},
    createdAt: new Date(),
    ...overrides
  };
}

/**
 * Generate mock analytics data
 */
function createMockAnalytics(surveyId, overrides = {}) {
  return {
    _id: uuidv4(),
    surveyId: surveyId || `survey-${uuidv4()}`,
    totalResponses: 100,
    completedResponses: 95,
    partialResponses: 5,
    averageCompletionTime: 180,
    responseRate: 0.95,
    lastUpdated: new Date(),
    ...overrides
  };
}

/**
 * Generate mock API key
 */
function createMockApiKey(overrides = {}) {
  return {
    _id: uuidv4(),
    key: `ak_test_${uuidv4()}`,
    userId: uuidv4(),
    name: 'Test API Key',
    scopes: ['read', 'write'],
    status: 'active',
    lastUsed: null,
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
    createdAt: new Date(),
    ...overrides
  };
}

/**
 * Generate mock JWT token
 */
function createMockToken(payload = {}) {
  const jwt = require('jsonwebtoken');
  const secret = process.env.JWT_SECRET || 'test-secret';

  return jwt.sign({
    userId: uuidv4(),
    email: 'test@example.com',
    role: 'user',
    ...payload
  }, secret, { expiresIn: '1h' });
}

/**
 * Generate multiple mock items
 */
function createMany(generator, count, overrides = {}) {
  return Array.from({ length: count }, () => generator(overrides));
}

module.exports = {
  createMockUser,
  createMockSurvey,
  createMockResponse,
  createMockProject,
  createMockNotification,
  createMockLocation,
  createMockAnalytics,
  createMockApiKey,
  createMockToken,
  createMany
};

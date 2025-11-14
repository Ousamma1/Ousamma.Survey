# Testing Documentation - Sprint 19
## Comprehensive Testing & Quality Assurance

This document outlines the complete testing strategy for the Ousamma Survey Platform.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Test Infrastructure](#test-infrastructure)
3. [Running Tests](#running-tests)
4. [Test Coverage](#test-coverage)
5. [Test Types](#test-types)
6. [CI/CD Integration](#cicd-integration)
7. [Best Practices](#best-practices)

---

## 🎯 Overview

Sprint 19 implements comprehensive testing across all layers:

- **Unit Tests**: 80%+ code coverage target
- **Integration Tests**: API endpoint validation
- **E2E Tests**: Complete user workflows
- **Performance Tests**: 1000+ concurrent users
- **Security Tests**: OWASP Top 10 compliance

### Test Metrics Goals

| Metric | Target | Current |
|--------|--------|---------|
| Code Coverage | 80%+ | TBD |
| Unit Tests | 500+ | 100+ |
| Integration Tests | 50+ | 20+ |
| E2E Tests | 30+ | 15+ |
| Performance (Users) | 1000+ | 1000 |
| Security Score | A | TBD |

---

## 🏗️ Test Infrastructure

### Technologies

- **Jest**: Unit & integration testing
- **Supertest**: HTTP API testing
- **Playwright**: E2E browser testing
- **k6**: Performance & load testing
- **MongoDB Memory Server**: In-memory database for tests
- **Custom Helpers**: Mock data, DB helpers, API helpers

### Directory Structure

```
Ousamma.Survey/
├── __tests__/
│   ├── integration/           # API integration tests
│   │   └── survey-api.test.js
│   └── unit/                  # Additional unit tests
├── tests/
│   ├── setup.js              # Global test setup
│   ├── helpers/              # Test utilities
│   │   ├── db-helper.js      # Database helpers
│   │   ├── api-helper.js     # API test helpers
│   │   ├── mock-data.js      # Mock data generators
│   │   ├── kafka-helper.js   # Kafka mocks
│   │   └── redis-helper.js   # Redis mocks
│   ├── e2e/                  # End-to-end tests
│   │   ├── playwright.config.js
│   │   └── specs/
│   │       └── survey-flows.spec.js
│   ├── performance/          # Load tests
│   │   └── load-test.js
│   └── security/             # Security tests
│       └── owasp-checks.js
├── services/*/
│   └── __tests__/
│       ├── unit/
│       │   ├── models/       # Model tests
│       │   └── controllers/  # Controller tests
│       └── integration/      # Service integration tests
└── jest.config.js            # Jest configuration
```

---

## 🚀 Running Tests

### Quick Start

```bash
# Install dependencies
npm install

# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run unit tests only
npm run test:unit

# Run integration tests
npm run test:integration

# Run E2E tests
npm run test:e2e

# Run performance tests
npm run test:performance

# Run security tests
npm run test:security

# Watch mode for development
npm run test:watch
```

### Running Specific Tests

```bash
# Run specific test file
npm test -- survey.test.js

# Run tests matching pattern
npm test -- --testNamePattern="Survey Model"

# Run tests for specific service
npm test services/survey-service

# Run with verbose output
npm test -- --verbose
```

### Environment Variables

```bash
# Test environment
NODE_ENV=test

# Database
MONGODB_URI=mongodb://localhost:27017/ousamma_test
REDIS_HOST=localhost
REDIS_PORT=6379
KAFKA_BROKERS=localhost:9092

# Disable services in tests
DISABLE_KAFKA=true
DISABLE_REDIS=false

# Test configuration
JWT_SECRET=test-jwt-secret
ENCRYPTION_KEY=test-encryption-key-32-chars!!
```

---

## 📊 Test Coverage

### Generating Coverage Reports

```bash
# Generate coverage report
npm run test:coverage

# Open HTML coverage report
open coverage/lcov-report/index.html
```

### Coverage Thresholds

Configured in `jest.config.js`:

```javascript
coverageThresholds: {
  global: {
    branches: 80,
    functions: 80,
    lines: 80,
    statements: 80
  }
}
```

### Coverage by Service

| Service | Lines | Functions | Branches | Status |
|---------|-------|-----------|----------|--------|
| Survey Service | TBD | TBD | TBD | 🟡 |
| Project Service | TBD | TBD | TBD | 🟡 |
| Analytics Service | TBD | TBD | TBD | 🟡 |
| Notification Service | TBD | TBD | TBD | 🟡 |
| Geolocation Service | TBD | TBD | TBD | 🟡 |
| Admin Service | TBD | TBD | TBD | 🟡 |

---

## 🧪 Test Types

### 1. Unit Tests

**Purpose**: Test individual functions and methods in isolation

**Location**: `services/*//__tests__/unit/`

**Example**:

```javascript
describe('Survey Model', () => {
  it('should validate access code', () => {
    const survey = new Survey({
      surveyId: 'test',
      settings: {
        requireAccessCode: true,
        accessCodes: ['CODE123']
      }
    });

    expect(survey.validateAccessCode('CODE123')).toBe(true);
    expect(survey.validateAccessCode('WRONG')).toBe(false);
  });
});
```

**Run**: `npm run test:unit`

---

### 2. Integration Tests

**Purpose**: Test API endpoints with database integration

**Location**: `__tests__/integration/`

**Example**:

```javascript
describe('POST /api/surveys', () => {
  it('should create a new survey', async () => {
    const response = await request(app)
      .post('/api/surveys')
      .send(surveyData)
      .expect(201);

    expect(response.body.data.surveyId).toBeDefined();
  });
});
```

**Run**: `npm run test:integration`

---

### 3. End-to-End Tests

**Purpose**: Test complete user workflows in real browsers

**Location**: `tests/e2e/specs/`

**Example**:

```javascript
test('should create and submit survey', async ({ page }) => {
  await page.goto('/dashboard');
  await page.click('text=Create Survey');
  await page.fill('[name="title"]', 'Test Survey');
  await page.click('button:has-text("Save")');

  await expect(page.locator('text=Survey created')).toBeVisible();
});
```

**Run**: `npm run test:e2e`

**Browsers Tested**:
- Chrome/Chromium
- Firefox
- Safari/WebKit
- Mobile Chrome
- Mobile Safari

---

### 4. Performance Tests

**Purpose**: Test system under load (1000+ concurrent users)

**Location**: `tests/performance/`

**Load Profile**:

```javascript
stages: [
  { duration: '2m', target: 100 },    // Ramp to 100 users
  { duration: '5m', target: 500 },    // Ramp to 500 users
  { duration: '5m', target: 1000 },   // Ramp to 1000 users
  { duration: '2m', target: 0 }       // Ramp down
]
```

**Thresholds**:
- 95% of requests < 500ms
- 99% of requests < 1000ms
- Error rate < 1%

**Run**: `npm run test:performance`

---

### 5. Security Tests

**Purpose**: Validate OWASP Top 10 compliance

**Location**: `tests/security/`

**Tests**:
- ✅ A01: Broken Access Control
- ✅ A02: Cryptographic Failures
- ✅ A03: Injection
- ✅ A04: Insecure Design
- ✅ A05: Security Misconfiguration
- ✅ A06: Vulnerable Components
- ✅ A07: Authentication Failures
- ✅ A08: Software Integrity Failures
- ✅ A09: Security Logging & Monitoring
- ✅ A10: Server-Side Request Forgery

**Run**: `npm run test:security`

---

## 🔄 CI/CD Integration

### GitHub Actions Workflow

Tests run automatically on:
- Every push to `main` branch
- Every pull request
- Nightly scheduled runs

**Workflow includes**:
1. Unit tests with coverage
2. Integration tests
3. E2E tests
4. Security scans
5. Dependency audits
6. Performance benchmarks

### Required Checks

Pull requests must pass:
- ✅ All unit tests
- ✅ Code coverage ≥ 80%
- ✅ No critical security vulnerabilities
- ✅ Linting and formatting
- ✅ Build succeeds

---

## 📝 Best Practices

### Writing Tests

1. **AAA Pattern**: Arrange, Act, Assert
2. **Descriptive Names**: Use clear, specific test names
3. **One Assertion**: Test one thing at a time (when possible)
4. **Independent Tests**: No dependencies between tests
5. **Clean Up**: Always clean up test data

### Test Organization

```javascript
describe('Feature/Component', () => {
  beforeAll(() => {
    // One-time setup
  });

  afterAll(() => {
    // One-time cleanup
  });

  beforeEach(() => {
    // Setup before each test
  });

  afterEach(() => {
    // Cleanup after each test
  });

  describe('Specific Function', () => {
    it('should do something specific', () => {
      // Test implementation
    });
  });
});
```

### Mock Data

Use helpers for consistent test data:

```javascript
const { createMockSurvey, createMockResponse } = require('./helpers/mock-data');

const survey = createMockSurvey({
  title: { en: 'Custom Title' }
});
```

### Database Helpers

```javascript
const dbHelper = require('./helpers/db-helper');

beforeAll(async () => {
  await dbHelper.connect();
});

afterEach(async () => {
  await dbHelper.clearDatabase();
});

afterAll(async () => {
  await dbHelper.disconnect();
});
```

### API Testing

```javascript
const {
  generateTestToken,
  expectValidResponse
} = require('./helpers/api-helper');

const token = generateTestToken({ role: 'admin' });

const response = await request(app)
  .get('/api/surveys')
  .set('Authorization', `Bearer ${token}`)
  .expect(200);

expectValidResponse(response);
```

---

## 🐛 Debugging Tests

### Running Single Test

```bash
npm test -- --testNamePattern="specific test name"
```

### Verbose Output

```bash
npm test -- --verbose
```

### Debug Mode

```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

Then open `chrome://inspect` in Chrome.

### Test Logs

```bash
# Show console logs
npm test -- --silent=false
```

---

## 📈 Performance Benchmarks

### Expected Performance

| Operation | Target | Current |
|-----------|--------|---------|
| Survey Creation | < 200ms | TBD |
| Survey Retrieval | < 100ms | TBD |
| Response Submission | < 300ms | TBD |
| Analytics Query | < 500ms | TBD |
| List Surveys (paginated) | < 200ms | TBD |

### Load Test Results

Run `npm run test:performance` and check results:

```
HTTP Requests: 10,000+
Response Time (avg): <500ms
Response Time (p95): <500ms
Response Time (p99): <1000ms
Failed Requests: <1%
```

---

## 🔒 Security Scan Results

Run `npm run test:security` for OWASP compliance:

```
✅ Passed: 15+
❌ Failed: 0
⚠️  Warnings: 2
```

---

## 📚 Additional Resources

- [Jest Documentation](https://jestjs.io/)
- [Playwright Documentation](https://playwright.dev/)
- [k6 Documentation](https://k6.io/docs/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)

---

## 🤝 Contributing

When adding new features:

1. Write tests FIRST (TDD approach)
2. Ensure coverage ≥ 80%
3. Add integration tests for APIs
4. Update this documentation
5. Run full test suite before PR

---

## 📞 Support

For testing issues or questions:
- Check existing test examples
- Review this documentation
- Ask in team chat
- Create an issue in GitHub

---

**Last Updated**: Sprint 19
**Status**: ✅ Comprehensive Test Suite Implemented

/**
 * API Test Helper
 * Sprint 19: Testing & QA
 *
 * Utilities for testing API endpoints with supertest
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');

/**
 * Create authenticated request with JWT token
 */
function createAuthRequest(app, token) {
  return {
    get: (url) => request(app).get(url).set('Authorization', `Bearer ${token}`),
    post: (url) => request(app).post(url).set('Authorization', `Bearer ${token}`),
    put: (url) => request(app).put(url).set('Authorization', `Bearer ${token}`),
    patch: (url) => request(app).patch(url).set('Authorization', `Bearer ${token}`),
    delete: (url) => request(app).delete(url).set('Authorization', `Bearer ${token}`)
  };
}

/**
 * Generate test JWT token
 */
function generateTestToken(payload = {}) {
  const secret = process.env.JWT_SECRET || 'test-jwt-secret';

  return jwt.sign({
    userId: 'test-user-id',
    email: 'test@example.com',
    role: 'user',
    ...payload
  }, secret, { expiresIn: '1h' });
}

/**
 * Generate admin token
 */
function generateAdminToken(payload = {}) {
  return generateTestToken({
    role: 'admin',
    ...payload
  });
}

/**
 * Generate expired token
 */
function generateExpiredToken(payload = {}) {
  const secret = process.env.JWT_SECRET || 'test-jwt-secret';

  return jwt.sign({
    userId: 'test-user-id',
    email: 'test@example.com',
    role: 'user',
    ...payload
  }, secret, { expiresIn: '-1h' }); // Already expired
}

/**
 * Test API response structure
 */
function expectValidResponse(response, expectedStatus = 200) {
  expect(response.status).toBe(expectedStatus);
  expect(response.headers['content-type']).toMatch(/json/);
  return response.body;
}

/**
 * Test error response structure
 */
function expectErrorResponse(response, expectedStatus = 400) {
  expect(response.status).toBe(expectedStatus);
  expect(response.body).toHaveProperty('error');
  return response.body;
}

/**
 * Test pagination response
 */
function expectPaginatedResponse(response, expectedStatus = 200) {
  const body = expectValidResponse(response, expectedStatus);
  expect(body).toHaveProperty('data');
  expect(body).toHaveProperty('pagination');
  expect(body.pagination).toHaveProperty('page');
  expect(body.pagination).toHaveProperty('limit');
  expect(body.pagination).toHaveProperty('total');
  expect(Array.isArray(body.data)).toBe(true);
  return body;
}

/**
 * Test rate limiting
 */
async function testRateLimit(app, endpoint, limit = 5) {
  const requests = [];

  for (let i = 0; i < limit + 1; i++) {
    requests.push(request(app).get(endpoint));
  }

  const responses = await Promise.all(requests);
  const rateLimited = responses.find(r => r.status === 429);

  expect(rateLimited).toBeDefined();
  expect(rateLimited.body).toHaveProperty('error');
}

/**
 * Test CORS headers
 */
function expectCorsHeaders(response) {
  expect(response.headers).toHaveProperty('access-control-allow-origin');
}

/**
 * Test security headers (from Helmet)
 */
function expectSecurityHeaders(response) {
  expect(response.headers).toHaveProperty('x-content-type-options', 'nosniff');
  expect(response.headers).toHaveProperty('x-frame-options');
  expect(response.headers).toHaveProperty('x-xss-protection');
}

/**
 * Create multipart/form-data request (for file uploads)
 */
function createUploadRequest(app, url, token) {
  const req = request(app).post(url);

  if (token) {
    req.set('Authorization', `Bearer ${token}`);
  }

  return req;
}

/**
 * Mock Express request object
 */
function mockRequest(options = {}) {
  return {
    body: {},
    params: {},
    query: {},
    headers: {},
    user: null,
    ...options
  };
}

/**
 * Mock Express response object
 */
function mockResponse() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.sendStatus = jest.fn().mockReturnValue(res);
  res.set = jest.fn().mockReturnValue(res);
  return res;
}

/**
 * Mock Express next function
 */
function mockNext() {
  return jest.fn();
}

module.exports = {
  createAuthRequest,
  generateTestToken,
  generateAdminToken,
  generateExpiredToken,
  expectValidResponse,
  expectErrorResponse,
  expectPaginatedResponse,
  testRateLimit,
  expectCorsHeaders,
  expectSecurityHeaders,
  createUploadRequest,
  mockRequest,
  mockResponse,
  mockNext
};

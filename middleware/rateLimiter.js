/**
 * Rate Limiting Middleware
 * Implements comprehensive rate limiting for different endpoint types
 */

const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const redis = require('redis');
const securityConfig = require('../config/security.config');

// Redis client for distributed rate limiting
let redisClient;

// Initialize Redis client if available
const initRedisStore = () => {
  try {
    redisClient = redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      legacyMode: false
    });

    redisClient.on('error', (err) => {
      console.error('Redis rate limiter error:', err);
    });

    redisClient.connect().catch(console.error);

    return redisClient;
  } catch (error) {
    console.warn('Redis not available for rate limiting, using memory store:', error.message);
    return null;
  }
};

// Create rate limiter with Redis or memory store
const createRateLimiter = (config) => {
  const limiterConfig = {
    windowMs: config.windowMs,
    max: config.max,
    message: {
      status: 429,
      message: config.message || 'Too many requests, please try again later.',
      retryAfter: Math.ceil(config.windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: config.skipSuccessfulRequests || false,
    skipFailedRequests: config.skipFailedRequests || false,
    handler: (req, res) => {
      res.status(429).json({
        status: 'error',
        message: config.message || 'Too many requests, please try again later.',
        retryAfter: Math.ceil(config.windowMs / 1000)
      });
    }
  };

  // Use Redis store if available for distributed rate limiting
  if (redisClient) {
    limiterConfig.store = new RedisStore({
      client: redisClient,
      prefix: 'rl:',
    });
  }

  return rateLimit(limiterConfig);
};

// Initialize Redis
const redisStoreClient = initRedisStore();

// Export rate limiters for different scenarios
module.exports = {
  // Global rate limiter
  globalLimiter: createRateLimiter(securityConfig.rateLimit.global),

  // Authentication rate limiter
  authLimiter: createRateLimiter(securityConfig.rateLimit.auth),

  // Login rate limiter (more restrictive)
  loginLimiter: createRateLimiter(securityConfig.rateLimit.login),

  // Registration rate limiter
  registerLimiter: createRateLimiter(securityConfig.rateLimit.register),

  // Password reset rate limiter
  passwordResetLimiter: createRateLimiter(securityConfig.rateLimit.passwordReset),

  // File upload rate limiter
  uploadLimiter: createRateLimiter(securityConfig.rateLimit.upload),

  // API rate limiter
  apiLimiter: createRateLimiter(securityConfig.rateLimit.api),

  // Search rate limiter
  searchLimiter: createRateLimiter(securityConfig.rateLimit.search),

  // Custom rate limiter factory
  createCustomLimiter: (windowMs, max, message) => {
    return createRateLimiter({
      windowMs,
      max,
      message: message || 'Too many requests, please try again later.'
    });
  },

  // Redis client for custom implementations
  redisClient: redisStoreClient
};

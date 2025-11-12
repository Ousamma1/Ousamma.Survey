const { RateLimiterMemory } = require('rate-limiter-flexible');
const logger = require('../config/logger');

// Rate limiter for messages per socket
const messageRateLimiter = new RateLimiterMemory({
  points: parseInt(process.env.RATE_LIMIT_MAX_MESSAGES) || 100,
  duration: parseInt(process.env.RATE_LIMIT_WINDOW) / 1000 || 60, // Convert ms to seconds
  blockDuration: 60 // Block for 60 seconds if limit exceeded
});

// Rate limiter for connections per IP
const connectionRateLimiter = new RateLimiterMemory({
  points: parseInt(process.env.MAX_CONNECTIONS_PER_IP) || 10,
  duration: 60, // Per 60 seconds
  blockDuration: 300 // Block for 5 minutes if limit exceeded
});

/**
 * Rate limit middleware for Socket.io connections
 */
const connectionRateLimit = async (socket, next) => {
  try {
    const ip = socket.handshake.address;

    await connectionRateLimiter.consume(ip);
    next();
  } catch (error) {
    logger.warn(`Connection rate limit exceeded for IP: ${socket.handshake.address}`);
    next(new Error('TOO_MANY_CONNECTIONS'));
  }
};

/**
 * Rate limit middleware for messages
 */
const messageRateLimit = async (socket, eventName) => {
  try {
    const key = `${socket.id}_${eventName}`;
    await messageRateLimiter.consume(key);
    return true;
  } catch (error) {
    logger.warn(`Message rate limit exceeded for socket: ${socket.id}, event: ${eventName}`);

    // Emit rate limit warning to client
    socket.emit('rate_limit_exceeded', {
      message: 'Too many messages. Please slow down.',
      retryAfter: error.msBeforeNext || 60000
    });

    return false;
  }
};

/**
 * Get rate limit status for a socket
 */
const getRateLimitStatus = async (socketId, eventName) => {
  try {
    const key = `${socketId}_${eventName}`;
    const status = await messageRateLimiter.get(key);

    if (!status) {
      return {
        consumed: 0,
        remaining: parseInt(process.env.RATE_LIMIT_MAX_MESSAGES) || 100
      };
    }

    return {
      consumed: status.consumedPoints,
      remaining: status.remainingPoints,
      resetTime: new Date(Date.now() + status.msBeforeNext)
    };
  } catch (error) {
    logger.error('Error getting rate limit status:', error);
    return null;
  }
};

module.exports = {
  connectionRateLimit,
  messageRateLimit,
  getRateLimitStatus
};

const jwt = require('jsonwebtoken');
const logger = require('../config/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * JWT Authentication Middleware for Socket.io
 * Validates JWT tokens from client connections
 */
const socketAuth = (socket, next) => {
  try {
    // Extract token from handshake auth or query
    const token = socket.handshake.auth.token || socket.handshake.query.token;

    if (!token) {
      // Allow anonymous connections but mark them
      socket.user = {
        id: `anonymous_${socket.id}`,
        isAnonymous: true,
        connectedAt: new Date()
      };
      logger.info(`Anonymous connection: ${socket.id}`);
      return next();
    }

    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Attach user info to socket
    socket.user = {
      id: decoded.userId || decoded.id || decoded.sub,
      email: decoded.email,
      role: decoded.role || 'user',
      isAnonymous: false,
      connectedAt: new Date(),
      token: decoded
    };

    logger.info(`Authenticated connection: ${socket.user.id} (${socket.user.email || 'no-email'})`);
    next();

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      logger.warn(`Expired token for socket ${socket.id}`);
      return next(new Error('TOKEN_EXPIRED'));
    } else if (error.name === 'JsonWebTokenError') {
      logger.warn(`Invalid token for socket ${socket.id}`);
      return next(new Error('INVALID_TOKEN'));
    } else {
      logger.error('Authentication error:', error);
      return next(new Error('AUTH_ERROR'));
    }
  }
};

/**
 * Generate a JWT token for testing/demo purposes
 */
const generateToken = (userId, email, role = 'user', expiresIn = '24h') => {
  return jwt.sign(
    {
      userId,
      email,
      role,
      iat: Math.floor(Date.now() / 1000)
    },
    JWT_SECRET,
    { expiresIn }
  );
};

/**
 * Verify a JWT token
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

/**
 * Check if user has required role
 */
const checkRole = (socket, requiredRole) => {
  if (socket.user.isAnonymous) {
    return false;
  }

  const roleHierarchy = {
    'admin': 3,
    'manager': 2,
    'user': 1,
    'guest': 0
  };

  const userRoleLevel = roleHierarchy[socket.user.role] || 0;
  const requiredRoleLevel = roleHierarchy[requiredRole] || 0;

  return userRoleLevel >= requiredRoleLevel;
};

module.exports = {
  socketAuth,
  generateToken,
  verifyToken,
  checkRole
};

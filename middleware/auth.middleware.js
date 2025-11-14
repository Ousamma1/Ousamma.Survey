/**
 * Authentication Middleware
 * Enhanced authentication with JWT access/refresh tokens and security features
 */

const jwt = require('jsonwebtoken');
const securityConfig = require('../config/security.config');
const encryptionUtil = require('../utils/encryption.util');

/**
 * Generate JWT access token
 * @param {Object} payload - Token payload (user data)
 * @returns {string} - JWT token
 */
const generateAccessToken = (payload) => {
  return jwt.sign(
    payload,
    securityConfig.jwt.accessTokenSecret,
    {
      expiresIn: securityConfig.jwt.accessTokenExpiry,
      algorithm: securityConfig.jwt.algorithm,
      issuer: securityConfig.jwt.issuer,
      audience: securityConfig.jwt.audience
    }
  );
};

/**
 * Generate JWT refresh token
 * @param {Object} payload - Token payload (user data)
 * @returns {string} - JWT refresh token
 */
const generateRefreshToken = (payload) => {
  return jwt.sign(
    payload,
    securityConfig.jwt.refreshTokenSecret,
    {
      expiresIn: securityConfig.jwt.refreshTokenExpiry,
      algorithm: securityConfig.jwt.algorithm,
      issuer: securityConfig.jwt.issuer,
      audience: securityConfig.jwt.audience
    }
  );
};

/**
 * Generate token pair (access + refresh)
 * @param {Object} user - User object
 * @returns {Object} - Object containing access and refresh tokens
 */
const generateTokenPair = (user) => {
  const payload = {
    id: user._id || user.id,
    email: user.email,
    role: user.role,
    permissions: user.permissions || []
  };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  return {
    accessToken,
    refreshToken,
    expiresIn: securityConfig.jwt.accessTokenExpiry
  };
};

/**
 * Verify JWT token
 * @param {string} token - JWT token to verify
 * @param {boolean} isRefreshToken - Whether this is a refresh token
 * @returns {Object} - Decoded token payload
 */
const verifyToken = (token, isRefreshToken = false) => {
  try {
    const secret = isRefreshToken
      ? securityConfig.jwt.refreshTokenSecret
      : securityConfig.jwt.accessTokenSecret;

    return jwt.verify(token, secret, {
      algorithms: [securityConfig.jwt.algorithm],
      issuer: securityConfig.jwt.issuer,
      audience: securityConfig.jwt.audience
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token expired');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    }
    throw error;
  }
};

/**
 * Extract token from request
 * @param {Object} req - Express request object
 * @returns {string|null} - Extracted token or null
 */
const extractToken = (req) => {
  // Check Authorization header (Bearer token)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Check cookie
  if (req.cookies && req.cookies.accessToken) {
    return req.cookies.accessToken;
  }

  // Check query parameter (not recommended for production)
  if (req.query && req.query.token) {
    return req.query.token;
  }

  return null;
};

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 */
const authenticate = async (req, res, next) => {
  try {
    const token = extractToken(req);

    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
    }

    // Verify token
    const decoded = verifyToken(token);

    // Check if token is in blacklist (if you implement token blacklisting)
    // const isBlacklisted = await checkTokenBlacklist(token);
    // if (isBlacklisted) {
    //   return res.status(401).json({
    //     status: 'error',
    //     message: 'Token revoked'
    //   });
    // }

    // Attach user info to request
    req.user = decoded;
    req.token = token;

    next();
  } catch (error) {
    console.error('Authentication error:', error);

    if (error.message === 'Token expired') {
      return res.status(401).json({
        status: 'error',
        message: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }

    return res.status(401).json({
      status: 'error',
      message: 'Invalid authentication'
    });
  }
};

/**
 * Optional authentication middleware
 * Attaches user if token is valid, but doesn't fail if not
 */
const optionalAuth = async (req, res, next) => {
  try {
    const token = extractToken(req);

    if (token) {
      const decoded = verifyToken(token);
      req.user = decoded;
      req.token = token;
    }

    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

/**
 * Role-based authorization middleware
 * @param {Array<string>} allowedRoles - Array of allowed roles
 * @returns {Function} - Express middleware
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied: Insufficient permissions'
      });
    }

    next();
  };
};

/**
 * Permission-based authorization middleware
 * @param {Array<string>} requiredPermissions - Array of required permissions
 * @returns {Function} - Express middleware
 */
const requirePermissions = (...requiredPermissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
    }

    const userPermissions = req.user.permissions || [];
    const hasAllPermissions = requiredPermissions.every(permission =>
      userPermissions.includes(permission)
    );

    if (!hasAllPermissions) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied: Required permissions missing'
      });
    }

    next();
  };
};

/**
 * Refresh token middleware
 * Generates new access token from refresh token
 */
const refreshAccessToken = async (req, res) => {
  try {
    const refreshToken = req.body.refreshToken || req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        status: 'error',
        message: 'Refresh token required'
      });
    }

    // Verify refresh token
    const decoded = verifyToken(refreshToken, true);

    // Check if refresh token is in blacklist
    // const isBlacklisted = await checkTokenBlacklist(refreshToken);
    // if (isBlacklisted) {
    //   return res.status(401).json({
    //     status: 'error',
    //     message: 'Refresh token revoked'
    //   });
    // }

    // Generate new access token
    const newAccessToken = generateAccessToken({
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      permissions: decoded.permissions
    });

    res.json({
      status: 'success',
      data: {
        accessToken: newAccessToken,
        expiresIn: securityConfig.jwt.accessTokenExpiry
      }
    });
  } catch (error) {
    console.error('Token refresh error:', error);

    return res.status(401).json({
      status: 'error',
      message: 'Invalid or expired refresh token'
    });
  }
};

/**
 * API Key authentication middleware
 */
const authenticateApiKey = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
      return res.status(401).json({
        status: 'error',
        message: 'API key required'
      });
    }

    // Validate API key format
    if (!apiKey.startsWith(securityConfig.apiKey.prefix)) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid API key format'
      });
    }

    // Hash the API key
    const apiKeyHash = encryptionUtil.hashApiKey(apiKey);

    // Here you would validate against stored API keys in database
    // This is a placeholder - implement actual validation
    // const storedKey = await ApiKey.findOne({ hash: apiKeyHash, active: true });
    // if (!storedKey) {
    //   return res.status(401).json({
    //     status: 'error',
    //     message: 'Invalid API key'
    //   });
    // }

    // Attach API key info to request
    req.apiKey = {
      key: apiKey,
      hash: apiKeyHash
    };

    next();
  } catch (error) {
    console.error('API key authentication error:', error);
    return res.status(401).json({
      status: 'error',
      message: 'Invalid API key'
    });
  }
};

/**
 * Session timeout middleware
 * Checks if user session has timed out
 */
const checkSessionTimeout = (req, res, next) => {
  if (!req.user) {
    return next();
  }

  const now = Date.now();
  const tokenIat = req.user.iat * 1000; // Convert to milliseconds
  const sessionAge = now - tokenIat;

  // Check absolute timeout
  if (sessionAge > securityConfig.session.absoluteTimeout) {
    return res.status(401).json({
      status: 'error',
      message: 'Session expired',
      code: 'SESSION_TIMEOUT'
    });
  }

  next();
};

/**
 * Account ownership verification middleware
 * Ensures user can only access their own resources
 */
const verifyOwnership = (resourceParam = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
    }

    const resourceId = req.params[resourceParam] || req.body[resourceParam];

    // Allow admins to access any resource
    if (req.user.role === 'admin' || req.user.role === 'superadmin') {
      return next();
    }

    // Check ownership
    if (resourceId !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied: You can only access your own resources'
      });
    }

    next();
  };
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  generateTokenPair,
  verifyToken,
  extractToken,
  authenticate,
  optionalAuth,
  authorize,
  requirePermissions,
  refreshAccessToken,
  authenticateApiKey,
  checkSessionTimeout,
  verifyOwnership
};

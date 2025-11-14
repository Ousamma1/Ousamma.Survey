/**
 * Security Middleware
 * Comprehensive security middleware for Express applications
 */

const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cors = require('cors');
const securityConfig = require('../config/security.config');

/**
 * Apply Helmet security headers
 */
const helmetMiddleware = helmet(securityConfig.helmet);

/**
 * Apply CORS configuration
 */
const corsMiddleware = cors(securityConfig.cors);

/**
 * Sanitize MongoDB queries to prevent NoSQL injection
 */
const mongoSanitizeMiddleware = mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    console.warn(`Potential NoSQL injection attempt detected: ${key} from IP ${req.ip}`);
  }
});

/**
 * Prevent XSS attacks by sanitizing user input
 */
const xssMiddleware = xss();

/**
 * Prevent HTTP Parameter Pollution
 */
const hppMiddleware = hpp({
  whitelist: [
    'page',
    'limit',
    'sort',
    'fields',
    'filter',
    'search',
    'status',
    'type',
    'category',
    'tags'
  ]
});

/**
 * Request size limiter middleware
 */
const requestSizeLimiter = (req, res, next) => {
  const contentLength = parseInt(req.headers['content-length'] || '0');
  const maxSize = parseInt(securityConfig.requestLimits.json.replace('mb', '')) * 1024 * 1024;

  if (contentLength > maxSize) {
    return res.status(413).json({
      status: 'error',
      message: 'Request entity too large'
    });
  }

  next();
};

/**
 * Security headers middleware
 */
const securityHeaders = (req, res, next) => {
  // Remove fingerprinting headers
  res.removeHeader('X-Powered-By');

  // Add custom security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  // Add request ID for tracking
  req.id = require('crypto').randomUUID();
  res.setHeader('X-Request-ID', req.id);

  next();
};

/**
 * IP Blacklist/Whitelist middleware
 */
const ipControl = (req, res, next) => {
  const clientIp = req.ip || req.connection.remoteAddress;

  // Check blacklist
  if (securityConfig.ipControl.blacklist.includes(clientIp)) {
    console.warn(`Blocked request from blacklisted IP: ${clientIp}`);
    return res.status(403).json({
      status: 'error',
      message: 'Access denied'
    });
  }

  // Check whitelist (if enabled)
  if (securityConfig.ipControl.whitelistEnabled) {
    if (!securityConfig.ipControl.whitelist.includes(clientIp)) {
      console.warn(`Blocked request from non-whitelisted IP: ${clientIp}`);
      return res.status(403).json({
        status: 'error',
        message: 'Access denied'
      });
    }
  }

  next();
};

/**
 * Request logging middleware for security audit
 */
const securityLogger = (req, res, next) => {
  const logData = {
    timestamp: new Date().toISOString(),
    requestId: req.id,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    userId: req.user?.id || 'anonymous'
  };

  // Log sensitive operations
  const sensitivePatterns = [
    '/auth/',
    '/login',
    '/register',
    '/password',
    '/admin/',
    '/api-keys',
    '/delete',
    '/export'
  ];

  if (sensitivePatterns.some(pattern => req.originalUrl.includes(pattern))) {
    console.info('Security audit log:', JSON.stringify(logData));
  }

  next();
};

/**
 * Content-Type validation middleware
 */
const contentTypeValidation = (req, res, next) => {
  // Only validate for POST, PUT, PATCH requests
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = req.headers['content-type'];

    const allowedTypes = [
      'application/json',
      'application/x-www-form-urlencoded',
      'multipart/form-data',
      'text/plain'
    ];

    const isAllowed = allowedTypes.some(type =>
      contentType && contentType.toLowerCase().includes(type)
    );

    if (!isAllowed) {
      return res.status(415).json({
        status: 'error',
        message: 'Unsupported Media Type'
      });
    }
  }

  next();
};

/**
 * HTTPS enforcement middleware (for production)
 */
const httpsEnforcement = (req, res, next) => {
  if (process.env.NODE_ENV === 'production' && !req.secure && req.headers['x-forwarded-proto'] !== 'https') {
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }
  next();
};

/**
 * API Key validation middleware for service-to-service communication
 */
const validateServiceApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({
      status: 'error',
      message: 'API key required'
    });
  }

  // Validate API key format
  if (!apiKey.startsWith(securityConfig.serviceSecurity.serviceKeyPrefix)) {
    return res.status(401).json({
      status: 'error',
      message: 'Invalid API key format'
    });
  }

  // Here you would validate against stored API keys
  // This is a placeholder - implement actual validation in your service
  req.serviceAuth = {
    authenticated: true,
    apiKey: apiKey
  };

  next();
};

/**
 * Combined security middleware setup
 */
const setupSecurity = (app) => {
  // Apply security headers first
  app.use(helmetMiddleware);
  app.use(securityHeaders);

  // HTTPS enforcement in production
  if (process.env.NODE_ENV === 'production') {
    app.use(httpsEnforcement);
  }

  // CORS
  app.use(corsMiddleware);

  // Request size limiting
  app.use(requestSizeLimiter);

  // Content-Type validation
  app.use(contentTypeValidation);

  // Data sanitization
  app.use(mongoSanitizeMiddleware);
  app.use(xssMiddleware);
  app.use(hppMiddleware);

  // IP control
  if (securityConfig.ipControl.whitelistEnabled || securityConfig.ipControl.blacklist.length > 0) {
    app.use(ipControl);
  }

  // Security logging
  if (securityConfig.audit.enabled) {
    app.use(securityLogger);
  }
};

module.exports = {
  setupSecurity,
  helmetMiddleware,
  corsMiddleware,
  mongoSanitizeMiddleware,
  xssMiddleware,
  hppMiddleware,
  requestSizeLimiter,
  securityHeaders,
  ipControl,
  securityLogger,
  contentTypeValidation,
  httpsEnforcement,
  validateServiceApiKey
};

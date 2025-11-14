/**
 * Express Middleware for Request Logging
 */

const logger = require('./index');
const onFinished = require('on-finished');

/**
 * Request logging middleware
 * Logs all incoming HTTP requests with timing information
 */
const requestLogger = (req, res, next) => {
  const startTime = Date.now();

  // Log when response finishes
  onFinished(res, (err, res) => {
    const responseTime = Date.now() - startTime;

    const logData = {
      method: req.method,
      url: req.originalUrl || req.url,
      status: res.statusCode,
      responseTime: `${responseTime}ms`,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      contentLength: res.get('content-length'),
    };

    // Add user info if authenticated
    if (req.user) {
      logData.userId = req.user.id || req.user._id;
    }

    // Determine log level based on status code
    if (res.statusCode >= 500) {
      logger.error('HTTP Request', logData);
    } else if (res.statusCode >= 400) {
      logger.warn('HTTP Request', logData);
    } else {
      logger.http('HTTP Request', logData);
    }

    // Log error details if present
    if (err) {
      logger.error('Response Error', {
        ...logData,
        error: err.message,
        stack: err.stack,
      });
    }
  });

  next();
};

/**
 * Error logging middleware
 * Logs all errors that occur during request processing
 */
const errorLogger = (err, req, res, next) => {
  logger.error('Application Error', {
    message: err.message,
    stack: err.stack,
    code: err.code,
    method: req.method,
    url: req.originalUrl || req.url,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    body: req.body,
    params: req.params,
    query: req.query,
  });

  next(err);
};

/**
 * Correlation ID middleware
 * Adds a unique ID to each request for tracking across services
 */
const correlationId = (req, res, next) => {
  const id = req.get('X-Correlation-ID') || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  req.correlationId = id;
  res.set('X-Correlation-ID', id);

  // Add to logger metadata
  req.log = logger.child({ correlationId: id });

  next();
};

module.exports = {
  requestLogger,
  errorLogger,
  correlationId,
};

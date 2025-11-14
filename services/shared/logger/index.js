/**
 * Centralized Logger for Survey Platform
 * Provides structured JSON logging with multiple transports
 */

const winston = require('winston');
const path = require('path');

// Log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Log colors
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

// Determine log level from environment
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : process.env.LOG_LEVEL || 'info';
};

// Custom format for console output (development)
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => {
    const { timestamp, level, message, service, ...meta } = info;
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${service || 'app'}] ${level}: ${message} ${metaStr}`;
  })
);

// JSON format for production
const jsonFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Create transports
const transports = [];

// Console transport (always enabled)
transports.push(
  new winston.transports.Console({
    format: process.env.NODE_ENV === 'production' ? jsonFormat : consoleFormat,
  })
);

// File transports for production
if (process.env.NODE_ENV === 'production') {
  // Error log
  transports.push(
    new winston.transports.File({
      filename: path.join(process.env.LOG_DIR || '/var/log/survey-platform', 'error.log'),
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
      format: jsonFormat,
    })
  );

  // Combined log
  transports.push(
    new winston.transports.File({
      filename: path.join(process.env.LOG_DIR || '/var/log/survey-platform', 'combined.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 10,
      format: jsonFormat,
    })
  );
}

// Create the logger
const logger = winston.createLogger({
  level: level(),
  levels,
  defaultMeta: {
    service: process.env.SERVICE_NAME || 'survey-platform',
    environment: process.env.NODE_ENV || 'development',
    hostname: process.env.HOSTNAME || require('os').hostname(),
  },
  transports,
  exitOnError: false,
});

// Create a stream object for Morgan HTTP logger
logger.stream = {
  write: (message) => {
    logger.http(message.trim());
  },
};

// Add request logging helper
logger.logRequest = (req, res, responseTime) => {
  logger.http('HTTP Request', {
    method: req.method,
    url: req.url,
    status: res.statusCode,
    responseTime: `${responseTime}ms`,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
  });
};

// Add error logging helper
logger.logError = (error, context = {}) => {
  logger.error('Error occurred', {
    message: error.message,
    stack: error.stack,
    code: error.code,
    ...context,
  });
};

// Add Kafka event logging
logger.logKafkaEvent = (topic, event, metadata = {}) => {
  logger.info('Kafka Event', {
    topic,
    event,
    ...metadata,
  });
};

// Add database operation logging
logger.logDbOperation = (operation, collection, metadata = {}) => {
  logger.debug('Database Operation', {
    operation,
    collection,
    ...metadata,
  });
};

// Add cache operation logging
logger.logCacheOperation = (operation, key, metadata = {}) => {
  logger.debug('Cache Operation', {
    operation,
    key,
    ...metadata,
  });
};

// Handle uncaught exceptions and unhandled rejections
if (process.env.NODE_ENV === 'production') {
  logger.exceptions.handle(
    new winston.transports.File({
      filename: path.join(process.env.LOG_DIR || '/var/log/survey-platform', 'exceptions.log'),
      maxsize: 10485760,
      maxFiles: 5,
    })
  );

  logger.rejections.handle(
    new winston.transports.File({
      filename: path.join(process.env.LOG_DIR || '/var/log/survey-platform', 'rejections.log'),
      maxsize: 10485760,
      maxFiles: 5,
    })
  );
}

module.exports = logger;

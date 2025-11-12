const logger = require('../config/logger');

module.exports = (req, res, next) => {
  const startTime = Date.now();

  // Log request
  logger.info(`${req.method} ${req.path}`, {
    userId: req.headers['x-user-id'],
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });

  // Log response on finish
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info(`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });

  next();
};

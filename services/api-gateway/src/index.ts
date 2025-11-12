import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import winston from 'winston';
import { config } from './config';
import { createRoutes } from './routes';
import { errorHandler } from './middleware/error-handler';
import { requestLogger } from './middleware/request-logger';
import { rateLimiter } from './middleware/rate-limit';
import { ServiceRegistry } from './services/service-registry';

// Configure logger
const logger = winston.createLogger({
  level: config.logLevel,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'api-gateway' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const metaString = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
          return `${timestamp} [api-gateway] ${level}: ${message} ${metaString}`;
        })
      )
    })
  ]
});

// Create Express app
const app: Application = express();

// Initialize service registry
const serviceRegistry = new ServiceRegistry(logger);

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || config.cors.origins.includes(origin) || config.cors.origins.includes('*')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// Request logging
app.use(requestLogger(logger));

// Rate limiting
app.use(rateLimiter);

// Trust proxy (for proper IP detection behind load balancers)
app.set('trust proxy', 1);

// API versioning prefix
const API_VERSION = '/v1';

// Routes
app.use(API_VERSION, createRoutes(logger));

// Health check for gateway itself (outside versioning)
app.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      service: 'api-gateway',
      status: 'healthy',
      timestamp: new Date(),
      uptime: process.uptime(),
      version: '1.0.0'
    }
  });
});

// Aggregated health check endpoint
app.get('/health/all', async (req, res) => {
  try {
    const servicesHealth = await serviceRegistry.checkAllServices();
    const healthData = Array.from(servicesHealth.values());

    const allHealthy = healthData.every(service => service.status === 'healthy');

    res.status(allHealthy ? 200 : 503).json({
      success: true,
      data: {
        gateway: {
          service: 'api-gateway',
          status: 'healthy',
          uptime: process.uptime()
        },
        services: healthData,
        overall: allHealthy ? 'healthy' : 'degraded'
      },
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error checking services health:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'HEALTH_CHECK_FAILED',
        message: 'Failed to check services health'
      },
      timestamp: new Date()
    });
  }
});

// Error handling middleware (must be last)
app.use(errorHandler(logger));

// Start server
const startServer = async () => {
  try {
    // Start health checks for all services
    serviceRegistry.startHealthChecks(30000); // Check every 30 seconds

    app.listen(config.port, () => {
      logger.info(`🚀 API Gateway is running on port ${config.port}`);
      logger.info(`📝 Environment: ${config.nodeEnv}`);
      logger.info(`🔒 CORS origins: ${config.cors.origins.join(', ')}`);
      logger.info(`💊 Health check: http://localhost:${config.port}/health`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  serviceRegistry.stopHealthChecks();
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully...');
  serviceRegistry.stopHealthChecks();
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

startServer();

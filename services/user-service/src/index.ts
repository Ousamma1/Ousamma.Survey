import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import winston from 'winston';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import userRoutes from './routes/user.routes';

dotenv.config();

const config = {
  port: parseInt(process.env.PORT || '3002', 10),
  mongoUri: process.env.MONGO_URI || 'mongodb://mongodb:27017/user-service',
  mongoDbName: process.env.MONGO_DB_NAME || 'user-service',
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000').split(',')
};

// Configure logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'user-service' },
  transports: [new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.printf(({ timestamp, level, message }) =>
        `${timestamp} [user-service] ${level}: ${message}`)
    )
  })]
});

const app: Application = express();

app.use(helmet());
app.use(cors({ origin: config.corsOrigins, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      service: 'user-service',
      status: 'healthy',
      timestamp: new Date(),
      uptime: process.uptime(),
      version: '1.0.0'
    }
  });
});

app.use('/api/users', userRoutes);

app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: 'Endpoint not found' },
    timestamp: new Date()
  });
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Error:', err);
  res.status(err.statusCode || 500).json({
    success: false,
    error: { code: err.code || 'INTERNAL_ERROR', message: err.message },
    timestamp: new Date()
  });
});

const startServer = async () => {
  try {
    await mongoose.connect(config.mongoUri, { dbName: config.mongoDbName });
    logger.info(`✅ Connected to MongoDB: ${config.mongoDbName}`);

    app.listen(config.port, () => {
      logger.info(`🚀 User Service running on port ${config.port}`);
    });
  } catch (error) {
    logger.error('Failed to start:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', async () => {
  await mongoose.disconnect();
  process.exit(0);
});

startServer();

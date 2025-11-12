import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import winston from 'winston';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Config, FeatureFlag } from './models/config.model';

dotenv.config();

const config = {
  port: parseInt(process.env.PORT || '3003', 10),
  mongoUri: process.env.MONGO_URI || 'mongodb://mongodb:27017/config-service',
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000').split(',')
};

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  defaultMeta: { service: 'config-service' },
  transports: [new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.printf(({ timestamp, level, message }) =>
        `${timestamp} [config-service] ${level}: ${message}`)
    )
  })]
});

const app = express();

app.use(helmet());
app.use(cors({ origin: config.corsOrigins, credentials: true }));
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({
    success: true,
    data: { service: 'config-service', status: 'healthy', timestamp: new Date(), uptime: process.uptime() }
  });
});

// Config endpoints
app.get('/api/config', async (req, res) => {
  try {
    const configs = await Config.find(req.query.isPublic === 'true' ? { isPublic: true } : {});
    res.json({ success: true, data: configs, timestamp: new Date() });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

app.get('/api/config/:key', async (req, res) => {
  try {
    const config = await Config.findOne({ key: req.params.key });
    if (!config) {
      return res.status(404).json({ success: false, error: { message: 'Config not found' } });
    }
    res.json({ success: true, data: config, timestamp: new Date() });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

app.post('/api/config', async (req, res) => {
  try {
    const config = await Config.create(req.body);
    res.status(201).json({ success: true, data: config, message: 'Config created' });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

app.put('/api/config/:key', async (req, res) => {
  try {
    const config = await Config.findOneAndUpdate(
      { key: req.params.key },
      { $set: req.body },
      { new: true }
    );
    if (!config) {
      return res.status(404).json({ success: false, error: { message: 'Config not found' } });
    }
    res.json({ success: true, data: config, message: 'Config updated' });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

app.delete('/api/config/:key', async (req, res) => {
  try {
    const result = await Config.deleteOne({ key: req.params.key });
    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, error: { message: 'Config not found' } });
    }
    res.json({ success: true, message: 'Config deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// Feature flag endpoints
app.get('/api/feature-flags', async (req, res) => {
  try {
    const flags = await FeatureFlag.find();
    res.json({ success: true, data: flags, timestamp: new Date() });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

app.get('/api/feature-flags/:name', async (req, res) => {
  try {
    const flag = await FeatureFlag.findOne({ name: req.params.name });
    if (!flag) {
      return res.status(404).json({ success: false, error: { message: 'Feature flag not found' } });
    }
    res.json({ success: true, data: flag, timestamp: new Date() });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

app.post('/api/feature-flags', async (req, res) => {
  try {
    const flag = await FeatureFlag.create(req.body);
    res.status(201).json({ success: true, data: flag, message: 'Feature flag created' });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

app.put('/api/feature-flags/:name', async (req, res) => {
  try {
    const flag = await FeatureFlag.findOneAndUpdate(
      { name: req.params.name },
      { $set: req.body },
      { new: true }
    );
    if (!flag) {
      return res.status(404).json({ success: false, error: { message: 'Feature flag not found' } });
    }
    res.json({ success: true, data: flag, message: 'Feature flag updated' });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Error:', err);
  res.status(500).json({ success: false, error: { message: err.message } });
});

const startServer = async () => {
  try {
    await mongoose.connect(config.mongoUri);
    logger.info('✅ Connected to MongoDB');
    app.listen(config.port, () => {
      logger.info(`🚀 Config Service running on port ${config.port}`);
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

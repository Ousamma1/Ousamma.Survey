const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const createLogger = require('../../../shared/utils/logger');
const { errorHandler } = require('../../../shared/utils/errorHandler');
const { initKafka } = require('./kafka/producer');

dotenv.config();

const app = express();
const logger = createLogger('response-service');
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/v1/responses', require('./routes/response.routes'));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'response-service',
    timestamp: new Date().toISOString()
  });
});

// Error handler
app.use(errorHandler);

// MongoDB connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    logger.info('MongoDB connected successfully');
  } catch (error) {
    logger.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Start server
const start = async () => {
  await connectDB();
  await initKafka();

  app.listen(PORT, () => {
    logger.info(`Response service listening on port ${PORT}`);
  });
};

start();

module.exports = app;

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const createLogger = require('../../../shared/utils/logger');
const { errorHandler } = require('../../../shared/utils/errorHandler');

dotenv.config();

const app = express();
const logger = createLogger('file-service');
const PORT = process.env.PORT || 3004;

// Create uploads directory if it doesn't exist
const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  logger.info(`Created uploads directory: ${uploadDir}`);
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(uploadDir));

// Routes
app.use('/api/v1/files', require('./routes/file.routes'));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'file-service',
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
connectDB().then(() => {
  app.listen(PORT, () => {
    logger.info(`File service listening on port ${PORT}`);
  });
});

module.exports = app;

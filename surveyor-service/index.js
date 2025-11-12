require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connectDB } = require('./database/connection');

// Import routes
const surveyorRoutes = require('./routes/surveyors');
const assignmentRoutes = require('./routes/assignments');
const activityRoutes = require('./routes/activities');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'surveyor-management-service',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/surveyors', surveyorRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/activities', activityRoutes);

// Additional utility endpoints

// Get surveyor assignments
app.get('/api/surveyors/:id/assignments', require('./controllers/assignmentController').getSurveyorAssignments);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

// Start server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    console.log('Connected to MongoDB');

    // Start listening
    app.listen(PORT, () => {
      console.log(`Surveyor Management Service running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing server');
  const { disconnectDB } = require('./database/connection');
  await disconnectDB();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT signal received: closing server');
  const { disconnectDB } = require('./database/connection');
  await disconnectDB();
  process.exit(0);
});

// Start the server
startServer();

module.exports = app;

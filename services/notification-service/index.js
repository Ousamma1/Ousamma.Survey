/**
 * Notification Service
 * Multi-channel notification API service
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const database = require('./config/database');
const config = require('./config/config');
const kafka = require('./config/kafka');

// Routes
const notificationRoutes = require('./routes/notifications');
const templateRoutes = require('./routes/templates');
const preferenceRoutes = require('./routes/preferences');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: config.cors.origins,
  credentials: true
}));

// Rate limiting
const limiter = rateLimit(config.rateLimit);
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'notification-service',
    timestamp: new Date().toISOString(),
    database: database.isConnected() ? 'connected' : 'disconnected'
  });
});

// API routes
app.use('/api/notifications', notificationRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/preferences', preferenceRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);

  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

// Graceful shutdown
async function shutdown() {
  console.log('\nShutting down notification service...');

  try {
    await kafka.disconnect();
    await database.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start server
async function start() {
  try {
    // Connect to MongoDB
    await database.connect();

    // Seed default templates
    await seedTemplates();

    // Start HTTP server
    const PORT = config.port;
    app.listen(PORT, () => {
      console.log(`✓ Notification Service listening on port ${PORT}`);
      console.log(`  Environment: ${config.nodeEnv}`);
      console.log(`  MongoDB: Connected`);
      console.log(`  Kafka: ${config.kafka.brokers.join(', ')}`);
    });
  } catch (error) {
    console.error('Failed to start notification service:', error);
    process.exit(1);
  }
}

// Seed default notification templates
async function seedTemplates() {
  try {
    const NotificationTemplate = require('./models/NotificationTemplate');

    const templates = [
      {
        name: 'survey-created',
        type: 'in-app',
        subject: 'New Survey Created',
        body: 'Your survey "{surveyTitle}" has been created successfully.',
        htmlBody: '<h2>Survey Created</h2><p>Your survey "<strong>{surveyTitle}</strong>" has been created successfully.</p>',
        variables: ['surveyTitle'],
        category: 'survey',
        priority: 'normal'
      },
      {
        name: 'survey-published',
        type: 'email',
        subject: 'Survey Published: {surveyTitle}',
        body: 'Your survey "{surveyTitle}" has been published and is now live!',
        htmlBody: '<h2>Survey Published</h2><p>Your survey "<strong>{surveyTitle}</strong>" has been published and is now live!</p><p><a href="{surveyUrl}">View Survey</a></p>',
        variables: ['surveyTitle', 'surveyUrl'],
        category: 'survey',
        priority: 'high'
      },
      {
        name: 'response-submitted',
        type: 'in-app',
        subject: 'New Response Received',
        body: 'A new response has been submitted for survey "{surveyTitle}".',
        htmlBody: '<h2>New Response</h2><p>A new response has been submitted for survey "<strong>{surveyTitle}</strong>".</p><p><a href="{responseUrl}">View Response</a></p>',
        variables: ['surveyTitle', 'responseUrl'],
        category: 'response',
        priority: 'normal'
      },
      {
        name: 'surveyor-welcome',
        type: 'email',
        subject: 'Welcome to Survey Platform!',
        body: 'Welcome {surveyorName}! Your surveyor account has been successfully created.',
        htmlBody: '<h2>Welcome to Survey Platform!</h2><p>Hello <strong>{surveyorName}</strong>,</p><p>Your surveyor account has been successfully created.</p><p>You can now start creating and managing surveys.</p>',
        variables: ['surveyorName'],
        category: 'account',
        priority: 'normal'
      },
      {
        name: 'target-reached',
        type: 'push',
        subject: 'Survey Target Reached',
        body: 'Your survey "{surveyTitle}" has reached its target of {targetCount} responses!',
        htmlBody: '<h2>Target Reached!</h2><p>Your survey "<strong>{surveyTitle}</strong>" has reached its target of <strong>{targetCount}</strong> responses!</p>',
        variables: ['surveyTitle', 'targetCount'],
        category: 'alert',
        priority: 'high'
      },
      {
        name: 'account-expiring',
        type: 'email',
        subject: 'Your Account is Expiring Soon',
        body: 'Hi {userName}, your account will expire in {daysLeft} days. Please renew to continue using our services.',
        htmlBody: '<h2>Account Expiring</h2><p>Hi <strong>{userName}</strong>,</p><p>Your account will expire in <strong>{daysLeft}</strong> days.</p><p>Please renew to continue using our services.</p><p><a href="{renewUrl}">Renew Now</a></p>',
        variables: ['userName', 'daysLeft', 'renewUrl'],
        category: 'account',
        priority: 'urgent'
      },
      {
        name: 'surveyor-assigned',
        type: 'sms',
        subject: 'New Survey Assignment',
        body: 'You have been assigned to survey "{surveyTitle}". Check your dashboard for details.',
        variables: ['surveyTitle'],
        category: 'survey',
        priority: 'high'
      },
      {
        name: 'system-alert',
        type: 'push',
        subject: 'System Alert',
        body: '{alertMessage}',
        variables: ['alertMessage'],
        category: 'system',
        priority: 'urgent'
      }
    ];

    for (const templateData of templates) {
      await NotificationTemplate.findOneAndUpdate(
        { name: templateData.name },
        templateData,
        { upsert: true, new: true }
      );
    }

    console.log('✓ Notification templates seeded');
  } catch (error) {
    console.error('Error seeding templates:', error);
  }
}

// Start the service
start();

module.exports = app;

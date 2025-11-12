/**
 * Notification Consumer Configuration
 */

module.exports = {
  port: process.env.PORT || 3004,

  // MongoDB configuration
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://mongodb:27017/notifications',
    dbName: process.env.MONGODB_DB_NAME || 'notifications'
  },

  // Kafka configuration
  kafka: {
    brokers: (process.env.KAFKA_BROKERS || 'kafka:9092').split(','),
    clientId: process.env.KAFKA_CLIENT_ID || 'notification-consumer',
    groupId: process.env.KAFKA_GROUP_ID || 'notification-consumer-group'
  },

  // Email configuration
  email: {
    provider: process.env.EMAIL_PROVIDER || 'console', // 'smtp', 'sendgrid', 'console'
    from: process.env.EMAIL_FROM || 'noreply@survey-platform.com',
    smtp: {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    }
  },

  // SMS configuration
  sms: {
    provider: process.env.SMS_PROVIDER || 'console', // 'twilio', 'console'
    twilio: {
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      fromNumber: process.env.TWILIO_FROM_NUMBER
    }
  },

  // Push notification configuration
  push: {
    provider: process.env.PUSH_PROVIDER || 'console', // 'web-push', 'fcm', 'console'
    webPush: {
      vapidPublicKey: process.env.VAPID_PUBLIC_KEY,
      vapidPrivateKey: process.env.VAPID_PRIVATE_KEY,
      vapidSubject: process.env.VAPID_SUBJECT || 'mailto:admin@survey-platform.com'
    },
    fcm: {
      serverKey: process.env.FCM_SERVER_KEY
    }
  },

  // WebSocket service URL for real-time notifications
  websocketUrl: process.env.WEBSOCKET_URL || 'http://websocket-service:3002',

  // Retry configuration
  retry: {
    maxAttempts: parseInt(process.env.MAX_RETRY_ATTEMPTS || '3'),
    delayMs: parseInt(process.env.RETRY_DELAY_MS || '5000')
  },

  // Notification templates
  templates: {
    surveyCreated: {
      subject: 'New Survey Created',
      body: 'A new survey "{surveyTitle}" has been created.'
    },
    surveyPublished: {
      subject: 'Survey Published',
      body: 'Survey "{surveyTitle}" has been published and is now live!'
    },
    responseSubmitted: {
      subject: 'New Response Received',
      body: 'A new response has been submitted for survey "{surveyTitle}".'
    },
    surveyorRegistered: {
      subject: 'Welcome to Survey Platform',
      body: 'Welcome {surveyorName}! Your account has been successfully created.'
    }
  }
};

module.exports = {
  port: process.env.PORT || 3006,
  nodeEnv: process.env.NODE_ENV || 'development',

  // MongoDB configuration
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://mongodb:27017/notifications',
    dbName: process.env.MONGODB_DB_NAME || 'notifications'
  },

  // Kafka configuration
  kafka: {
    brokers: (process.env.KAFKA_BROKERS || 'kafka:9092').split(','),
    clientId: process.env.KAFKA_CLIENT_ID || 'notification-service',
    groupId: process.env.KAFKA_GROUP_ID || 'notification-service-group'
  },

  // CORS configuration
  cors: {
    origins: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:3001').split(',')
  },

  // Rate limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
  },

  // Notification defaults
  notification: {
    defaultExpiry: 30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
    maxRetries: 3,
    retryDelay: 5 * 60 * 1000, // 5 minutes
    batchSize: 50
  },

  // WebSocket service URL
  websocketUrl: process.env.WEBSOCKET_URL || 'http://websocket-service:3002'
};

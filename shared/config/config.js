module.exports = {
  // MongoDB Configuration
  mongodb: {
    protocol: process.env.MONGO_PROTOCOL || 'mongodb',
    host: process.env.MONGO_HOST || 'mongodb',
    port: process.env.MONGO_PORT || 27017,
    username: process.env.MONGO_USERNAME || 'admin',
    password: process.env.MONGO_PASSWORD || 'password',
    authSource: process.env.MONGO_AUTH_SOURCE || 'admin',
    getUri: (database) => {
      const { protocol, host, port, username, password, authSource } = module.exports.mongodb;
      return `${protocol}://${username}:${password}@${host}:${port}/${database}?authSource=${authSource}`;
    }
  },

  // Kafka Configuration
  kafka: {
    brokers: (process.env.KAFKA_BROKERS || 'kafka:9092').split(','),
    clientId: process.env.KAFKA_CLIENT_ID || 'survey-platform',
    groupId: process.env.KAFKA_GROUP_ID || 'survey-platform-group',
    topics: {
      SURVEY_CREATED: 'survey.created',
      SURVEY_UPDATED: 'survey.updated',
      SURVEY_DELETED: 'survey.deleted',
      RESPONSE_SUBMITTED: 'response.submitted',
      RESPONSE_UPDATED: 'response.updated',
      FILE_UPLOADED: 'file.uploaded'
    }
  },

  // Service URLs
  services: {
    survey: process.env.SURVEY_SERVICE_URL || 'http://survey-service:3001',
    response: process.env.RESPONSE_SERVICE_URL || 'http://response-service:3002',
    template: process.env.TEMPLATE_SERVICE_URL || 'http://template-service:3003',
    file: process.env.FILE_SERVICE_URL || 'http://file-service:3004',
    gateway: process.env.API_GATEWAY_URL || 'http://api-gateway:3000'
  },

  // API Gateway
  gateway: {
    port: process.env.GATEWAY_PORT || 3000,
    rateLimitWindowMs: 15 * 60 * 1000, // 15 minutes
    rateLimitMax: 100 // max requests per window
  },

  // File Service Configuration
  file: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
    allowedTypes: (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/gif,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document').split(','),
    storageType: process.env.STORAGE_TYPE || 'local', // local or s3
    uploadDir: process.env.UPLOAD_DIR || './uploads'
  },

  // CORS Configuration
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true
  },

  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  }
};

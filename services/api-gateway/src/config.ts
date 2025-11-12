import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',

  services: {
    auth: process.env.AUTH_SERVICE_URL || 'http://auth-service:3001',
    user: process.env.USER_SERVICE_URL || 'http://user-service:3002',
    config: process.env.CONFIG_SERVICE_URL || 'http://config-service:3003',
    survey: process.env.SURVEY_SERVICE_URL || 'http://survey-service:3004',
    response: process.env.RESPONSE_SERVICE_URL || 'http://response-service:3005',
    analytics: process.env.ANALYTICS_SERVICE_URL || 'http://analytics-service:3006',
    ai: process.env.AI_SERVICE_URL || 'http://ai-service:3007',
    geolocation: process.env.GEOLOCATION_SERVICE_URL || 'http://geolocation-service:3008',
    notification: process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3009',
    file: process.env.FILE_SERVICE_URL || 'http://file-service:3010'
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m'
  },

  cors: {
    origins: (process.env.CORS_ORIGINS || 'http://localhost:3000').split(',').map(o => o.trim())
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10)
  },

  redis: {
    host: process.env.REDIS_HOST || 'redis',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined
  }
};

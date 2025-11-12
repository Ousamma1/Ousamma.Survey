/**
 * Analytics Consumer Configuration
 */

module.exports = {
  port: process.env.PORT || 3003,

  // MongoDB configuration
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://mongodb:27017/analytics',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true
    }
  },

  // Redis configuration for caching
  redis: {
    host: process.env.REDIS_HOST || 'redis',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0')
  },

  // Analytics configuration
  analytics: {
    // Cache TTL in seconds
    cacheTTL: parseInt(process.env.ANALYTICS_CACHE_TTL || '300'), // 5 minutes

    // Batch size for processing
    batchSize: parseInt(process.env.ANALYTICS_BATCH_SIZE || '100'),

    // Update interval for real-time analytics (ms)
    updateInterval: parseInt(process.env.ANALYTICS_UPDATE_INTERVAL || '5000'),

    // Enable real-time updates
    realtimeEnabled: process.env.ANALYTICS_REALTIME_ENABLED !== 'false'
  },

  // Kafka configuration
  kafka: {
    brokers: process.env.KAFKA_BROKERS?.split(',') || ['kafka:9092'],
    groupId: 'analytics-consumer-group',
    clientId: 'analytics-consumer'
  }
};

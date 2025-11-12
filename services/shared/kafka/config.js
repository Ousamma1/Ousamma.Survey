/**
 * Kafka Configuration
 * Central configuration for all Kafka connections
 */

const config = {
  // Kafka broker configuration
  brokers: process.env.KAFKA_BROKERS
    ? process.env.KAFKA_BROKERS.split(',')
    : ['kafka:9092'],

  // Client configuration
  clientId: process.env.KAFKA_CLIENT_ID || 'survey-platform',

  // Connection timeout
  connectionTimeout: parseInt(process.env.KAFKA_CONNECTION_TIMEOUT || '10000'),
  requestTimeout: parseInt(process.env.KAFKA_REQUEST_TIMEOUT || '30000'),

  // Retry configuration
  retry: {
    initialRetryTime: 100,
    retries: 8,
    maxRetryTime: 30000,
    multiplier: 2,
    factor: 0.2
  },

  // Producer configuration
  producer: {
    allowAutoTopicCreation: process.env.KAFKA_AUTO_CREATE_TOPICS !== 'false',
    transactionTimeout: 60000,
    idempotent: true,
    maxInFlightRequests: 5,
    compression: 'gzip',
    acks: -1, // Wait for all replicas
    timeout: 30000
  },

  // Consumer configuration
  consumer: {
    groupId: process.env.KAFKA_CONSUMER_GROUP || 'survey-consumers',
    sessionTimeout: 30000,
    rebalanceTimeout: 60000,
    heartbeatInterval: 3000,
    allowAutoTopicCreation: false,
    maxBytesPerPartition: 1048576, // 1MB
    retry: {
      initialRetryTime: 100,
      retries: 8,
      maxRetryTime: 30000,
      multiplier: 2
    }
  },

  // Topic configuration
  topics: {
    // Survey events
    surveyCreated: 'survey.created',
    surveyUpdated: 'survey.updated',
    surveyPublished: 'survey.published',
    surveyDeleted: 'survey.deleted',

    // Response events
    responseSubmitted: 'response.submitted',
    responseUpdated: 'response.updated',
    responseDeleted: 'response.deleted',

    // Surveyor events
    surveyorActivity: 'surveyor.activity',
    surveyorLocation: 'surveyor.location',
    surveyorRegistered: 'surveyor.registered',

    // Analytics events
    analyticsUpdate: 'analytics.update',
    analyticsRequest: 'analytics.request',

    // Notification events
    notificationSend: 'notification.send',
    notificationEmail: 'notification.email',
    notificationSms: 'notification.sms',
    notificationPush: 'notification.push',

    // Audit events
    auditLog: 'audit.log',
    auditAuth: 'audit.auth',
    auditData: 'audit.data',

    // Dead letter queues
    dlqSurvey: 'dlq.survey',
    dlqResponse: 'dlq.response',
    dlqNotification: 'dlq.notification',
    dlqAudit: 'dlq.audit'
  },

  // Partition strategy
  partitions: {
    default: 3,
    highVolume: 6
  },

  // Replication factor
  replicationFactor: parseInt(process.env.KAFKA_REPLICATION_FACTOR || '1'),

  // Dead letter queue configuration
  dlq: {
    enabled: process.env.KAFKA_DLQ_ENABLED !== 'false',
    maxRetries: parseInt(process.env.KAFKA_DLQ_MAX_RETRIES || '3'),
    retryDelay: parseInt(process.env.KAFKA_DLQ_RETRY_DELAY || '5000')
  },

  // Logging
  logLevel: process.env.KAFKA_LOG_LEVEL || 'info'
};

module.exports = config;

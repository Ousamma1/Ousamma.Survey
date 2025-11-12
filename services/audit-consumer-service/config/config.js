/**
 * Audit Consumer Configuration
 */

module.exports = {
  port: process.env.PORT || 3005,

  // MongoDB configuration for audit storage
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://mongodb:27017/audit',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true
    }
  },

  // Audit settings
  audit: {
    // Retention period in days
    retentionDays: parseInt(process.env.AUDIT_RETENTION_DAYS || '365'),

    // Archive old logs
    archiveEnabled: process.env.AUDIT_ARCHIVE_ENABLED !== 'false',

    // Encryption for sensitive data
    encryptionEnabled: process.env.AUDIT_ENCRYPTION_ENABLED === 'true',

    // Compliance standards
    complianceStandards: ['GDPR', 'SOC2', 'HIPAA']
  },

  // Kafka configuration
  kafka: {
    brokers: process.env.KAFKA_BROKERS?.split(',') || ['kafka:9092'],
    groupId: 'audit-consumer-group',
    clientId: 'audit-consumer'
  }
};

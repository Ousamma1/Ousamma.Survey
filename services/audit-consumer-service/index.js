/**
 * Audit Consumer Service
 * Consumes audit events and stores audit trail for compliance
 */

const express = require('express');
const { KafkaConsumer } = require('../shared/kafka');
const config = require('./config/config');
const database = require('./config/database');
const auditService = require('./services/auditService');

const app = express();
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'audit-consumer',
    timestamp: new Date().toISOString()
  });
});

// Audit log endpoints
app.get('/api/audit/logs', async (req, res) => {
  try {
    const { userId, action, resource, startDate, endDate, limit = 100 } = req.query;
    const logs = await auditService.queryLogs({
      userId,
      action,
      resource,
      startDate,
      endDate,
      limit: parseInt(limit)
    });
    res.json(logs);
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/audit/logs/:auditId', async (req, res) => {
  try {
    const { auditId } = req.params;
    const log = await auditService.getLog(auditId);
    if (!log) {
      return res.status(404).json({ error: 'Audit log not found' });
    }
    res.json(log);
  } catch (error) {
    console.error('Error fetching audit log:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/audit/compliance-report', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const report = await auditService.generateComplianceReport(startDate, endDate);
    res.json(report);
  } catch (error) {
    console.error('Error generating compliance report:', error);
    res.status(500).json({ error: error.message });
  }
});

// Initialize Kafka consumer
let consumer;

async function startConsumer() {
  try {
    consumer = new KafkaConsumer({
      groupId: 'audit-consumer-group',
      clientId: 'audit-consumer'
    });

    await consumer.connect();

    // Subscribe to audit topics
    await consumer.subscribe([
      'audit.log',
      'audit.auth',
      'audit.data',
      'survey.created',
      'survey.updated',
      'survey.deleted',
      'response.submitted',
      'response.updated',
      'response.deleted'
    ]);

    // Register event handlers
    consumer.on('audit.log', async (event) => {
      await auditService.logAuditEvent(event);
    });

    consumer.on('audit.auth', async (event) => {
      await auditService.logAuthEvent(event);
    });

    consumer.on('audit.data', async (event) => {
      await auditService.logDataAccessEvent(event);
    });

    // Auto-audit for critical operations
    consumer.on('survey.created', async (event) => {
      await auditService.autoAudit('survey_created', event);
    });

    consumer.on('survey.updated', async (event) => {
      await auditService.autoAudit('survey_updated', event);
    });

    consumer.on('survey.deleted', async (event) => {
      await auditService.autoAudit('survey_deleted', event);
    });

    consumer.on('response.submitted', async (event) => {
      await auditService.autoAudit('response_submitted', event);
    });

    consumer.on('response.updated', async (event) => {
      await auditService.autoAudit('response_updated', event);
    });

    consumer.on('response.deleted', async (event) => {
      await auditService.autoAudit('response_deleted', event);
    });

    // Start consuming
    await consumer.consume();

    console.log('✓ Audit consumer started successfully');
  } catch (error) {
    console.error('Failed to start audit consumer:', error);
    process.exit(1);
  }
}

// Graceful shutdown
async function shutdown() {
  console.log('Shutting down audit consumer...');
  if (consumer) {
    await consumer.disconnect();
  }
  await database.disconnect();
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start server
const PORT = config.port || 3005;
app.listen(PORT, async () => {
  console.log(`✓ Audit Consumer Service listening on port ${PORT}`);

  // Connect to MongoDB
  try {
    await database.connect();
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  }

  await startConsumer();
});

module.exports = app;

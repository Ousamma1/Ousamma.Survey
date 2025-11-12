const monitoringService = require('../services/monitoringService');
const SystemHealth = require('../models/SystemHealth');
const kafkaClient = require('../config/kafka');

// Get current system health
exports.getSystemHealth = async (req, res) => {
  try {
    const health = await monitoringService.getCurrentStatus();

    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    console.error('Error getting system health:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting system health',
      error: error.message
    });
  }
};

// Get service status
exports.getServicesStatus = async (req, res) => {
  try {
    const serviceHealth = await monitoringService.checkAllServices();

    res.json({
      success: true,
      data: serviceHealth
    });
  } catch (error) {
    console.error('Error getting services status:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting services status',
      error: error.message
    });
  }
};

// Get health history
exports.getHealthHistory = async (req, res) => {
  try {
    const hours = parseInt(req.query.hours) || 24;
    const history = await SystemHealth.getHistory(hours);

    res.json({
      success: true,
      data: history,
      meta: {
        hours,
        recordCount: history.length
      }
    });
  } catch (error) {
    console.error('Error getting health history:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting health history',
      error: error.message
    });
  }
};

// Get metrics summary
exports.getMetricsSummary = async (req, res) => {
  try {
    const hours = parseInt(req.query.hours) || 24;
    const summary = await SystemHealth.getMetricsSummary(hours);

    res.json({
      success: true,
      data: summary || {},
      meta: {
        hours
      }
    });
  } catch (error) {
    console.error('Error getting metrics summary:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting metrics summary',
      error: error.message
    });
  }
};

// Trigger manual health check
exports.triggerHealthCheck = async (req, res) => {
  try {
    const userId = req.userId || req.headers['x-user-id'];

    const health = await monitoringService.performHealthCheck();

    // Publish event
    await kafkaClient.publish('admin.action', {
      eventId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      eventType: 'admin.health_check_triggered',
      timestamp: new Date().toISOString(),
      userId,
      payload: {
        overallStatus: health.overallStatus
      }
    });

    res.json({
      success: true,
      message: 'Health check completed',
      data: health
    });
  } catch (error) {
    console.error('Error triggering health check:', error);
    res.status(500).json({
      success: false,
      message: 'Error triggering health check',
      error: error.message
    });
  }
};

// Simple health endpoint
exports.health = async (req, res) => {
  res.json({
    status: 'healthy',
    service: 'admin-service',
    timestamp: new Date().toISOString()
  });
};

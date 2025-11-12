const AuditLog = require('../models/AuditLog');

// Get audit logs with filtering
exports.getAuditLogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      userId,
      category,
      action,
      eventType,
      severity,
      startDate,
      endDate,
      search
    } = req.query;

    const filters = {
      userId,
      category,
      action,
      eventType,
      severity,
      startDate,
      endDate,
      search,
      page: parseInt(page),
      limit: parseInt(limit)
    };

    const result = await AuditLog.search(filters);

    res.json({
      success: true,
      data: result.logs,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error getting audit logs:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting audit logs',
      error: error.message
    });
  }
};

// Get audit log by ID
exports.getAuditLogById = async (req, res) => {
  try {
    const { id } = req.params;

    const auditLog = await AuditLog.findById(id).lean();

    if (!auditLog) {
      return res.status(404).json({
        success: false,
        message: 'Audit log not found'
      });
    }

    res.json({
      success: true,
      data: auditLog
    });
  } catch (error) {
    console.error('Error getting audit log:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting audit log',
      error: error.message
    });
  }
};

// Get audit statistics
exports.getAuditStatistics = async (req, res) => {
  try {
    const timeRange = parseInt(req.query.days) || 7;

    const statistics = await AuditLog.getStatistics(timeRange);

    res.json({
      success: true,
      data: statistics,
      meta: {
        timeRange,
        unit: 'days'
      }
    });
  } catch (error) {
    console.error('Error getting audit statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting audit statistics',
      error: error.message
    });
  }
};

// Export audit logs
exports.exportAuditLogs = async (req, res) => {
  try {
    const {
      userId,
      category,
      action,
      eventType,
      severity,
      startDate,
      endDate,
      format = 'json'
    } = req.query;

    const filters = {
      userId,
      category,
      action,
      eventType,
      severity,
      startDate,
      endDate,
      page: 1,
      limit: 10000 // Max export limit
    };

    const result = await AuditLog.search(filters);

    if (format === 'csv') {
      // Convert to CSV
      const csv = convertToCSV(result.logs);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=audit-logs.csv');
      res.send(csv);
    } else {
      // Return JSON
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=audit-logs.json');
      res.json(result.logs);
    }
  } catch (error) {
    console.error('Error exporting audit logs:', error);
    res.status(500).json({
      success: false,
      message: 'Error exporting audit logs',
      error: error.message
    });
  }
};

// Get user activity timeline
exports.getUserActivity = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      AuditLog.find({ userId })
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      AuditLog.countDocuments({ userId })
    ]);

    res.json({
      success: true,
      data: logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error getting user activity:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting user activity',
      error: error.message
    });
  }
};

// Get security events
exports.getSecurityEvents = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;

    const skip = (page - 1) * limit;

    const securityCategories = ['security', 'auth'];

    const [events, total] = await Promise.all([
      AuditLog.find({
        $or: [
          { category: { $in: securityCategories } },
          { severity: 'critical' }
        ]
      })
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      AuditLog.countDocuments({
        $or: [
          { category: { $in: securityCategories } },
          { severity: 'critical' }
        ]
      })
    ]);

    res.json({
      success: true,
      data: events,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error getting security events:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting security events',
      error: error.message
    });
  }
};

// Helper function to convert logs to CSV
function convertToCSV(logs) {
  if (logs.length === 0) {
    return 'No data';
  }

  const headers = [
    'Event ID',
    'Event Type',
    'Category',
    'Action',
    'Severity',
    'User ID',
    'Username',
    'IP Address',
    'Result',
    'Timestamp'
  ];

  const rows = logs.map(log => [
    log.eventId,
    log.eventType,
    log.category,
    log.action,
    log.severity,
    log.userId || '',
    log.username || '',
    log.ipAddress || '',
    log.result,
    log.timestamp
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  return csvContent;
}

module.exports = exports;

const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  eventId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  eventType: {
    type: String,
    required: true,
    index: true,
    // Format: category.action (e.g., user.login, survey.created, system.backup)
  },
  category: {
    type: String,
    required: true,
    enum: [
      'user', 'auth', 'survey', 'response', 'project',
      'system', 'data', 'security', 'api', 'admin'
    ],
    index: true
  },
  action: {
    type: String,
    required: true,
    index: true,
    // Examples: login, logout, create, update, delete, export, backup, restore
  },
  severity: {
    type: String,
    enum: ['info', 'warning', 'error', 'critical'],
    default: 'info',
    index: true
  },
  userId: {
    type: String,
    index: true
  },
  username: {
    type: String
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  resource: {
    type: {
      type: String // user, survey, project, setting, etc.
    },
    id: String,
    name: String
  },
  changes: {
    before: mongoose.Schema.Types.Mixed,
    after: mongoose.Schema.Types.Mixed
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  result: {
    type: String,
    enum: ['success', 'failure', 'partial'],
    default: 'success'
  },
  errorMessage: {
    type: String
  },
  duration: {
    type: Number // in milliseconds
  },
  source: {
    type: String, // service name
    default: 'admin-service'
  },
  correlationId: {
    type: String,
    index: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true,
    index: true
  }
}, {
  timestamps: false, // Using custom timestamp field
  collection: 'audit_logs'
});

// Compound indexes for common queries
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ category: 1, action: 1, timestamp: -1 });
auditLogSchema.index({ eventType: 1, timestamp: -1 });
auditLogSchema.index({ severity: 1, timestamp: -1 });
auditLogSchema.index({ timestamp: -1 });

// TTL index for automatic cleanup (365 days)
const retentionDays = parseInt(process.env.AUDIT_RETENTION_DAYS || '365');
auditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: retentionDays * 24 * 60 * 60 });

// Static method to log an event
auditLogSchema.statics.logEvent = async function(eventData) {
  try {
    const {
      eventType,
      userId,
      username,
      ipAddress,
      userAgent,
      resource,
      changes,
      metadata,
      result,
      errorMessage,
      duration,
      source,
      correlationId
    } = eventData;

    // Parse event type (category.action)
    const [category, action] = eventType.split('.');

    if (!category || !action) {
      throw new Error('Invalid eventType format. Expected: category.action');
    }

    const auditLog = new this({
      eventId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      eventType,
      category,
      action,
      severity: this.getSeverity(eventType, result),
      userId,
      username,
      ipAddress,
      userAgent,
      resource,
      changes,
      metadata,
      result: result || 'success',
      errorMessage,
      duration,
      source: source || 'admin-service',
      correlationId,
      timestamp: new Date()
    });

    await auditLog.save();
    return auditLog;
  } catch (error) {
    console.error('Error creating audit log:', error);
    throw error;
  }
};

// Helper method to determine severity
auditLogSchema.statics.getSeverity = function(eventType, result) {
  // Critical events
  const criticalEvents = [
    'security.breach', 'system.failure', 'data.corruption',
    'auth.multiple_failed_attempts', 'system.unauthorized_access'
  ];

  // Warning events
  const warningEvents = [
    'auth.failed', 'user.suspended', 'system.degraded',
    'data.validation_error', 'api.rate_limit'
  ];

  if (criticalEvents.includes(eventType) || result === 'failure') {
    return 'critical';
  }

  if (warningEvents.includes(eventType)) {
    return 'warning';
  }

  if (result === 'partial') {
    return 'warning';
  }

  return 'info';
};

// Static method for search and filter
auditLogSchema.statics.search = async function(filters = {}, options = {}) {
  const {
    userId,
    category,
    action,
    eventType,
    severity,
    startDate,
    endDate,
    search,
    page = 1,
    limit = 50
  } = filters;

  const query = {};

  if (userId) query.userId = userId;
  if (category) query.category = category;
  if (action) query.action = action;
  if (eventType) query.eventType = eventType;
  if (severity) query.severity = severity;

  // Date range filter
  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = new Date(startDate);
    if (endDate) query.timestamp.$lte = new Date(endDate);
  }

  // Text search
  if (search) {
    query.$or = [
      { username: { $regex: search, $options: 'i' } },
      { eventType: { $regex: search, $options: 'i' } },
      { 'resource.name': { $regex: search, $options: 'i' } }
    ];
  }

  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    this.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    this.countDocuments(query)
  ]);

  return {
    logs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
};

// Static method to get audit statistics
auditLogSchema.statics.getStatistics = async function(timeRange = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - timeRange);

  const stats = await this.aggregate([
    {
      $match: { timestamp: { $gte: startDate } }
    },
    {
      $facet: {
        byCategory: [
          { $group: { _id: '$category', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ],
        bySeverity: [
          { $group: { _id: '$severity', count: { $sum: 1 } } }
        ],
        byResult: [
          { $group: { _id: '$result', count: { $sum: 1 } } }
        ],
        topUsers: [
          { $match: { userId: { $exists: true } } },
          { $group: { _id: '$userId', username: { $first: '$username' }, count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 }
        ],
        recentCritical: [
          { $match: { severity: 'critical' } },
          { $sort: { timestamp: -1 } },
          { $limit: 10 }
        ],
        totalEvents: [
          { $count: 'count' }
        ]
      }
    }
  ]);

  return stats[0];
};

module.exports = mongoose.model('AuditLog', auditLogSchema);

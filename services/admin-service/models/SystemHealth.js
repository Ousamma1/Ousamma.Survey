const mongoose = require('mongoose');

const systemHealthSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now,
    required: true,
    index: true
  },
  services: [{
    name: String,
    url: String,
    status: {
      type: String,
      enum: ['healthy', 'degraded', 'unhealthy', 'unknown']
    },
    responseTime: Number, // in milliseconds
    lastCheck: Date,
    error: String
  }],
  infrastructure: {
    mongodb: {
      status: String,
      responseTime: Number,
      connections: Number,
      error: String
    },
    redis: {
      status: String,
      responseTime: Number,
      memory: Number,
      error: String
    },
    kafka: {
      status: String,
      brokers: Number,
      error: String
    }
  },
  metrics: {
    cpu: {
      usage: Number, // percentage
      cores: Number
    },
    memory: {
      total: Number, // in bytes
      used: Number,
      free: Number,
      percentage: Number
    },
    disk: {
      total: Number,
      used: Number,
      free: Number,
      percentage: Number
    }
  },
  statistics: {
    totalSurveys: Number,
    totalResponses: Number,
    totalUsers: Number,
    totalSurveyors: Number,
    activeSessions: Number,
    requestsPerMinute: Number,
    errorRate: Number
  },
  alerts: [{
    severity: {
      type: String,
      enum: ['info', 'warning', 'critical']
    },
    message: String,
    component: String,
    timestamp: Date
  }],
  overallStatus: {
    type: String,
    enum: ['healthy', 'degraded', 'unhealthy'],
    default: 'healthy'
  }
}, {
  timestamps: false,
  collection: 'system_health'
});

// TTL index - keep health records for 30 days
systemHealthSchema.index({ timestamp: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

// Static method to get latest health status
systemHealthSchema.statics.getLatest = async function() {
  return await this.findOne().sort({ timestamp: -1 });
};

// Static method to get health history
systemHealthSchema.statics.getHistory = async function(hours = 24) {
  const startDate = new Date();
  startDate.setHours(startDate.getHours() - hours);

  return await this.find({
    timestamp: { $gte: startDate }
  }).sort({ timestamp: -1 });
};

// Static method to check if system is healthy
systemHealthSchema.statics.isSystemHealthy = async function() {
  const latest = await this.getLatest();
  if (!latest) return false;

  // Check if latest check was recent (within last 5 minutes)
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  if (latest.timestamp < fiveMinutesAgo) {
    return false;
  }

  return latest.overallStatus === 'healthy';
};

// Method to calculate overall status
systemHealthSchema.methods.calculateOverallStatus = function() {
  let healthyServices = 0;
  let totalServices = this.services.length;

  // Check service health
  this.services.forEach(service => {
    if (service.status === 'healthy') {
      healthyServices++;
    }
  });

  // Check infrastructure
  const infraHealthy =
    this.infrastructure.mongodb?.status === 'connected' &&
    this.infrastructure.redis?.status === 'connected' &&
    this.infrastructure.kafka?.status === 'connected';

  // Determine overall status
  if (infraHealthy && healthyServices === totalServices) {
    this.overallStatus = 'healthy';
  } else if (infraHealthy && healthyServices >= totalServices * 0.5) {
    this.overallStatus = 'degraded';
  } else {
    this.overallStatus = 'unhealthy';
  }

  return this.overallStatus;
};

// Static method to get aggregated metrics
systemHealthSchema.statics.getMetricsSummary = async function(hours = 24) {
  const startDate = new Date();
  startDate.setHours(startDate.getHours() - hours);

  const summary = await this.aggregate([
    {
      $match: { timestamp: { $gte: startDate } }
    },
    {
      $group: {
        _id: null,
        avgCpuUsage: { $avg: '$metrics.cpu.usage' },
        maxCpuUsage: { $max: '$metrics.cpu.usage' },
        avgMemoryUsage: { $avg: '$metrics.memory.percentage' },
        maxMemoryUsage: { $max: '$metrics.memory.percentage' },
        avgResponseTime: {
          $avg: {
            $avg: '$services.responseTime'
          }
        }
      }
    }
  ]);

  return summary[0] || null;
};

module.exports = mongoose.model('SystemHealth', systemHealthSchema);

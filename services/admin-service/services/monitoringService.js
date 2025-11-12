const axios = require('axios');
const os = require('os');
const SystemHealth = require('../models/SystemHealth');
const database = require('../config/database');
const redisClient = require('../config/redis');
const kafkaClient = require('../config/kafka');

class MonitoringService {
  constructor() {
    this.services = [
      {
        name: 'Survey Service',
        url: process.env.SURVEY_SERVICE_URL || 'http://localhost:3000',
        healthPath: '/health'
      },
      {
        name: 'Geolocation Service',
        url: process.env.GEOLOCATION_SERVICE_URL || 'http://localhost:3001',
        healthPath: '/health'
      },
      {
        name: 'Analytics Service',
        url: process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3002',
        healthPath: '/health'
      },
      {
        name: 'WebSocket Service',
        url: process.env.WEBSOCKET_SERVICE_URL || 'http://localhost:3002',
        healthPath: '/health'
      },
      {
        name: 'Project Service',
        url: process.env.PROJECT_SERVICE_URL || 'http://localhost:3006',
        healthPath: '/health'
      }
    ];

    this.healthCheckInterval = parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000');
    this.intervalId = null;
  }

  // Check health of a single service
  async checkServiceHealth(service) {
    const startTime = Date.now();
    try {
      const response = await axios.get(`${service.url}${service.healthPath}`, {
        timeout: 5000,
        validateStatus: () => true
      });

      const responseTime = Date.now() - startTime;

      return {
        name: service.name,
        url: service.url,
        status: response.status === 200 ? 'healthy' : 'unhealthy',
        responseTime,
        lastCheck: new Date(),
        error: response.status !== 200 ? `HTTP ${response.status}` : null
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        name: service.name,
        url: service.url,
        status: 'unhealthy',
        responseTime,
        lastCheck: new Date(),
        error: error.message
      };
    }
  }

  // Check all services health
  async checkAllServices() {
    const healthChecks = this.services.map(service => this.checkServiceHealth(service));
    return await Promise.all(healthChecks);
  }

  // Check MongoDB health
  async checkMongoDBHealth() {
    const startTime = Date.now();
    try {
      const isConnected = database.isConnected();
      const responseTime = Date.now() - startTime;

      if (isConnected) {
        const mongoose = require('mongoose');
        const connections = mongoose.connections.length;

        return {
          status: 'connected',
          responseTime,
          connections,
          error: null
        };
      } else {
        return {
          status: 'disconnected',
          responseTime,
          connections: 0,
          error: 'Not connected'
        };
      }
    } catch (error) {
      return {
        status: 'error',
        responseTime: Date.now() - startTime,
        connections: 0,
        error: error.message
      };
    }
  }

  // Check Redis health
  async checkRedisHealth() {
    const startTime = Date.now();
    try {
      const status = redisClient.getStatus();
      const responseTime = Date.now() - startTime;

      if (status.connected) {
        // Get memory info
        let memory = 0;
        try {
          const info = await redisClient.client.info('memory');
          const memMatch = info.match(/used_memory:(\d+)/);
          if (memMatch) {
            memory = parseInt(memMatch[1]);
          }
        } catch (e) {
          // Ignore memory fetch errors
        }

        return {
          status: 'connected',
          responseTime,
          memory,
          error: null
        };
      } else {
        return {
          status: 'disconnected',
          responseTime,
          memory: 0,
          error: 'Not connected'
        };
      }
    } catch (error) {
      return {
        status: 'error',
        responseTime: Date.now() - startTime,
        memory: 0,
        error: error.message
      };
    }
  }

  // Check Kafka health
  async checkKafkaHealth() {
    try {
      const status = kafkaClient.getStatus();

      return {
        status: status.connected ? 'connected' : 'disconnected',
        brokers: status.connected ? 1 : 0,
        error: status.connected ? null : 'Not connected'
      };
    } catch (error) {
      return {
        status: 'error',
        brokers: 0,
        error: error.message
      };
    }
  }

  // Get system metrics (CPU, Memory)
  getSystemMetrics() {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;

    return {
      cpu: {
        usage: this.getCPUUsage(),
        cores: os.cpus().length
      },
      memory: {
        total: totalMemory,
        used: usedMemory,
        free: freeMemory,
        percentage: (usedMemory / totalMemory) * 100
      },
      disk: {
        // Note: Getting accurate disk info requires additional packages
        // For now, returning placeholder values
        total: 0,
        used: 0,
        free: 0,
        percentage: 0
      }
    };
  }

  // Calculate CPU usage
  getCPUUsage() {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    });

    const idle = totalIdle / cpus.length;
    const total = totalTick / cpus.length;
    const usage = 100 - (100 * idle / total);

    return parseFloat(usage.toFixed(2));
  }

  // Get system statistics (surveys, responses, users, etc.)
  async getSystemStatistics() {
    try {
      const mongoose = require('mongoose');

      // Try to get statistics from different collections
      const stats = {
        totalSurveys: 0,
        totalResponses: 0,
        totalUsers: 0,
        totalSurveyors: 0,
        activeSessions: 0,
        requestsPerMinute: 0,
        errorRate: 0
      };

      // Try to get user count
      try {
        const User = require('../models/User');
        stats.totalUsers = await User.countDocuments({ status: 'active' });
      } catch (e) {
        // User model might not have data yet
      }

      return stats;
    } catch (error) {
      console.error('Error getting system statistics:', error);
      return {
        totalSurveys: 0,
        totalResponses: 0,
        totalUsers: 0,
        totalSurveyors: 0,
        activeSessions: 0,
        requestsPerMinute: 0,
        errorRate: 0
      };
    }
  }

  // Generate alerts based on health status
  generateAlerts(healthData) {
    const alerts = [];

    // Check service health
    healthData.services.forEach(service => {
      if (service.status === 'unhealthy') {
        alerts.push({
          severity: 'critical',
          message: `Service ${service.name} is unhealthy: ${service.error}`,
          component: service.name,
          timestamp: new Date()
        });
      } else if (service.responseTime > 5000) {
        alerts.push({
          severity: 'warning',
          message: `Service ${service.name} has high response time: ${service.responseTime}ms`,
          component: service.name,
          timestamp: new Date()
        });
      }
    });

    // Check infrastructure
    if (healthData.infrastructure.mongodb.status !== 'connected') {
      alerts.push({
        severity: 'critical',
        message: 'MongoDB is not connected',
        component: 'MongoDB',
        timestamp: new Date()
      });
    }

    if (healthData.infrastructure.redis.status !== 'connected') {
      alerts.push({
        severity: 'warning',
        message: 'Redis is not connected',
        component: 'Redis',
        timestamp: new Date()
      });
    }

    if (healthData.infrastructure.kafka.status !== 'connected') {
      alerts.push({
        severity: 'warning',
        message: 'Kafka is not connected',
        component: 'Kafka',
        timestamp: new Date()
      });
    }

    // Check system resources
    if (healthData.metrics.memory.percentage > 90) {
      alerts.push({
        severity: 'critical',
        message: `High memory usage: ${healthData.metrics.memory.percentage.toFixed(2)}%`,
        component: 'System',
        timestamp: new Date()
      });
    } else if (healthData.metrics.memory.percentage > 80) {
      alerts.push({
        severity: 'warning',
        message: `Elevated memory usage: ${healthData.metrics.memory.percentage.toFixed(2)}%`,
        component: 'System',
        timestamp: new Date()
      });
    }

    if (healthData.metrics.cpu.usage > 90) {
      alerts.push({
        severity: 'critical',
        message: `High CPU usage: ${healthData.metrics.cpu.usage}%`,
        component: 'System',
        timestamp: new Date()
      });
    } else if (healthData.metrics.cpu.usage > 80) {
      alerts.push({
        severity: 'warning',
        message: `Elevated CPU usage: ${healthData.metrics.cpu.usage}%`,
        component: 'System',
        timestamp: new Date()
      });
    }

    return alerts;
  }

  // Perform complete health check
  async performHealthCheck() {
    try {
      console.log('🔍 Performing system health check...');

      const [
        serviceHealth,
        mongoHealth,
        redisHealth,
        kafkaHealth,
        systemMetrics,
        systemStats
      ] = await Promise.all([
        this.checkAllServices(),
        this.checkMongoDBHealth(),
        this.checkRedisHealth(),
        this.checkKafkaHealth(),
        Promise.resolve(this.getSystemMetrics()),
        this.getSystemStatistics()
      ]);

      const healthData = {
        timestamp: new Date(),
        services: serviceHealth,
        infrastructure: {
          mongodb: mongoHealth,
          redis: redisHealth,
          kafka: kafkaHealth
        },
        metrics: systemMetrics,
        statistics: systemStats,
        alerts: []
      };

      // Generate alerts
      healthData.alerts = this.generateAlerts(healthData);

      // Create health record
      const healthRecord = new SystemHealth(healthData);
      healthRecord.calculateOverallStatus();
      await healthRecord.save();

      console.log(`✅ Health check completed - Status: ${healthRecord.overallStatus}`);

      return healthRecord;
    } catch (error) {
      console.error('❌ Error performing health check:', error);
      throw error;
    }
  }

  // Start periodic health checks
  startPeriodicHealthChecks() {
    console.log(`🔄 Starting periodic health checks (interval: ${this.healthCheckInterval}ms)`);

    // Perform initial check
    this.performHealthCheck().catch(err => {
      console.error('Initial health check failed:', err);
    });

    // Schedule periodic checks
    this.intervalId = setInterval(() => {
      this.performHealthCheck().catch(err => {
        console.error('Periodic health check failed:', err);
      });
    }, this.healthCheckInterval);
  }

  // Stop periodic health checks
  stopPeriodicHealthChecks() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('⏹️  Stopped periodic health checks');
    }
  }

  // Get current system status
  async getCurrentStatus() {
    const latest = await SystemHealth.getLatest();
    if (!latest) {
      // No health data available, perform a check
      return await this.performHealthCheck();
    }
    return latest;
  }
}

module.exports = new MonitoringService();

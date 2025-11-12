const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const SystemHealth = require('../models/SystemHealth');
const redisClient = require('../config/redis');

const CACHE_TTL = parseInt(process.env.STATS_CACHE_TTL || '60');

// Get overall system statistics
exports.getSystemStats = async (req, res) => {
  try {
    // Try to get from cache
    const cached = await redisClient.get('stats:system');
    if (cached) {
      return res.json({
        success: true,
        data: cached,
        cached: true
      });
    }

    // Get statistics from various sources
    const [
      userStats,
      auditStats,
      healthStatus
    ] = await Promise.all([
      User.getStatistics(),
      AuditLog.getStatistics(7),
      SystemHealth.getLatest()
    ]);

    const stats = {
      users: {
        total: userStats.totalUsers?.[0]?.count || 0,
        byStatus: userStats.totalByStatus || [],
        byRole: userStats.totalByRole || [],
        recentLogins: userStats.recentLogins || []
      },
      audit: {
        totalEvents: auditStats.totalEvents?.[0]?.count || 0,
        byCategory: auditStats.byCategory || [],
        bySeverity: auditStats.bySeverity || [],
        byResult: auditStats.byResult || [],
        topUsers: auditStats.topUsers || [],
        recentCritical: auditStats.recentCritical || []
      },
      system: {
        status: healthStatus?.overallStatus || 'unknown',
        lastCheck: healthStatus?.timestamp || null,
        services: healthStatus?.services?.length || 0,
        healthyServices: healthStatus?.services?.filter(s => s.status === 'healthy').length || 0
      },
      timestamp: new Date()
    };

    // Cache the results
    await redisClient.set('stats:system', stats, CACHE_TTL);

    res.json({
      success: true,
      data: stats,
      cached: false
    });
  } catch (error) {
    console.error('Error getting system stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting system statistics',
      error: error.message
    });
  }
};

// Get user statistics
exports.getUserStats = async (req, res) => {
  try {
    const stats = await User.getStatistics();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting user stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting user statistics',
      error: error.message
    });
  }
};

// Get audit statistics
exports.getAuditStats = async (req, res) => {
  try {
    const timeRange = parseInt(req.query.days) || 7;

    const stats = await AuditLog.getStatistics(timeRange);

    res.json({
      success: true,
      data: stats,
      meta: {
        timeRange,
        unit: 'days'
      }
    });
  } catch (error) {
    console.error('Error getting audit stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting audit statistics',
      error: error.message
    });
  }
};

// Get activity overview
exports.getActivityOverview = async (req, res) => {
  try {
    const hours = parseInt(req.query.hours) || 24;
    const startDate = new Date();
    startDate.setHours(startDate.getHours() - hours);

    // Get recent activity
    const recentActivity = await AuditLog.find({
      timestamp: { $gte: startDate }
    })
      .sort({ timestamp: -1 })
      .limit(50)
      .select('eventType category action userId username timestamp result')
      .lean();

    // Get activity counts by hour
    const activityByHour = await AuditLog.aggregate([
      {
        $match: { timestamp: { $gte: startDate } }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d %H:00',
              date: '$timestamp'
            }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    res.json({
      success: true,
      data: {
        recentActivity,
        activityByHour,
        totalEvents: recentActivity.length
      },
      meta: {
        hours,
        startDate
      }
    });
  } catch (error) {
    console.error('Error getting activity overview:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting activity overview',
      error: error.message
    });
  }
};

// Get dashboard summary
exports.getDashboardSummary = async (req, res) => {
  try {
    // Try to get from cache
    const cached = await redisClient.get('stats:dashboard');
    if (cached) {
      return res.json({
        success: true,
        data: cached,
        cached: true
      });
    }

    const [
      userStats,
      healthStatus,
      recentAuditLogs
    ] = await Promise.all([
      User.getStatistics(),
      SystemHealth.getLatest(),
      AuditLog.find()
        .sort({ timestamp: -1 })
        .limit(10)
        .select('eventType category action userId username timestamp severity')
        .lean()
    ]);

    const summary = {
      users: {
        total: userStats.totalUsers?.[0]?.count || 0,
        active: userStats.totalByStatus?.find(s => s._id === 'active')?.count || 0,
        inactive: userStats.totalByStatus?.find(s => s._id === 'inactive')?.count || 0
      },
      system: {
        status: healthStatus?.overallStatus || 'unknown',
        lastCheck: healthStatus?.timestamp || null,
        cpu: healthStatus?.metrics?.cpu?.usage || 0,
        memory: healthStatus?.metrics?.memory?.percentage || 0,
        alerts: healthStatus?.alerts?.length || 0
      },
      recentActivity: recentAuditLogs,
      timestamp: new Date()
    };

    // Cache for 60 seconds
    await redisClient.set('stats:dashboard', summary, 60);

    res.json({
      success: true,
      data: summary,
      cached: false
    });
  } catch (error) {
    console.error('Error getting dashboard summary:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting dashboard summary',
      error: error.message
    });
  }
};

// Clear statistics cache
exports.clearStatsCache = async (req, res) => {
  try {
    await redisClient.delPattern('stats:*');

    res.json({
      success: true,
      message: 'Statistics cache cleared'
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({
      success: false,
      message: 'Error clearing cache',
      error: error.message
    });
  }
};

module.exports = exports;

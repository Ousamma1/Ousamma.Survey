const SurveyAnalytics = require('../models/SurveyAnalytics');
const QuestionAnalytics = require('../models/QuestionAnalytics');
const ResponseEvent = require('../models/ResponseEvent');
const AggregationService = require('../services/aggregationService');
const CacheService = require('../services/cacheService');
const ExportService = require('../services/exportService');
const Statistics = require('../utils/statistics');

/**
 * Analytics Controller
 * Handles all analytics-related requests
 */
class AnalyticsController {
  /**
   * Get survey analytics
   * GET /analytics/survey/:id
   */
  static async getSurveyAnalytics(req, res) {
    try {
      const { id } = req.params;

      // Try to get from cache first
      let analytics = await CacheService.getSurveyAnalytics(id);

      if (!analytics) {
        // Fetch from database
        analytics = await SurveyAnalytics.findBySurveyId(id);

        if (!analytics) {
          return res.status(404).json({
            success: false,
            message: 'Survey analytics not found'
          });
        }

        // Cache the result
        await CacheService.setSurveyAnalytics(id, analytics);
      }

      // Increment access count for adaptive caching
      const cacheKey = CacheService.constructor.generateKey('survey_analytics', id);
      await CacheService.incrementAccessCount(cacheKey);

      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      console.error('Error getting survey analytics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get survey analytics',
        error: error.message
      });
    }
  }

  /**
   * Get question-level analytics
   * GET /analytics/survey/:id/questions
   */
  static async getQuestionAnalytics(req, res) {
    try {
      const { id } = req.params;
      const { questionId } = req.query;

      // Try to get from cache first
      let analytics = await CacheService.getQuestionAnalytics(id, questionId);

      if (!analytics) {
        // Fetch from database
        if (questionId) {
          analytics = await QuestionAnalytics.findByQuestion(id, questionId);
        } else {
          analytics = await QuestionAnalytics.findBySurvey(id);
        }

        if (!analytics) {
          return res.status(404).json({
            success: false,
            message: 'Question analytics not found'
          });
        }

        // Cache the result
        await CacheService.setQuestionAnalytics(id, analytics, questionId);
      }

      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      console.error('Error getting question analytics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get question analytics',
        error: error.message
      });
    }
  }

  /**
   * Get real-time stats
   * GET /analytics/survey/:id/realtime
   */
  static async getRealtimeStats(req, res) {
    try {
      const { id } = req.params;

      // Try to get from cache first (short TTL)
      let stats = await CacheService.getRealtimeStats(id);

      if (!stats) {
        // Calculate real-time stats
        const analytics = await SurveyAnalytics.findBySurveyId(id);
        const recentResponses = await ResponseEvent.find({ surveyId: id })
          .sort({ timestamp: -1 })
          .limit(10);

        stats = {
          surveyId: id,
          totalResponses: analytics?.totalResponses || 0,
          completionRate: analytics?.completionRate || 0,
          recentResponses: recentResponses.length,
          lastResponseTime: recentResponses[0]?.timestamp || null,
          responsesLast24Hours: await this.getResponsesInTimeRange(id, 24),
          responsesLastHour: await this.getResponsesInTimeRange(id, 1),
          currentTrend: await this.calculateTrend(id),
          timestamp: new Date()
        };

        // Cache with short TTL (5 minutes)
        await CacheService.setRealtimeStats(id, stats);
      }

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error getting realtime stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get realtime stats',
        error: error.message
      });
    }
  }

  /**
   * Export analytics
   * GET /analytics/survey/:id/export
   */
  static async exportAnalytics(req, res) {
    try {
      const { id } = req.params;
      const { format = 'json' } = req.query;

      // Get analytics data
      const surveyAnalytics = await SurveyAnalytics.findBySurveyId(id);
      const questionAnalytics = await QuestionAnalytics.findBySurvey(id);

      if (!surveyAnalytics) {
        return res.status(404).json({
          success: false,
          message: 'Survey analytics not found'
        });
      }

      // Export to requested format
      const exportData = await ExportService.exportDetailedReport(
        surveyAnalytics,
        questionAnalytics,
        format
      );

      const formatted = ExportService.formatForDownload(
        exportData,
        format,
        `survey_${id}_analytics`
      );

      res.setHeader('Content-Type', formatted.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${formatted.filename}"`);
      res.send(formatted.data);
    } catch (error) {
      console.error('Error exporting analytics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to export analytics',
        error: error.message
      });
    }
  }

  /**
   * Get group analytics
   * GET /analytics/group/:id
   */
  static async getGroupAnalytics(req, res) {
    try {
      const { id } = req.params;

      // Try to get from cache
      let analytics = await CacheService.getGroupAnalytics(id);

      if (!analytics) {
        // This would need to be implemented based on your group structure
        // For now, returning a placeholder
        analytics = {
          groupId: id,
          message: 'Group analytics endpoint - implementation depends on group structure'
        };

        await CacheService.setGroupAnalytics(id, analytics);
      }

      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      console.error('Error getting group analytics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get group analytics',
        error: error.message
      });
    }
  }

  /**
   * Compare surveys
   * GET /analytics/compare
   */
  static async compareSurveys(req, res) {
    try {
      const { surveyIds } = req.query;

      if (!surveyIds) {
        return res.status(400).json({
          success: false,
          message: 'Survey IDs are required'
        });
      }

      const ids = surveyIds.split(',');
      const comparisons = [];

      for (const id of ids) {
        const analytics = await SurveyAnalytics.findBySurveyId(id);
        if (analytics) {
          comparisons.push({
            surveyId: id,
            totalResponses: analytics.totalResponses,
            completionRate: analytics.completionRate,
            averageTime: analytics.averageTime,
            responsesPerDay: analytics.responsesPerDay
          });
        }
      }

      res.json({
        success: true,
        data: {
          surveys: comparisons,
          comparison: {
            avgResponses: Statistics.mean(comparisons.map(c => c.totalResponses)),
            avgCompletionRate: Statistics.mean(comparisons.map(c => c.completionRate)),
            avgTime: Statistics.mean(comparisons.map(c => c.averageTime))
          }
        }
      });
    } catch (error) {
      console.error('Error comparing surveys:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to compare surveys',
        error: error.message
      });
    }
  }

  /**
   * Custom analytics query
   * POST /analytics/custom
   */
  static async customQuery(req, res) {
    try {
      const { surveyId, startDate, endDate, metrics, filters } = req.body;

      if (!surveyId) {
        return res.status(400).json({
          success: false,
          message: 'Survey ID is required'
        });
      }

      // Build query based on filters
      let query = { surveyId };

      if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) query.timestamp.$gte = new Date(startDate);
        if (endDate) query.timestamp.$lte = new Date(endDate);
      }

      // Apply additional filters
      if (filters) {
        Object.assign(query, filters);
      }

      // Fetch responses
      const responses = await ResponseEvent.find(query);

      // Calculate requested metrics
      const result = {
        surveyId,
        responseCount: responses.length,
        metrics: {}
      };

      if (metrics && Array.isArray(metrics)) {
        if (metrics.includes('completionRate')) {
          const completed = responses.filter(r => r.isComplete).length;
          result.metrics.completionRate = (completed / responses.length) * 100;
        }
        if (metrics.includes('averageTime')) {
          const times = responses.map(r => r.completionTime).filter(t => t > 0);
          result.metrics.averageTime = Statistics.mean(times);
        }
        if (metrics.includes('locationDistribution')) {
          result.metrics.locationDistribution = {};
          responses.forEach(r => {
            if (r.location?.country) {
              result.metrics.locationDistribution[r.location.country] =
                (result.metrics.locationDistribution[r.location.country] || 0) + 1;
            }
          });
        }
      }

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error executing custom query:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to execute custom query',
        error: error.message
      });
    }
  }

  /**
   * Helper: Get responses in time range (hours)
   */
  static async getResponsesInTimeRange(surveyId, hours) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    const count = await ResponseEvent.countDocuments({
      surveyId,
      timestamp: { $gte: since }
    });
    return count;
  }

  /**
   * Helper: Calculate response trend
   */
  static async calculateTrend(surveyId) {
    const last24h = await this.getResponsesInTimeRange(surveyId, 24);
    const previous24h = await ResponseEvent.countDocuments({
      surveyId,
      timestamp: {
        $gte: new Date(Date.now() - 48 * 60 * 60 * 1000),
        $lt: new Date(Date.now() - 24 * 60 * 60 * 1000)
      }
    });

    if (previous24h === 0) return 'new';
    const change = ((last24h - previous24h) / previous24h) * 100;

    if (change > 10) return 'increasing';
    if (change < -10) return 'decreasing';
    return 'stable';
  }
}

module.exports = AnalyticsController;

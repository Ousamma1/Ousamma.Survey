const SurveyAnalytics = require('../models/SurveyAnalytics');
const QuestionAnalytics = require('../models/QuestionAnalytics');
const ResponseEvent = require('../models/ResponseEvent');
const Statistics = require('../utils/statistics');

/**
 * Aggregation Service
 * Handles real-time aggregation of analytics data
 */
class AggregationService {
  /**
   * Process a new response event
   */
  static async processResponse(responseData) {
    try {
      const { surveyId, responseId, responses, metadata, location, completionTime, isComplete, userId } = responseData;

      // Save response event
      const responseEvent = new ResponseEvent({
        surveyId,
        responseId,
        userId,
        responses,
        metadata,
        location,
        completionTime,
        isComplete,
        timestamp: new Date()
      });
      await responseEvent.save();

      // Update survey-level analytics
      await this.updateSurveyAnalytics(surveyId, {
        completionTime,
        isComplete,
        metadata,
        location
      });

      // Update question-level analytics
      await this.updateQuestionAnalytics(surveyId, responses);

      return { success: true };
    } catch (error) {
      console.error('Error processing response:', error);
      throw error;
    }
  }

  /**
   * Update survey-level analytics
   */
  static async updateSurveyAnalytics(surveyId, data) {
    try {
      let analytics = await SurveyAnalytics.findBySurveyId(surveyId);

      if (!analytics) {
        analytics = new SurveyAnalytics({ surveyId });
      }

      // Increment total responses
      analytics.incrementResponses();

      // Update completion rate
      if (data.isComplete) {
        const completedCount = await ResponseEvent.countDocuments({ surveyId, isComplete: true });
        analytics.calculateCompletionRate(completedCount);
      }

      // Update average time
      if (data.completionTime) {
        const totalTime = analytics.averageTime * (analytics.totalResponses - 1) + data.completionTime;
        analytics.averageTime = Math.round(totalTime / analytics.totalResponses);
      }

      // Update device distribution
      if (data.metadata?.device) {
        const deviceType = data.metadata.device.toLowerCase();
        if (analytics.deviceDistribution[deviceType] !== undefined) {
          analytics.deviceDistribution[deviceType]++;
        }
      }

      // Update location distribution
      if (data.location?.country) {
        if (!analytics.locationDistribution[data.location.country]) {
          analytics.locationDistribution[data.location.country] = 0;
        }
        analytics.locationDistribution[data.location.country]++;
        analytics.markModified('locationDistribution');
      }

      // Update time-based trends
      const now = new Date();
      const hour = now.getHours();
      const day = now.toISOString().split('T')[0];
      const week = this.getWeekNumber(now);

      if (!analytics.timeBasedTrends.hourly) analytics.timeBasedTrends.hourly = new Map();
      if (!analytics.timeBasedTrends.daily) analytics.timeBasedTrends.daily = new Map();
      if (!analytics.timeBasedTrends.weekly) analytics.timeBasedTrends.weekly = new Map();

      analytics.timeBasedTrends.hourly.set(String(hour), (analytics.timeBasedTrends.hourly.get(String(hour)) || 0) + 1);
      analytics.timeBasedTrends.daily.set(day, (analytics.timeBasedTrends.daily.get(day) || 0) + 1);
      analytics.timeBasedTrends.weekly.set(String(week), (analytics.timeBasedTrends.weekly.get(String(week)) || 0) + 1);

      await analytics.save();
      return analytics;
    } catch (error) {
      console.error('Error updating survey analytics:', error);
      throw error;
    }
  }

  /**
   * Update question-level analytics
   */
  static async updateQuestionAnalytics(surveyId, responses) {
    try {
      for (const [questionId, answer] of Object.entries(responses)) {
        let analytics = await QuestionAnalytics.findByQuestion(surveyId, questionId);

        if (!analytics) {
          analytics = new QuestionAnalytics({
            surveyId,
            questionId,
            questionType: this.detectQuestionType(answer)
          });
        }

        // Increment response count
        analytics.incrementResponses();

        // Update value distribution
        analytics.updateDistribution(answer);

        // Calculate statistics for numeric values
        if (typeof answer === 'number') {
          const allResponses = await ResponseEvent.find({ surveyId });
          const values = allResponses
            .map(r => r.responses[questionId])
            .filter(v => typeof v === 'number');

          if (values.length > 0) {
            analytics.statistics.mean = Statistics.mean(values);
            analytics.statistics.median = Statistics.median(values);
            analytics.statistics.mode = Statistics.mode(values);
            analytics.statistics.stdDev = Statistics.standardDeviation(values);
            analytics.statistics.variance = Statistics.variance(values);
            analytics.statistics.min = Statistics.min(values);
            analytics.statistics.max = Statistics.max(values);
            analytics.statistics.percentiles = Statistics.percentiles(values);
          }
        }

        // Update text analytics for text responses
        if (typeof answer === 'string') {
          const words = answer.split(/\s+/).filter(w => w.length > 0);
          analytics.textAnalytics.averageLength =
            ((analytics.textAnalytics.averageLength * (analytics.responseCount - 1)) + answer.length) / analytics.responseCount;
          analytics.textAnalytics.totalWords += words.length;

          // Update common words
          words.forEach(word => {
            const lowerWord = word.toLowerCase();
            analytics.textAnalytics.commonWords.set(
              lowerWord,
              (analytics.textAnalytics.commonWords.get(lowerWord) || 0) + 1
            );
          });
        }

        await analytics.save();
      }
    } catch (error) {
      console.error('Error updating question analytics:', error);
      throw error;
    }
  }

  /**
   * Calculate drop-off points
   */
  static async calculateDropOffPoints(surveyId) {
    try {
      const allResponses = await ResponseEvent.find({ surveyId });
      const incompleteResponses = allResponses.filter(r => !r.isComplete);

      const dropOffCounts = {};

      incompleteResponses.forEach(response => {
        const answeredQuestions = Object.keys(response.responses);
        const lastQuestion = answeredQuestions[answeredQuestions.length - 1];
        if (lastQuestion) {
          dropOffCounts[lastQuestion] = (dropOffCounts[lastQuestion] || 0) + 1;
        }
      });

      const dropOffPoints = Object.entries(dropOffCounts).map(([questionId, count]) => ({
        questionId,
        count,
        percentage: (count / allResponses.length) * 100
      }));

      // Update survey analytics with drop-off points
      const analytics = await SurveyAnalytics.findBySurveyId(surveyId);
      if (analytics) {
        analytics.dropOffPoints = dropOffPoints;
        await analytics.save();
      }

      return dropOffPoints;
    } catch (error) {
      console.error('Error calculating drop-off points:', error);
      throw error;
    }
  }

  /**
   * Aggregate analytics for a time range
   */
  static async aggregateTimeRange(surveyId, startDate, endDate) {
    try {
      const responses = await ResponseEvent.findByDateRange(surveyId, startDate, endDate);

      const aggregated = {
        totalResponses: responses.length,
        completedResponses: responses.filter(r => r.isComplete).length,
        averageTime: Statistics.mean(responses.map(r => r.completionTime).filter(t => t > 0)),
        locationDistribution: {},
        deviceDistribution: { desktop: 0, mobile: 0, tablet: 0 },
        timeDistribution: {}
      };

      responses.forEach(response => {
        // Location
        if (response.location?.country) {
          aggregated.locationDistribution[response.location.country] =
            (aggregated.locationDistribution[response.location.country] || 0) + 1;
        }

        // Device
        if (response.metadata?.device) {
          const device = response.metadata.device.toLowerCase();
          if (aggregated.deviceDistribution[device] !== undefined) {
            aggregated.deviceDistribution[device]++;
          }
        }

        // Time
        const hour = new Date(response.timestamp).getHours();
        aggregated.timeDistribution[hour] = (aggregated.timeDistribution[hour] || 0) + 1;
      });

      aggregated.completionRate = aggregated.totalResponses > 0
        ? (aggregated.completedResponses / aggregated.totalResponses) * 100
        : 0;

      return aggregated;
    } catch (error) {
      console.error('Error aggregating time range:', error);
      throw error;
    }
  }

  /**
   * Detect question type from answer
   */
  static detectQuestionType(answer) {
    if (typeof answer === 'number') return 'number';
    if (typeof answer === 'boolean') return 'boolean';
    if (answer instanceof Date) return 'date';
    if (typeof answer === 'string') {
      if (answer.length > 100) return 'text';
      return 'multiple_choice';
    }
    return 'text';
  }

  /**
   * Get week number
   */
  static getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  }
}

module.exports = AggregationService;

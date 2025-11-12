/**
 * Analytics Service
 * Processes events and generates analytics
 */

const cacheService = require('./cacheService');
const { getProducer } = require('../../shared/kafka');
const { createEvent } = require('../../shared/kafka/schemas');

class AnalyticsService {
  constructor() {
    this.analyticsStore = new Map(); // In-memory store (replace with DB in production)
    this.producer = null;
  }

  /**
   * Initialize Kafka producer
   */
  async initProducer() {
    if (!this.producer) {
      this.producer = getProducer();
      await this.producer.connect();
    }
  }

  /**
   * Initialize analytics for a new survey
   */
  async initializeSurveyAnalytics(event) {
    const { surveyId } = event;

    const analytics = {
      surveyId,
      createdAt: event.timestamp,
      totalResponses: 0,
      completedResponses: 0,
      partialResponses: 0,
      averageCompletionTime: 0,
      responsesByDay: {},
      questionAnalytics: {},
      demographicBreakdown: {},
      locationData: [],
      lastUpdated: new Date()
    };

    this.analyticsStore.set(surveyId, analytics);
    await cacheService.set(`analytics:${surveyId}`, analytics);

    console.log(`✓ Initialized analytics for survey: ${surveyId}`);
  }

  /**
   * Mark survey as published
   */
  async markSurveyPublished(event) {
    const { surveyId } = event;
    const analytics = this.analyticsStore.get(surveyId) || {};

    analytics.publishedAt = event.timestamp;
    analytics.status = 'published';

    this.analyticsStore.set(surveyId, analytics);
    await cacheService.set(`analytics:${surveyId}`, analytics);

    console.log(`✓ Marked survey as published: ${surveyId}`);
  }

  /**
   * Process response submitted event
   */
  async processResponseSubmitted(event) {
    try {
      const { surveyId, responseId, payload, location } = event;

      // Get current analytics
      let analytics = this.analyticsStore.get(surveyId) || await this.getAnalytics(surveyId);

      if (!analytics) {
        // Initialize if not exists
        analytics = {
          surveyId,
          totalResponses: 0,
          completedResponses: 0,
          partialResponses: 0,
          averageCompletionTime: 0,
          responsesByDay: {},
          questionAnalytics: {},
          demographicBreakdown: {},
          locationData: [],
          lastUpdated: new Date()
        };
      }

      // Update counts
      analytics.totalResponses++;
      analytics.completedResponses++;

      // Update completion time
      if (payload.completionTime) {
        const totalTime = analytics.averageCompletionTime * (analytics.totalResponses - 1);
        analytics.averageCompletionTime = (totalTime + payload.completionTime) / analytics.totalResponses;
      }

      // Update responses by day
      const day = new Date(event.timestamp).toISOString().split('T')[0];
      analytics.responsesByDay[day] = (analytics.responsesByDay[day] || 0) + 1;

      // Process question analytics
      if (payload.answers) {
        this.processQuestionAnalytics(analytics, payload.answers);
      }

      // Add location data
      if (location && location.length === 2) {
        analytics.locationData.push({
          responseId,
          coordinates: location,
          timestamp: event.timestamp
        });
      }

      // Update metadata
      if (payload.metadata) {
        this.updateDemographicBreakdown(analytics, payload.metadata);
      }

      analytics.lastUpdated = new Date();

      // Store updated analytics
      this.analyticsStore.set(surveyId, analytics);
      await cacheService.set(`analytics:${surveyId}`, analytics, 300); // 5 min TTL

      // Publish analytics update event
      await this.publishAnalyticsUpdate(surveyId, analytics);

      console.log(`✓ Processed response analytics for survey: ${surveyId}`);
    } catch (error) {
      console.error('Error processing response submitted:', error);
      throw error;
    }
  }

  /**
   * Process response updated event
   */
  async processResponseUpdated(event) {
    try {
      const { surveyId, responseId, payload } = event;

      let analytics = this.analyticsStore.get(surveyId) || await this.getAnalytics(surveyId);

      if (!analytics) {
        console.warn(`No analytics found for survey: ${surveyId}`);
        return;
      }

      // Recalculate question analytics if answers changed
      if (payload.changes && payload.changes.answers) {
        this.processQuestionAnalytics(analytics, payload.newAnswers);
      }

      analytics.lastUpdated = new Date();

      this.analyticsStore.set(surveyId, analytics);
      await cacheService.set(`analytics:${surveyId}`, analytics, 300);

      await this.publishAnalyticsUpdate(surveyId, analytics);

      console.log(`✓ Updated analytics for response: ${responseId}`);
    } catch (error) {
      console.error('Error processing response updated:', error);
      throw error;
    }
  }

  /**
   * Process response deleted event
   */
  async processResponseDeleted(event) {
    try {
      const { surveyId, responseId } = event;

      let analytics = this.analyticsStore.get(surveyId) || await this.getAnalytics(surveyId);

      if (!analytics) {
        console.warn(`No analytics found for survey: ${surveyId}`);
        return;
      }

      // Decrement counts
      if (analytics.totalResponses > 0) {
        analytics.totalResponses--;
        analytics.completedResponses--;
      }

      // Remove location data
      analytics.locationData = analytics.locationData.filter(
        loc => loc.responseId !== responseId
      );

      analytics.lastUpdated = new Date();

      this.analyticsStore.set(surveyId, analytics);
      await cacheService.set(`analytics:${surveyId}`, analytics, 300);

      await this.publishAnalyticsUpdate(surveyId, analytics);

      console.log(`✓ Removed response from analytics: ${responseId}`);
    } catch (error) {
      console.error('Error processing response deleted:', error);
      throw error;
    }
  }

  /**
   * Process question-level analytics
   */
  processQuestionAnalytics(analytics, answers) {
    if (!analytics.questionAnalytics) {
      analytics.questionAnalytics = {};
    }

    for (const [questionId, answer] of Object.entries(answers)) {
      if (!analytics.questionAnalytics[questionId]) {
        analytics.questionAnalytics[questionId] = {
          totalResponses: 0,
          answerDistribution: {},
          averageRating: null,
          textResponses: []
        };
      }

      const qAnalytics = analytics.questionAnalytics[questionId];
      qAnalytics.totalResponses++;

      // Handle different answer types
      if (typeof answer === 'string' || typeof answer === 'number') {
        // Multiple choice, scale, or short answer
        if (typeof answer === 'number') {
          // Calculate average for numeric ratings
          const currentTotal = (qAnalytics.averageRating || 0) * (qAnalytics.totalResponses - 1);
          qAnalytics.averageRating = (currentTotal + answer) / qAnalytics.totalResponses;
        } else {
          // Count answer distribution
          qAnalytics.answerDistribution[answer] = (qAnalytics.answerDistribution[answer] || 0) + 1;
        }

        // Store text responses (limit to 100)
        if (typeof answer === 'string' && qAnalytics.textResponses.length < 100) {
          qAnalytics.textResponses.push(answer);
        }
      } else if (Array.isArray(answer)) {
        // Multiple selection
        answer.forEach(option => {
          qAnalytics.answerDistribution[option] = (qAnalytics.answerDistribution[option] || 0) + 1;
        });
      }
    }
  }

  /**
   * Update demographic breakdown
   */
  updateDemographicBreakdown(analytics, metadata) {
    if (!analytics.demographicBreakdown) {
      analytics.demographicBreakdown = {};
    }

    // Process demographic fields
    ['age', 'gender', 'location', 'device'].forEach(field => {
      if (metadata[field]) {
        if (!analytics.demographicBreakdown[field]) {
          analytics.demographicBreakdown[field] = {};
        }
        const value = metadata[field];
        analytics.demographicBreakdown[field][value] =
          (analytics.demographicBreakdown[field][value] || 0) + 1;
      }
    });
  }

  /**
   * Publish analytics update event
   */
  async publishAnalyticsUpdate(surveyId, analytics) {
    try {
      await this.initProducer();

      const event = createEvent('analytics.update', {
        entityId: surveyId,
        entityType: 'survey',
        payload: {
          metrics: {
            totalResponses: analytics.totalResponses,
            completedResponses: analytics.completedResponses,
            averageCompletionTime: analytics.averageCompletionTime
          },
          aggregations: {
            responsesByDay: analytics.responsesByDay,
            questionAnalytics: analytics.questionAnalytics
          },
          insights: this.generateInsights(analytics)
        }
      }, {
        source: 'analytics-consumer'
      });

      await this.producer.sendEvent('analytics.update', event);
    } catch (error) {
      console.error('Error publishing analytics update:', error);
    }
  }

  /**
   * Generate insights from analytics
   */
  generateInsights(analytics) {
    const insights = [];

    // Response rate insight
    if (analytics.totalResponses > 100) {
      insights.push({
        type: 'response_rate',
        severity: 'info',
        message: `Survey has received ${analytics.totalResponses} responses`
      });
    }

    // Completion time insight
    if (analytics.averageCompletionTime > 300) { // 5 minutes
      insights.push({
        type: 'completion_time',
        severity: 'warning',
        message: `Average completion time is ${Math.round(analytics.averageCompletionTime / 60)} minutes`
      });
    }

    // Question analytics insights
    for (const [questionId, qAnalytics] of Object.entries(analytics.questionAnalytics || {})) {
      if (qAnalytics.averageRating && qAnalytics.averageRating < 3) {
        insights.push({
          type: 'low_rating',
          severity: 'warning',
          questionId,
          message: `Question ${questionId} has low average rating: ${qAnalytics.averageRating.toFixed(2)}`
        });
      }
    }

    return insights;
  }

  /**
   * Get analytics for a survey
   */
  async getAnalytics(surveyId) {
    // Try cache first
    let analytics = await cacheService.get(`analytics:${surveyId}`);

    if (!analytics) {
      // Try in-memory store
      analytics = this.analyticsStore.get(surveyId);
    }

    return analytics;
  }
}

module.exports = new AnalyticsService();

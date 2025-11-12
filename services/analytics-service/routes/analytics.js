const express = require('express');
const router = express.Router();
const AnalyticsController = require('../controllers/analyticsController');

/**
 * Analytics Routes
 */

// Survey analytics
router.get('/survey/:id', AnalyticsController.getSurveyAnalytics);

// Question-level analytics
router.get('/survey/:id/questions', AnalyticsController.getQuestionAnalytics);

// Real-time stats
router.get('/survey/:id/realtime', AnalyticsController.getRealtimeStats);

// Export analytics
router.get('/survey/:id/export', AnalyticsController.exportAnalytics);

// Group analytics
router.get('/group/:id', AnalyticsController.getGroupAnalytics);

// Compare surveys
router.get('/compare', AnalyticsController.compareSurveys);

// Custom analytics query
router.post('/custom', AnalyticsController.customQuery);

module.exports = router;

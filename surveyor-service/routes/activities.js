const express = require('express');
const router = express.Router();
const activityController = require('../controllers/activityController');
const { body, param } = require('express-validator');
const { validateRequest } = require('../middleware/validation');

// Validation middleware
const logActivityValidation = [
  body('surveyorId').notEmpty().withMessage('Surveyor ID is required'),
  body('activityType')
    .notEmpty()
    .withMessage('Activity type is required')
    .isIn(['login', 'logout', 'location_checkin', 'response_submission', 'survey_view', 'profile_update', 'password_change', 'assignment_view'])
    .withMessage('Invalid activity type'),
  body('location').optional().isObject(),
  body('location.latitude').optional().isFloat({ min: -90, max: 90 }),
  body('location.longitude').optional().isFloat({ min: -180, max: 180 }),
  validateRequest
];

// Routes
router.post('/', logActivityValidation, activityController.logActivity);
router.get('/', activityController.getAllActivities);
router.get('/surveyor/:id', activityController.getSurveyorActivities);
router.get('/surveyor/:id/daily-summary', activityController.getDailySummary);
router.get('/surveyor/:id/locations', activityController.getResponseLocations);
router.get('/surveyor/:id/stats', activityController.getActivityStats);

module.exports = router;

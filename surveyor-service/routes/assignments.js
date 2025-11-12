const express = require('express');
const router = express.Router();
const assignmentController = require('../controllers/assignmentController');
const { body, param, query } = require('express-validator');
const { validateRequest } = require('../middleware/validation');

// Validation middleware
const assignSurveyValidation = [
  body('surveyorId').notEmpty().withMessage('Surveyor ID is required'),
  body('surveyId').notEmpty().withMessage('Survey ID is required'),
  body('targetResponses').isInt({ min: 1 }).withMessage('Target responses must be a positive integer'),
  body('endDate').notEmpty().withMessage('End date is required').isISO8601().withMessage('End date must be a valid date'),
  body('territoryId').optional().trim(),
  body('startDate').optional().isISO8601().withMessage('Start date must be a valid date'),
  validateRequest
];

const bulkAssignValidation = [
  body('assignments').isArray({ min: 1 }).withMessage('Assignments must be a non-empty array'),
  body('assignments.*.surveyorId').notEmpty().withMessage('Each assignment must have a surveyor ID'),
  body('assignments.*.surveyId').notEmpty().withMessage('Each assignment must have a survey ID'),
  body('assignments.*.targetResponses').isInt({ min: 1 }).withMessage('Target responses must be a positive integer'),
  body('assignments.*.endDate').notEmpty().withMessage('Each assignment must have an end date'),
  validateRequest
];

const recordResponseValidation = [
  param('id').notEmpty().withMessage('Assignment ID is required'),
  body('count').optional().isInt({ min: 1 }).withMessage('Count must be a positive integer'),
  validateRequest
];

// Routes
router.post('/', assignSurveyValidation, assignmentController.assignSurvey);
router.post('/bulk', bulkAssignValidation, assignmentController.bulkAssign);
router.get('/', assignmentController.getAllAssignments);
router.get('/stats', assignmentController.getAssignmentStats);
router.get('/:id', assignmentController.getAssignmentById);
router.put('/:id', assignmentController.updateAssignment);
router.post('/:id/activate', assignmentController.activateAssignment);
router.post('/:id/cancel', assignmentController.cancelAssignment);
router.post('/:id/record-response', recordResponseValidation, assignmentController.recordResponse);

module.exports = router;

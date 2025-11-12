const express = require('express');
const router = express.Router();
const surveyorController = require('../controllers/surveyorController');
const { body, param, query } = require('express-validator');
const { validateRequest } = require('../middleware/validation');

// Validation middleware
const createSurveyorValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('phone').trim().notEmpty().withMessage('Phone is required'),
  body('assignedTerritories').optional().isArray(),
  body('region').optional().trim(),
  body('languages').optional().isArray(),
  body('expirationDays').optional().isInt({ min: 1 }).withMessage('Expiration days must be a positive integer'),
  validateRequest
];

const updateSurveyorValidation = [
  param('id').notEmpty().withMessage('Surveyor ID is required'),
  body('name').optional().trim().notEmpty(),
  body('email').optional().isEmail(),
  body('phone').optional().trim().notEmpty(),
  body('status').optional().isIn(['active', 'inactive', 'expired']),
  validateRequest
];

const extendExpirationValidation = [
  param('id').notEmpty().withMessage('Surveyor ID is required'),
  body('days').isInt({ min: 1 }).withMessage('Days must be a positive integer'),
  validateRequest
];

const bulkImportValidation = [
  body('surveyors').isArray({ min: 1 }).withMessage('Surveyors must be a non-empty array'),
  body('surveyors.*.name').notEmpty().withMessage('Each surveyor must have a name'),
  body('surveyors.*.email').isEmail().withMessage('Each surveyor must have a valid email'),
  body('surveyors.*.phone').notEmpty().withMessage('Each surveyor must have a phone'),
  validateRequest
];

// Routes
router.post('/', createSurveyorValidation, surveyorController.createSurveyor);
router.post('/bulk', bulkImportValidation, surveyorController.bulkImport);
router.get('/', surveyorController.getSurveyors);
router.get('/:id', surveyorController.getSurveyorById);
router.put('/:id', updateSurveyorValidation, surveyorController.updateSurveyor);
router.delete('/:id', surveyorController.deactivateSurveyor);
router.post('/:id/extend', extendExpirationValidation, surveyorController.extendExpiration);
router.get('/:id/performance', surveyorController.getPerformance);
router.post('/:id/reset-password', surveyorController.resetPassword);

module.exports = router;

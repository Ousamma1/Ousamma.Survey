const express = require('express');
const router = express.Router();
const surveyController = require('../controllers/surveyController');

/**
 * Survey Routes - Advanced Features
 */

// Survey CRUD
router.post('/', surveyController.createSurvey);
router.get('/', surveyController.listSurveys);
router.get('/:identifier', surveyController.getSurvey);
router.put('/:surveyId', surveyController.updateSurvey);
router.delete('/:surveyId', surveyController.deleteSurvey);

// Distribution
router.post('/:surveyId/distribution/link', surveyController.generateDistributionLink);
router.post('/:surveyId/distribution/qrcode', surveyController.generateQRCode);
router.post('/:surveyId/distribution/embed', surveyController.generateEmbedCode);

// Responses
router.post('/:surveyId/responses', surveyController.submitResponse);
router.post('/:surveyId/responses/save', surveyController.saveResponse);
router.get('/responses/resume/:saveToken', surveyController.resumeResponse);

// Conditional Logic & Piping
router.post('/:surveyId/logic/evaluate', surveyController.evaluateLogic);
router.post('/:surveyId/questions/:questionId/piping', surveyController.getQuestionWithPiping);

// Analytics
router.get('/:surveyId/analytics', surveyController.getAnalytics);

module.exports = router;

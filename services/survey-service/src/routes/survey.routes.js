const express = require('express');
const router = express.Router();
const surveyController = require('../controllers/survey.controller');
const { surveyValidators } = require('../../../../shared/utils/validators');

router.post('/', surveyValidators.create, surveyController.createSurvey);
router.get('/', surveyController.getAllSurveys);
router.get('/stats', surveyController.getSurveyStats);
router.get('/:id', surveyValidators.getById, surveyController.getSurveyById);
router.put('/:id', surveyValidators.update, surveyController.updateSurvey);
router.delete('/:id', surveyValidators.getById, surveyController.deleteSurvey);
router.post('/:id/duplicate', surveyValidators.getById, surveyController.duplicateSurvey);
router.post('/:id/version', surveyValidators.getById, surveyController.createVersion);
router.patch('/:id/status', surveyValidators.getById, surveyController.updateStatus);

module.exports = router;

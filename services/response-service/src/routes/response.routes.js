const express = require('express');
const router = express.Router();
const responseController = require('../controllers/response.controller');
const { responseValidators } = require('../../../../shared/utils/validators');

router.post('/partial', responseController.createPartialResponse);
router.post('/', responseValidators.submit, responseController.submitResponse);
router.get('/', responseController.getAllResponses);
router.get('/stats', responseController.getResponseStats);
router.get('/:id', responseValidators.getById, responseController.getResponseById);
router.put('/:id', responseValidators.getById, responseController.updateResponse);
router.delete('/:id', responseValidators.getById, responseController.deleteResponse);

module.exports = router;

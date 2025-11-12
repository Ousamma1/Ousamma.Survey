const express = require('express');
const router = express.Router();
const questionController = require('../controllers/question.controller');

router.post('/', questionController.createQuestion);
router.get('/', questionController.getAllQuestions);
router.get('/categories', questionController.getCategories);
router.get('/:id', questionController.getQuestionById);
router.put('/:id', questionController.updateQuestion);
router.delete('/:id', questionController.deleteQuestion);

module.exports = router;

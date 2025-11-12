const express = require('express');
const router = express.Router();
const templateController = require('../controllers/template.controller');
const { templateValidators } = require('../../../../shared/utils/validators');

router.post('/', templateValidators.create, templateController.createTemplate);
router.get('/', templateController.getAllTemplates);
router.get('/categories', templateController.getCategories);
router.get('/industries', templateController.getIndustries);
router.get('/popular', templateController.getPopularTemplates);
router.get('/:id', templateController.getTemplateById);
router.put('/:id', templateController.updateTemplate);
router.delete('/:id', templateController.deleteTemplate);
router.post('/:id/use', templateController.useTemplate);
router.post('/:id/rate', templateController.rateTemplate);

module.exports = router;

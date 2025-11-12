const express = require('express');
const router = express.Router();
const templateController = require('../controllers/templateController');
const { validateTemplate } = require('../middleware/validation');

// Template routes
router.get('/', templateController.getAll);
router.get('/:id', templateController.getById);
router.get('/name/:name', templateController.getByName);
router.post('/', validateTemplate, templateController.create);
router.put('/:id', templateController.update);
router.delete('/:id', templateController.delete);
router.post('/:id/render', templateController.render);

module.exports = router;

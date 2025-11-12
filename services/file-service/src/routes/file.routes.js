const express = require('express');
const router = express.Router();
const fileController = require('../controllers/file.controller');
const upload = require('../middleware/upload');
const { fileValidators } = require('../../../../shared/utils/validators');

router.post('/upload', upload.single('file'), fileController.uploadFile);
router.post('/upload/multiple', upload.array('files', 10), fileController.uploadMultipleFiles);
router.get('/', fileController.getAllFiles);
router.get('/stats', fileController.getFileStats);
router.get('/:id', fileValidators.getById, fileController.getFileById);
router.get('/:id/download', fileValidators.getById, fileController.downloadFile);
router.delete('/:id', fileValidators.getById, fileController.deleteFile);

module.exports = router;

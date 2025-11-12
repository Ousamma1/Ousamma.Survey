const express = require('express');
const router = express.Router();
const preferenceController = require('../controllers/preferenceController');

// Preference routes
router.get('/:userId', preferenceController.getPreferences);
router.put('/:userId', preferenceController.updatePreferences);
router.post('/:userId/device-token', preferenceController.addDeviceToken);
router.delete('/:userId/device-token', preferenceController.removeDeviceToken);
router.put('/:userId/channels', preferenceController.updateChannels);
router.put('/:userId/categories', preferenceController.updateCategories);

module.exports = router;

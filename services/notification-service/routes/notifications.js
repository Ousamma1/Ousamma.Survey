const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { validateNotification, validateSendNotification } = require('../middleware/validation');

// Notification routes
router.post('/', validateNotification, notificationController.create);
router.get('/user/:userId', notificationController.getUserNotifications);
router.get('/user/:userId/unread-count', notificationController.getUnreadCount);
router.get('/:id', notificationController.getById);
router.put('/:id/read', notificationController.markAsRead);
router.put('/user/:userId/read-all', notificationController.markAllAsRead);
router.post('/send', validateSendNotification, notificationController.send);
router.delete('/:id', notificationController.delete);

module.exports = router;

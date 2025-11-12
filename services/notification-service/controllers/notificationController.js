const Notification = require('../models/Notification');
const NotificationTemplate = require('../models/NotificationTemplate');
const NotificationPreference = require('../models/NotificationPreference');
const kafka = require('../config/kafka');
const config = require('../config/config');

class NotificationController {
  /**
   * Create a new notification
   */
  async create(req, res) {
    try {
      const {
        userId,
        type,
        title,
        message,
        data,
        priority,
        channel,
        recipient,
        metadata
      } = req.body;

      // Create notification in database
      const notification = await Notification.create({
        userId,
        type,
        title,
        message,
        data,
        priority: priority || 'normal',
        channel,
        recipient,
        metadata,
        status: 'pending',
        expiresAt: new Date(Date.now() + config.notification.defaultExpiry)
      });

      // Publish to Kafka for processing
      const event = {
        notificationId: notification._id.toString(),
        userId,
        type,
        payload: {
          title,
          message,
          data,
          recipient,
          priority: priority || 'normal'
        },
        timestamp: new Date().toISOString()
      };

      await kafka.publishNotificationEvent(event);

      res.status(201).json({
        success: true,
        notification: {
          id: notification._id,
          userId: notification.userId,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          status: notification.status,
          createdAt: notification.createdAt
        }
      });
    } catch (error) {
      console.error('Error creating notification:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get user notifications
   */
  async getUserNotifications(req, res) {
    try {
      const { userId } = req.params;
      const { limit = 50, skip = 0, type, status } = req.query;

      const notifications = await Notification.getUserNotifications(userId, {
        limit: parseInt(limit),
        skip: parseInt(skip),
        type,
        status
      });

      const unreadCount = await Notification.getUnreadCount(userId);

      res.json({
        success: true,
        data: notifications,
        unreadCount,
        pagination: {
          limit: parseInt(limit),
          skip: parseInt(skip),
          total: await Notification.countDocuments({ userId })
        }
      });
    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get notification by ID
   */
  async getById(req, res) {
    try {
      const { id } = req.params;

      const notification = await Notification.findById(id);

      if (!notification) {
        return res.status(404).json({
          success: false,
          error: 'Notification not found'
        });
      }

      res.json({
        success: true,
        notification
      });
    } catch (error) {
      console.error('Error fetching notification:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(req, res) {
    try {
      const { id } = req.params;

      const notification = await Notification.findById(id);

      if (!notification) {
        return res.status(404).json({
          success: false,
          error: 'Notification not found'
        });
      }

      await notification.markAsRead();

      res.json({
        success: true,
        notification
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(req, res) {
    try {
      const { userId } = req.params;

      const result = await Notification.markAllAsRead(userId);

      res.json({
        success: true,
        message: `Marked ${result.modifiedCount} notifications as read`
      });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Send immediate notification
   */
  async send(req, res) {
    try {
      const {
        userId,
        type,
        templateName,
        variables,
        recipient,
        priority
      } = req.body;

      // Get template if specified
      let title, message, htmlBody;

      if (templateName) {
        const template = await NotificationTemplate.getByName(templateName);

        if (!template) {
          return res.status(404).json({
            success: false,
            error: `Template '${templateName}' not found`
          });
        }

        const rendered = template.render(variables || {});
        title = rendered.subject;
        message = rendered.body;
        htmlBody = rendered.htmlBody;
      } else {
        title = req.body.title;
        message = req.body.message;
        htmlBody = req.body.htmlBody;
      }

      // Create notification
      const notification = await Notification.create({
        userId,
        type,
        title,
        message,
        channel: type,
        recipient,
        priority: priority || 'normal',
        status: 'pending'
      });

      // Publish to appropriate Kafka topic
      const event = {
        notificationId: notification._id.toString(),
        userId,
        payload: {
          title,
          body: message,
          htmlBody,
          ...recipient
        },
        timestamp: new Date().toISOString()
      };

      switch (type) {
        case 'email':
          await kafka.publishEmailEvent(event);
          break;
        case 'sms':
          await kafka.publishSMSEvent(event);
          break;
        case 'push':
          await kafka.publishPushEvent(event);
          break;
        default:
          await kafka.publishNotificationEvent(event);
      }

      res.json({
        success: true,
        notification: {
          id: notification._id,
          status: notification.status,
          createdAt: notification.createdAt
        }
      });
    } catch (error) {
      console.error('Error sending notification:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get unread count
   */
  async getUnreadCount(req, res) {
    try {
      const { userId } = req.params;

      const count = await Notification.getUnreadCount(userId);

      res.json({
        success: true,
        unreadCount: count
      });
    } catch (error) {
      console.error('Error fetching unread count:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Delete notification
   */
  async delete(req, res) {
    try {
      const { id } = req.params;

      const notification = await Notification.findByIdAndDelete(id);

      if (!notification) {
        return res.status(404).json({
          success: false,
          error: 'Notification not found'
        });
      }

      res.json({
        success: true,
        message: 'Notification deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting notification:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = new NotificationController();

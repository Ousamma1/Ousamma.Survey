/**
 * Notification Service
 * Handles sending notifications via various channels
 */

const config = require('../config/config');
const emailService = require('./emailService');
const smsService = require('./smsService');
const pushService = require('./pushService');
const websocketService = require('./websocketService');

// Import Notification model
let Notification;
try {
  Notification = require('../../../notification-service/models/Notification');
} catch (error) {
  // If model not accessible, create a simple logger
  console.warn('Notification model not found, using simple logging');
  Notification = {
    findById: async () => null,
    prototype: {
      markAsSent: async function() { return this; },
      markAsFailed: async function() { return this; }
    }
  };
}

class NotificationService {
  constructor() {
    this.notificationLog = new Map();
    this.initialized = false;
  }

  /**
   * Initialize all notification services
   */
  async initialize() {
    try {
      await Promise.all([
        emailService.initialize(),
        smsService.initialize(),
        pushService.initialize()
      ]);

      this.initialized = true;
      console.log('✓ All notification services initialized');
    } catch (error) {
      console.error('Error initializing notification services:', error);
    }
  }

  /**
   * Get notification status
   */
  async getNotificationStatus(notificationId) {
    // Try to get from database first
    if (Notification.findById) {
      try {
        const notification = await Notification.findById(notificationId);
        if (notification) {
          return {
            notificationId: notification._id,
            status: notification.status,
            type: notification.type,
            sentAt: notification.sentAt,
            readAt: notification.readAt
          };
        }
      } catch (error) {
        console.error('Error fetching notification from DB:', error);
      }
    }

    // Fallback to in-memory log
    return this.notificationLog.get(notificationId) || { status: 'not_found' };
  }

  /**
   * Log notification
   */
  logNotification(notificationId, type, status, details = {}) {
    this.notificationLog.set(notificationId, {
      notificationId,
      type,
      status,
      timestamp: new Date(),
      ...details
    });
  }

  /**
   * Update notification status in database
   */
  async updateNotificationStatus(notificationId, status, details = {}) {
    try {
      if (Notification.findById) {
        const notification = await Notification.findById(notificationId);
        if (notification) {
          if (status === 'sent') {
            await notification.markAsSent();
          } else if (status === 'failed') {
            await notification.markAsFailed(details.error || 'Unknown error');
          }

          // Send real-time update via WebSocket
          await websocketService.sendNotificationUpdate(notification.userId, {
            notificationId,
            status,
            ...details
          });
        }
      }
    } catch (error) {
      console.error('Error updating notification status:', error);
    }
  }

  /**
   * Notify survey created
   */
  async notifySurveyCreated(event) {
    try {
      const { surveyId, userId, payload } = event;
      const notificationId = `survey-created-${surveyId}-${Date.now()}`;

      console.log(`Sending survey created notification for: ${surveyId}`);

      const template = config.templates.surveyCreated;
      const message = template.body.replace('{surveyTitle}', payload.title || surveyId);

      // Send in-app notification via WebSocket
      await websocketService.sendNotification(userId, {
        type: 'survey.created',
        title: template.subject,
        message,
        data: { surveyId, ...payload }
      });

      this.logNotification(notificationId, 'survey_created', 'sent', {
        surveyId,
        userId,
        message
      });

      return { success: true, notificationId };
    } catch (error) {
      console.error('Error sending survey created notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Notify survey published
   */
  async notifySurveyPublished(event) {
    try {
      const { surveyId, userId, payload } = event;
      const notificationId = `survey-published-${surveyId}-${Date.now()}`;

      console.log(`Sending survey published notification for: ${surveyId}`);

      const template = config.templates.surveyPublished;
      const message = template.body.replace('{surveyTitle}', payload.title || surveyId);

      // Send both in-app and email notification
      await Promise.all([
        websocketService.sendNotification(userId, {
          type: 'survey.published',
          title: template.subject,
          message,
          data: { surveyId, ...payload }
        }),
        emailService.send({
          to: payload.email || userId,
          subject: template.subject,
          body: message,
          htmlBody: `<h2>${template.subject}</h2><p>${message}</p>`
        }).catch(err => console.error('Email send failed:', err))
      ]);

      this.logNotification(notificationId, 'survey_published', 'sent', {
        surveyId,
        userId,
        message
      });

      return { success: true, notificationId };
    } catch (error) {
      console.error('Error sending survey published notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Notify response submitted
   */
  async notifyResponseSubmitted(event) {
    try {
      const { responseId, surveyId, respondentId, payload } = event;
      const notificationId = `response-submitted-${responseId}-${Date.now()}`;

      console.log(`Sending response submitted notification for: ${responseId}`);

      const template = config.templates.responseSubmitted;
      const message = template.body.replace('{surveyTitle}', payload?.surveyTitle || surveyId);

      // Send in-app notification
      const userId = payload?.surveyOwnerId || payload?.userId;
      if (userId) {
        await websocketService.sendNotification(userId, {
          type: 'response.submitted',
          title: template.subject,
          message,
          data: { responseId, surveyId, respondentId }
        });
      }

      this.logNotification(notificationId, 'response_submitted', 'sent', {
        responseId,
        surveyId,
        respondentId,
        message
      });

      return { success: true, notificationId };
    } catch (error) {
      console.error('Error sending response notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Notify surveyor registered
   */
  async notifySurveyorRegistered(event) {
    try {
      const { surveyorId, payload } = event;
      const notificationId = `surveyor-registered-${surveyorId}-${Date.now()}`;

      console.log(`Sending welcome notification to surveyor: ${surveyorId}`);

      const template = config.templates.surveyorRegistered;
      const message = template.body.replace('{surveyorName}', payload.name || 'User');

      // Send welcome email
      if (payload.email) {
        await emailService.send({
          to: payload.email,
          subject: template.subject,
          body: message,
          htmlBody: `<h2>${template.subject}</h2><p>${message}</p>`
        });
      }

      this.logNotification(notificationId, 'surveyor_registered', 'sent', {
        surveyorId,
        email: payload.email,
        message
      });

      return { success: true, notificationId };
    } catch (error) {
      console.error('Error sending surveyor registration notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send generic notification
   */
  async sendNotification(event) {
    try {
      const { notificationId, payload } = event;
      const { type, recipient, content, priority } = payload;

      console.log(`Sending ${type} notification (${priority} priority)`);

      // Route to appropriate channel
      switch (type) {
        case 'email':
          return await this.sendEmail(event);
        case 'sms':
          return await this.sendSMS(event);
        case 'push':
          return await this.sendPushNotification(event);
        case 'in-app':
          return await this.sendInAppNotification(event);
        default:
          console.log(`Unknown notification type: ${type}`);
      }

      this.logNotification(notificationId, type, 'sent', { recipient, content });
      await this.updateNotificationStatus(notificationId, 'sent');

      return { success: true, notificationId };
    } catch (error) {
      console.error('Error sending notification:', error);
      await this.updateNotificationStatus(notificationId, 'failed', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Send email notification
   */
  async sendEmail(event) {
    try {
      const { notificationId, payload } = event;
      const { to, subject, body, htmlBody, attachments = [] } = payload;

      const result = await emailService.send({
        to,
        subject,
        body,
        htmlBody,
        attachments
      });

      this.logNotification(notificationId, 'email', 'sent', {
        to,
        subject,
        sentAt: new Date()
      });

      await this.updateNotificationStatus(notificationId, 'sent');

      return { success: true, notificationId, ...result };
    } catch (error) {
      console.error('Error sending email:', error);
      await this.updateNotificationStatus(notificationId, 'failed', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Send SMS notification
   */
  async sendSMS(event) {
    try {
      const { notificationId, payload } = event;
      const { phoneNumber, message } = payload;

      const result = await smsService.send({
        phoneNumber,
        message
      });

      this.logNotification(notificationId, 'sms', 'sent', {
        phoneNumber,
        sentAt: new Date()
      });

      await this.updateNotificationStatus(notificationId, 'sent');

      return { success: true, notificationId, ...result };
    } catch (error) {
      console.error('Error sending SMS:', error);
      await this.updateNotificationStatus(notificationId, 'failed', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Send push notification
   */
  async sendPushNotification(event) {
    try {
      const { notificationId, payload } = event;
      const { deviceTokens, subscription, title, body, data, icon, badge } = payload;

      let result;

      if (subscription) {
        // Web push
        result = await pushService.send({
          subscription,
          title,
          body,
          data,
          icon,
          badge
        });
      } else if (deviceTokens && deviceTokens.length > 0) {
        // FCM for mobile
        result = await pushService.sendFCM({
          tokens: deviceTokens,
          title,
          body,
          data
        });
      }

      this.logNotification(notificationId, 'push', 'sent', {
        deviceCount: deviceTokens?.length || 1,
        title,
        sentAt: new Date()
      });

      await this.updateNotificationStatus(notificationId, 'sent');

      return { success: true, notificationId, ...result };
    } catch (error) {
      console.error('Error sending push notification:', error);
      await this.updateNotificationStatus(notificationId, 'failed', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Send in-app notification
   */
  async sendInAppNotification(event) {
    try {
      const { notificationId, userId, payload } = event;
      const { title, message, data } = payload;

      await websocketService.sendNotification(userId, {
        type: 'in-app',
        title,
        message,
        data
      });

      this.logNotification(notificationId, 'in-app', 'sent', {
        userId,
        title,
        sentAt: new Date()
      });

      await this.updateNotificationStatus(notificationId, 'sent');

      return { success: true, notificationId };
    } catch (error) {
      console.error('Error sending in-app notification:', error);
      await this.updateNotificationStatus(notificationId, 'failed', { error: error.message });
      return { success: false, error: error.message };
    }
  }
}

module.exports = new NotificationService();

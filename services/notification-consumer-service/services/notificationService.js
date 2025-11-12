/**
 * Notification Service
 * Handles sending notifications via various channels
 */

const config = require('../config/config');

class NotificationService {
  constructor() {
    this.notificationLog = new Map(); // Store notification status
  }

  /**
   * Get notification status
   */
  async getNotificationStatus(notificationId) {
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
   * Notify survey created
   */
  async notifySurveyCreated(event) {
    try {
      const { surveyId, userId, payload } = event;
      const notificationId = `survey-created-${surveyId}-${Date.now()}`;

      console.log(`Sending survey created notification for: ${surveyId}`);

      const template = config.templates.surveyCreated;
      const message = template.body.replace('{surveyTitle}', payload.title);

      // In production, send actual email/push notification
      console.log(`📧 Notification: ${template.subject}`);
      console.log(`   Message: ${message}`);
      console.log(`   User: ${userId}`);

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

      console.log(`📧 Notification: ${template.subject}`);
      console.log(`   Message: ${message}`);

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
      const { responseId, surveyId, respondentId } = event;
      const notificationId = `response-submitted-${responseId}-${Date.now()}`;

      console.log(`Sending response submitted notification for: ${responseId}`);

      const template = config.templates.responseSubmitted;
      const message = template.body.replace('{surveyTitle}', surveyId);

      console.log(`📧 Notification: ${template.subject}`);
      console.log(`   Message: ${message}`);
      console.log(`   Survey: ${surveyId}`);

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
      const message = template.body.replace('{surveyorName}', payload.name);

      console.log(`📧 Notification: ${template.subject}`);
      console.log(`   Message: ${message}`);
      console.log(`   Email: ${payload.email}`);

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
      console.log(`   To: ${JSON.stringify(recipient)}`);
      console.log(`   Content: ${JSON.stringify(content)}`);

      // Route to appropriate channel
      switch (type) {
        case 'email':
          return await this.sendEmail(event);
        case 'sms':
          return await this.sendSMS(event);
        case 'push':
          return await this.sendPushNotification(event);
        default:
          console.log(`Unknown notification type: ${type}`);
      }

      this.logNotification(notificationId, type, 'sent', { recipient, content });

      return { success: true, notificationId };
    } catch (error) {
      console.error('Error sending notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send email notification
   */
  async sendEmail(event) {
    try {
      const { notificationId, payload } = event;
      const { to, subject, body, attachments = [] } = payload;

      console.log(`📧 Sending email:`);
      console.log(`   To: ${to.join(', ')}`);
      console.log(`   Subject: ${subject}`);
      console.log(`   Body: ${body.substring(0, 100)}...`);

      if (attachments.length > 0) {
        console.log(`   Attachments: ${attachments.length}`);
      }

      // In production, integrate with actual email service (SendGrid, SES, etc.)
      // For now, just log

      this.logNotification(notificationId, 'email', 'sent', {
        to,
        subject,
        sentAt: new Date()
      });

      return { success: true, notificationId };
    } catch (error) {
      console.error('Error sending email:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send SMS notification
   */
  async sendSMS(event) {
    try {
      const { notificationId, payload } = event;
      const { phoneNumber, message, provider } = payload;

      console.log(`📱 Sending SMS:`);
      console.log(`   To: ${phoneNumber}`);
      console.log(`   Message: ${message}`);
      console.log(`   Provider: ${provider || config.sms.provider}`);

      // In production, integrate with Twilio or similar service

      this.logNotification(notificationId, 'sms', 'sent', {
        phoneNumber,
        sentAt: new Date()
      });

      return { success: true, notificationId };
    } catch (error) {
      console.error('Error sending SMS:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send push notification
   */
  async sendPushNotification(event) {
    try {
      const { notificationId, payload } = event;
      const { deviceTokens, title, body, data, badge } = payload;

      console.log(`🔔 Sending push notification:`);
      console.log(`   To: ${deviceTokens.length} devices`);
      console.log(`   Title: ${title}`);
      console.log(`   Body: ${body}`);

      if (badge) {
        console.log(`   Badge: ${badge}`);
      }

      // In production, integrate with FCM or APNs

      this.logNotification(notificationId, 'push', 'sent', {
        deviceCount: deviceTokens.length,
        title,
        sentAt: new Date()
      });

      return { success: true, notificationId };
    } catch (error) {
      console.error('Error sending push notification:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new NotificationService();

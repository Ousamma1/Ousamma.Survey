/**
 * Push Notification Service using web-push
 */

const webPush = require('web-push');
const config = require('../config/config');

class PushService {
  constructor() {
    this.initialized = false;
  }

  /**
   * Initialize web push
   */
  async initialize() {
    try {
      const provider = config.push.provider;

      if (provider === 'web-push') {
        const { vapidPublicKey, vapidPrivateKey, vapidSubject } = config.push.webPush;

        if (!vapidPublicKey || !vapidPrivateKey) {
          // Generate VAPID keys if not configured
          const vapidKeys = webPush.generateVAPIDKeys();
          console.log('⚠ VAPID keys not configured. Generated new keys:');
          console.log('  Public Key:', vapidKeys.publicKey);
          console.log('  Private Key:', vapidKeys.privateKey);
          console.log('  Add these to your environment variables!');

          webPush.setVapidDetails(
            vapidSubject || 'mailto:admin@survey-platform.com',
            vapidKeys.publicKey,
            vapidKeys.privateKey
          );
        } else {
          webPush.setVapidDetails(
            vapidSubject || 'mailto:admin@survey-platform.com',
            vapidPublicKey,
            vapidPrivateKey
          );
        }

        console.log('✓ Push notification service initialized (web-push)');
      } else {
        console.log('✓ Push notification service initialized (Console mode)');
      }

      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize push service:', error);
      console.log('⚠ Push service running in console mode');
      this.initialized = true;
    }
  }

  /**
   * Send push notification
   */
  async send(options) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      const { subscription, title, body, data, icon, badge, tag } = options;

      const payload = JSON.stringify({
        title,
        body,
        icon: icon || '/icons/notification-icon.png',
        badge: badge || '/icons/badge-icon.png',
        tag: tag || 'notification',
        data: data || {},
        timestamp: Date.now()
      });

      if (config.push.provider === 'web-push' && subscription) {
        const result = await webPush.sendNotification(subscription, payload);

        console.log('✓ Push notification sent successfully');
        console.log(`  Title: ${title}`);
        console.log(`  Status: ${result.statusCode}`);

        return {
          success: true,
          statusCode: result.statusCode
        };
      } else {
        // Console mode
        console.log('🔔 Push Notification (Console Mode):');
        console.log(`  Title: ${title}`);
        console.log(`  Body: ${body}`);
        if (data) {
          console.log(`  Data: ${JSON.stringify(data)}`);
        }

        return {
          success: true,
          statusCode: 200
        };
      }
    } catch (error) {
      console.error('Failed to send push notification:', error);

      // Handle expired/invalid subscriptions
      if (error.statusCode === 410) {
        console.log('  Subscription expired');
        return {
          success: false,
          error: 'Subscription expired',
          expired: true
        };
      }

      throw error;
    }
  }

  /**
   * Send to multiple devices
   */
  async sendToDevices(deviceTokens, notification) {
    const results = [];

    for (const token of deviceTokens) {
      try {
        const result = await this.send({
          subscription: token,
          ...notification
        });
        results.push({ success: true, ...result });
      } catch (error) {
        results.push({
          success: false,
          error: error.message,
          deviceToken: token
        });
      }
    }

    return results;
  }

  /**
   * Send using FCM (Firebase Cloud Messaging) for mobile apps
   */
  async sendFCM(options) {
    try {
      const { tokens, title, body, data } = options;

      if (config.push.provider === 'fcm' && config.push.fcm.serverKey) {
        const axios = require('axios');

        const payload = {
          registration_ids: Array.isArray(tokens) ? tokens : [tokens],
          notification: {
            title,
            body,
            icon: '/icons/notification-icon.png',
            click_action: 'FLUTTER_NOTIFICATION_CLICK'
          },
          data: data || {}
        };

        const response = await axios.post(
          'https://fcm.googleapis.com/fcm/send',
          payload,
          {
            headers: {
              'Authorization': `key=${config.push.fcm.serverKey}`,
              'Content-Type': 'application/json'
            }
          }
        );

        console.log('✓ FCM notification sent successfully');
        console.log(`  Success: ${response.data.success}`);
        console.log(`  Failure: ${response.data.failure}`);

        return {
          success: true,
          results: response.data.results
        };
      } else {
        // Console mode
        console.log('🔔 FCM Notification (Console Mode):');
        console.log(`  Tokens: ${Array.isArray(tokens) ? tokens.length : 1}`);
        console.log(`  Title: ${title}`);
        console.log(`  Body: ${body}`);

        return {
          success: true,
          message: 'Console mode'
        };
      }
    } catch (error) {
      console.error('Failed to send FCM notification:', error);
      throw error;
    }
  }

  /**
   * Generate VAPID keys (utility method)
   */
  generateVAPIDKeys() {
    return webPush.generateVAPIDKeys();
  }
}

module.exports = new PushService();

/**
 * WebSocket Service
 * Sends real-time notifications via WebSocket service
 */

const axios = require('axios');
const config = require('../config/config');

class WebSocketService {
  constructor() {
    this.baseUrl = config.websocketUrl;
  }

  /**
   * Send notification to user via WebSocket
   */
  async sendNotification(userId, notification) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/broadcast/user/${userId}`,
        {
          event: 'notification',
          data: notification
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 5000
        }
      );

      console.log(`✓ Sent real-time notification to user: ${userId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to send WebSocket notification:', error.message);
      // Don't throw - WebSocket is a non-critical enhancement
      return { success: false, error: error.message };
    }
  }

  /**
   * Send notification update (status change)
   */
  async sendNotificationUpdate(userId, update) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/broadcast/user/${userId}`,
        {
          event: 'notification.update',
          data: update
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 5000
        }
      );

      console.log(`✓ Sent notification update to user: ${userId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to send notification update:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Broadcast notification to all users
   */
  async broadcastNotification(notification) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/broadcast/all`,
        {
          event: 'notification',
          data: notification
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 5000
        }
      );

      console.log('✓ Broadcast notification to all users');
      return response.data;
    } catch (error) {
      console.error('Failed to broadcast notification:', error.message);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new WebSocketService();

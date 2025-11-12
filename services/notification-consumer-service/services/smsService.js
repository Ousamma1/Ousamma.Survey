/**
 * SMS Service using Twilio
 */

const config = require('../config/config');

class SMSService {
  constructor() {
    this.client = null;
    this.initialized = false;
  }

  /**
   * Initialize Twilio client
   */
  async initialize() {
    try {
      const provider = config.sms.provider;

      if (provider === 'twilio') {
        const twilio = require('twilio');
        const { accountSid, authToken } = config.sms.twilio;

        if (!accountSid || !authToken) {
          throw new Error('Twilio credentials not configured');
        }

        this.client = twilio(accountSid, authToken);
        console.log('✓ SMS service initialized (Twilio)');
      } else {
        console.log('✓ SMS service initialized (Console mode)');
      }

      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize SMS service:', error);
      console.log('⚠ SMS service running in console mode');
      this.initialized = true;
    }
  }

  /**
   * Send SMS
   */
  async send(options) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      const { phoneNumber, message, from } = options;

      // Validate phone number
      if (!phoneNumber) {
        throw new Error('Phone number is required');
      }

      if (config.sms.provider === 'twilio' && this.client) {
        const result = await this.client.messages.create({
          body: message,
          from: from || config.sms.twilio.fromNumber,
          to: phoneNumber
        });

        console.log('✓ SMS sent successfully');
        console.log(`  To: ${phoneNumber}`);
        console.log(`  SID: ${result.sid}`);
        console.log(`  Status: ${result.status}`);

        return {
          success: true,
          messageId: result.sid,
          status: result.status
        };
      } else {
        // Console mode
        console.log('📱 SMS (Console Mode):');
        console.log(`  To: ${phoneNumber}`);
        console.log(`  Message: ${message}`);

        return {
          success: true,
          messageId: `console-${Date.now()}`,
          status: 'sent'
        };
      }
    } catch (error) {
      console.error('Failed to send SMS:', error);
      throw error;
    }
  }

  /**
   * Send bulk SMS
   */
  async sendBulk(messages) {
    const results = [];

    for (const msg of messages) {
      try {
        const result = await this.send(msg);
        results.push({ success: true, ...result });
      } catch (error) {
        results.push({
          success: false,
          error: error.message,
          phoneNumber: msg.phoneNumber
        });
      }
    }

    return results;
  }

  /**
   * Get message status (Twilio only)
   */
  async getStatus(messageSid) {
    try {
      if (config.sms.provider === 'twilio' && this.client) {
        const message = await this.client.messages(messageSid).fetch();
        return {
          success: true,
          status: message.status,
          errorCode: message.errorCode,
          errorMessage: message.errorMessage
        };
      }

      return {
        success: true,
        status: 'unknown',
        message: 'Status check not available in console mode'
      };
    } catch (error) {
      console.error('Failed to get SMS status:', error);
      throw error;
    }
  }
}

module.exports = new SMSService();

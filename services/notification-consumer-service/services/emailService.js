/**
 * Email Service using Nodemailer
 */

const nodemailer = require('nodemailer');
const config = require('../config/config');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initialized = false;
  }

  /**
   * Initialize email transporter
   */
  async initialize() {
    try {
      const provider = config.email.provider;

      if (provider === 'smtp') {
        // Use SMTP configuration
        this.transporter = nodemailer.createTransport({
          host: config.email.smtp.host,
          port: config.email.smtp.port,
          secure: config.email.smtp.secure,
          auth: {
            user: config.email.smtp.auth.user,
            pass: config.email.smtp.auth.pass
          }
        });

        // Verify connection
        await this.transporter.verify();
        console.log('✓ Email service initialized (SMTP)');
      } else if (provider === 'console') {
        // Console-only mode for development
        this.transporter = nodemailer.createTransport({
          streamTransport: true,
          newline: 'unix',
          buffer: true
        });
        console.log('✓ Email service initialized (Console mode)');
      } else {
        console.warn('⚠ Email provider not configured, using console mode');
        this.transporter = nodemailer.createTransport({
          streamTransport: true,
          newline: 'unix',
          buffer: true
        });
      }

      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize email service:', error);
      // Fallback to console mode
      this.transporter = nodemailer.createTransport({
        streamTransport: true,
        newline: 'unix',
        buffer: true
      });
      this.initialized = true;
    }
  }

  /**
   * Send email
   */
  async send(options) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      const {
        to,
        subject,
        body,
        htmlBody,
        from,
        attachments,
        replyTo
      } = options;

      const mailOptions = {
        from: from || config.email.from,
        to: Array.isArray(to) ? to.join(', ') : to,
        subject,
        text: body,
        html: htmlBody || body,
        replyTo: replyTo || undefined,
        attachments: attachments || []
      };

      const info = await this.transporter.sendMail(mailOptions);

      console.log('✓ Email sent successfully');
      console.log(`  To: ${mailOptions.to}`);
      console.log(`  Subject: ${subject}`);

      if (config.email.provider === 'console') {
        console.log('  Message preview:', info.message.toString().substring(0, 200) + '...');
      } else {
        console.log(`  Message ID: ${info.messageId}`);
      }

      return {
        success: true,
        messageId: info.messageId,
        response: info.response
      };
    } catch (error) {
      console.error('Failed to send email:', error);
      throw error;
    }
  }

  /**
   * Send bulk emails
   */
  async sendBulk(emails) {
    const results = [];

    for (const email of emails) {
      try {
        const result = await this.send(email);
        results.push({ success: true, ...result });
      } catch (error) {
        results.push({
          success: false,
          error: error.message,
          email: email.to
        });
      }
    }

    return results;
  }

  /**
   * Send templated email
   */
  async sendTemplate(template, variables, recipients) {
    const { subject, body, htmlBody } = this.renderTemplate(template, variables);

    return await this.send({
      to: recipients,
      subject,
      body,
      htmlBody
    });
  }

  /**
   * Render email template with variables
   */
  renderTemplate(template, variables = {}) {
    let subject = template.subject || '';
    let body = template.body || '';
    let htmlBody = template.htmlBody || body;

    // Replace variables
    Object.keys(variables).forEach(key => {
      const regex = new RegExp(`{${key}}`, 'g');
      subject = subject.replace(regex, variables[key] || '');
      body = body.replace(regex, variables[key] || '');
      htmlBody = htmlBody.replace(regex, variables[key] || '');
    });

    return { subject, body, htmlBody };
  }
}

module.exports = new EmailService();

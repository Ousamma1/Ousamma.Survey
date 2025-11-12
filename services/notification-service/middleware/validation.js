const Joi = require('joi');

// Notification validation schema
const notificationSchema = Joi.object({
  userId: Joi.string().required(),
  type: Joi.string().valid('email', 'sms', 'push', 'in-app').required(),
  title: Joi.string().required(),
  message: Joi.string().required(),
  data: Joi.object().optional(),
  priority: Joi.string().valid('low', 'normal', 'high', 'urgent').optional(),
  channel: Joi.string().valid('email', 'sms', 'push', 'in-app', 'multiple').required(),
  recipient: Joi.object({
    email: Joi.string().email().optional(),
    phoneNumber: Joi.string().optional(),
    deviceTokens: Joi.array().items(Joi.string()).optional(),
    userId: Joi.string().optional()
  }).optional(),
  metadata: Joi.object().optional()
});

// Send notification validation schema
const sendNotificationSchema = Joi.object({
  userId: Joi.string().required(),
  type: Joi.string().valid('email', 'sms', 'push', 'in-app').required(),
  templateName: Joi.string().optional(),
  title: Joi.string().optional(),
  message: Joi.string().optional(),
  htmlBody: Joi.string().optional(),
  variables: Joi.object().optional(),
  recipient: Joi.object({
    to: Joi.alternatives().try(
      Joi.string().email(),
      Joi.array().items(Joi.string().email())
    ).optional(),
    subject: Joi.string().optional(),
    body: Joi.string().optional(),
    phoneNumber: Joi.string().optional(),
    deviceTokens: Joi.array().items(Joi.string()).optional()
  }).required(),
  priority: Joi.string().valid('low', 'normal', 'high', 'urgent').optional()
}).or('templateName', 'title');

// Template validation schema
const templateSchema = Joi.object({
  name: Joi.string().required(),
  type: Joi.string().valid('email', 'sms', 'push', 'in-app').required(),
  subject: Joi.string().optional(),
  body: Joi.string().required(),
  htmlBody: Joi.string().optional(),
  variables: Joi.array().items(Joi.string()).optional(),
  category: Joi.string().valid('survey', 'response', 'system', 'account', 'alert', 'marketing').optional(),
  priority: Joi.string().valid('low', 'normal', 'high', 'urgent').optional(),
  metadata: Joi.object().optional()
});

// Validation middleware
function validateNotification(req, res, next) {
  const { error } = notificationSchema.validate(req.body);

  if (error) {
    return res.status(400).json({
      success: false,
      error: error.details[0].message
    });
  }

  next();
}

function validateSendNotification(req, res, next) {
  const { error } = sendNotificationSchema.validate(req.body);

  if (error) {
    return res.status(400).json({
      success: false,
      error: error.details[0].message
    });
  }

  next();
}

function validateTemplate(req, res, next) {
  const { error } = templateSchema.validate(req.body);

  if (error) {
    return res.status(400).json({
      success: false,
      error: error.details[0].message
    });
  }

  next();
}

module.exports = {
  validateNotification,
  validateSendNotification,
  validateTemplate
};

const mongoose = require('mongoose');

const notificationTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  type: {
    type: String,
    enum: ['email', 'sms', 'push', 'in-app'],
    required: true
  },
  subject: {
    type: String,
    required: function() {
      return this.type === 'email' || this.type === 'push';
    },
    trim: true
  },
  body: {
    type: String,
    required: true
  },
  htmlBody: {
    type: String // HTML version for emails
  },
  variables: [{
    type: String,
    trim: true
  }],
  category: {
    type: String,
    enum: ['survey', 'response', 'system', 'account', 'alert', 'marketing'],
    default: 'system'
  },
  active: {
    type: Boolean,
    default: true
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  metadata: {
    description: String,
    tags: [String],
    version: {
      type: Number,
      default: 1
    }
  }
}, {
  timestamps: true
});

// Indexes
notificationTemplateSchema.index({ name: 1, type: 1 });
notificationTemplateSchema.index({ category: 1, active: 1 });

// Method to render template with variables
notificationTemplateSchema.methods.render = function(variables = {}) {
  let renderedSubject = this.subject || '';
  let renderedBody = this.body;
  let renderedHtmlBody = this.htmlBody || '';

  // Replace variables in subject
  Object.keys(variables).forEach(key => {
    const regex = new RegExp(`{${key}}`, 'g');
    renderedSubject = renderedSubject.replace(regex, variables[key] || '');
    renderedBody = renderedBody.replace(regex, variables[key] || '');
    renderedHtmlBody = renderedHtmlBody.replace(regex, variables[key] || '');
  });

  return {
    subject: renderedSubject,
    body: renderedBody,
    htmlBody: renderedHtmlBody
  };
};

// Static method to get template by name
notificationTemplateSchema.statics.getByName = function(name) {
  return this.findOne({ name, active: true });
};

// Static method to get templates by category
notificationTemplateSchema.statics.getByCategory = function(category) {
  return this.find({ category, active: true });
};

const NotificationTemplate = mongoose.model('NotificationTemplate', notificationTemplateSchema);

module.exports = NotificationTemplate;

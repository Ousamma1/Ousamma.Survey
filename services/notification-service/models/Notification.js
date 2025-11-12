const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['email', 'sms', 'push', 'in-app'],
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'failed', 'delivered', 'read'],
    default: 'pending',
    index: true
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  channel: {
    type: String,
    enum: ['email', 'sms', 'push', 'in-app', 'multiple'],
    required: true
  },
  recipient: {
    email: String,
    phoneNumber: String,
    deviceTokens: [String],
    userId: String
  },
  metadata: {
    surveyId: String,
    responseId: String,
    surveyorId: String,
    eventType: String,
    source: String
  },
  attempts: {
    type: Number,
    default: 0
  },
  lastAttemptAt: Date,
  sentAt: Date,
  deliveredAt: Date,
  readAt: Date,
  failedReason: String,
  expiresAt: Date
}, {
  timestamps: true
});

// Indexes
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, status: 1 });
notificationSchema.index({ userId: 1, type: 1 });
notificationSchema.index({ status: 1, createdAt: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

// Virtual for unread count
notificationSchema.virtual('isUnread').get(function() {
  return this.status !== 'read';
});

// Method to mark as read
notificationSchema.methods.markAsRead = function() {
  this.status = 'read';
  this.readAt = new Date();
  return this.save();
};

// Method to mark as sent
notificationSchema.methods.markAsSent = function() {
  this.status = 'sent';
  this.sentAt = new Date();
  return this.save();
};

// Method to mark as failed
notificationSchema.methods.markAsFailed = function(reason) {
  this.status = 'failed';
  this.failedReason = reason;
  this.lastAttemptAt = new Date();
  this.attempts += 1;
  return this.save();
};

// Static method to get unread count
notificationSchema.statics.getUnreadCount = function(userId) {
  return this.countDocuments({ userId, status: { $ne: 'read' } });
};

// Static method to mark all as read
notificationSchema.statics.markAllAsRead = function(userId) {
  return this.updateMany(
    { userId, status: { $ne: 'read' } },
    { $set: { status: 'read', readAt: new Date() } }
  );
};

// Static method to get user notifications
notificationSchema.statics.getUserNotifications = function(userId, options = {}) {
  const { limit = 50, skip = 0, type, status } = options;
  const query = { userId };

  if (type) query.type = type;
  if (status) query.status = status;

  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;

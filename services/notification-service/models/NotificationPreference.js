const mongoose = require('mongoose');

const notificationPreferenceSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  channels: {
    email: {
      enabled: {
        type: Boolean,
        default: true
      },
      address: String,
      verified: {
        type: Boolean,
        default: false
      }
    },
    sms: {
      enabled: {
        type: Boolean,
        default: false
      },
      phoneNumber: String,
      verified: {
        type: Boolean,
        default: false
      }
    },
    push: {
      enabled: {
        type: Boolean,
        default: true
      },
      deviceTokens: [{
        token: String,
        platform: {
          type: String,
          enum: ['web', 'ios', 'android']
        },
        addedAt: {
          type: Date,
          default: Date.now
        }
      }]
    },
    inApp: {
      enabled: {
        type: Boolean,
        default: true
      }
    }
  },
  categories: {
    survey: {
      type: Boolean,
      default: true
    },
    response: {
      type: Boolean,
      default: true
    },
    system: {
      type: Boolean,
      default: true
    },
    account: {
      type: Boolean,
      default: true
    },
    alert: {
      type: Boolean,
      default: true
    },
    marketing: {
      type: Boolean,
      default: false
    }
  },
  quietHours: {
    enabled: {
      type: Boolean,
      default: false
    },
    start: String, // Format: "HH:mm"
    end: String,   // Format: "HH:mm"
    timezone: {
      type: String,
      default: 'UTC'
    }
  },
  language: {
    type: String,
    default: 'en'
  }
}, {
  timestamps: true
});

// Method to check if a channel is enabled
notificationPreferenceSchema.methods.isChannelEnabled = function(channel) {
  return this.channels[channel]?.enabled || false;
};

// Method to check if a category is enabled
notificationPreferenceSchema.methods.isCategoryEnabled = function(category) {
  return this.categories[category] !== false;
};

// Method to add device token
notificationPreferenceSchema.methods.addDeviceToken = function(token, platform) {
  if (!this.channels.push.deviceTokens) {
    this.channels.push.deviceTokens = [];
  }

  // Remove existing token if present
  this.channels.push.deviceTokens = this.channels.push.deviceTokens.filter(
    dt => dt.token !== token
  );

  // Add new token
  this.channels.push.deviceTokens.push({
    token,
    platform,
    addedAt: new Date()
  });

  return this.save();
};

// Method to remove device token
notificationPreferenceSchema.methods.removeDeviceToken = function(token) {
  if (this.channels.push.deviceTokens) {
    this.channels.push.deviceTokens = this.channels.push.deviceTokens.filter(
      dt => dt.token !== token
    );
  }
  return this.save();
};

// Static method to get or create preferences
notificationPreferenceSchema.statics.getOrCreate = async function(userId) {
  let preferences = await this.findOne({ userId });
  if (!preferences) {
    preferences = await this.create({ userId });
  }
  return preferences;
};

const NotificationPreference = mongoose.model('NotificationPreference', notificationPreferenceSchema);

module.exports = NotificationPreference;

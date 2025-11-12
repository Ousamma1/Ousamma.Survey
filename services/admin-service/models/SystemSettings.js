const mongoose = require('mongoose');

const systemSettingsSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  category: {
    type: String,
    required: true,
    enum: ['general', 'email', 'ai', 'map', 'security', 'backup', 'features', 'notifications'],
    index: true
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  dataType: {
    type: String,
    enum: ['string', 'number', 'boolean', 'object', 'array'],
    required: true
  },
  description: {
    type: String
  },
  isPublic: {
    type: Boolean,
    default: false // Whether this setting can be accessed by non-admin users
  },
  isEditable: {
    type: Boolean,
    default: true // Whether this setting can be modified
  },
  validationRules: {
    required: Boolean,
    min: Number,
    max: Number,
    pattern: String,
    enum: [String]
  },
  metadata: {
    displayName: String,
    displayOrder: Number,
    group: String,
    helpText: String
  },
  lastModifiedBy: {
    type: String
  }
}, {
  timestamps: true,
  collection: 'system_settings'
});

// Indexes
systemSettingsSchema.index({ category: 1 });
systemSettingsSchema.index({ isPublic: 1 });

// Static method to get setting by key
systemSettingsSchema.statics.getSetting = async function(key) {
  const setting = await this.findOne({ key });
  return setting ? setting.value : null;
};

// Static method to update setting
systemSettingsSchema.statics.updateSetting = async function(key, value, userId) {
  const setting = await this.findOne({ key });

  if (!setting) {
    throw new Error(`Setting with key "${key}" not found`);
  }

  if (!setting.isEditable) {
    throw new Error(`Setting "${key}" is not editable`);
  }

  // Validate data type
  const valueType = Array.isArray(value) ? 'array' : typeof value;
  if (setting.dataType !== valueType) {
    throw new Error(`Invalid data type for "${key}". Expected ${setting.dataType}, got ${valueType}`);
  }

  setting.value = value;
  setting.lastModifiedBy = userId;
  await setting.save();

  return setting;
};

// Static method to get settings by category
systemSettingsSchema.statics.getByCategory = async function(category, includeNonPublic = false) {
  const query = { category };
  if (!includeNonPublic) {
    query.isPublic = true;
  }

  return await this.find(query).sort({ 'metadata.displayOrder': 1 });
};

// Static method to initialize default settings
systemSettingsSchema.statics.initializeDefaults = async function() {
  const defaultSettings = [
    // General Settings
    {
      key: 'system.name',
      category: 'general',
      value: 'Survey Platform',
      dataType: 'string',
      description: 'System name',
      isPublic: true,
      metadata: { displayName: 'System Name', displayOrder: 1, group: 'General' }
    },
    {
      key: 'system.timezone',
      category: 'general',
      value: 'UTC',
      dataType: 'string',
      description: 'System timezone',
      isPublic: true,
      metadata: { displayName: 'Timezone', displayOrder: 2, group: 'General' }
    },
    {
      key: 'system.language',
      category: 'general',
      value: 'en',
      dataType: 'string',
      description: 'Default system language',
      isPublic: true,
      metadata: { displayName: 'Language', displayOrder: 3, group: 'General' }
    },

    // Email Settings
    {
      key: 'email.enabled',
      category: 'email',
      value: false,
      dataType: 'boolean',
      description: 'Enable email notifications',
      isPublic: false,
      metadata: { displayName: 'Email Enabled', displayOrder: 1, group: 'Email' }
    },
    {
      key: 'email.provider',
      category: 'email',
      value: 'smtp',
      dataType: 'string',
      description: 'Email provider (smtp, sendgrid, etc.)',
      isPublic: false,
      metadata: { displayName: 'Email Provider', displayOrder: 2, group: 'Email' }
    },
    {
      key: 'email.from_address',
      category: 'email',
      value: 'noreply@survey-platform.com',
      dataType: 'string',
      description: 'Default sender email address',
      isPublic: false,
      metadata: { displayName: 'From Address', displayOrder: 3, group: 'Email' }
    },

    // AI Settings
    {
      key: 'ai.enabled',
      category: 'ai',
      value: true,
      dataType: 'boolean',
      description: 'Enable AI features',
      isPublic: true,
      metadata: { displayName: 'AI Enabled', displayOrder: 1, group: 'AI' }
    },
    {
      key: 'ai.provider',
      category: 'ai',
      value: 'openai',
      dataType: 'string',
      description: 'AI provider (openai, anthropic, etc.)',
      isPublic: false,
      metadata: { displayName: 'AI Provider', displayOrder: 2, group: 'AI' }
    },

    // Map Settings
    {
      key: 'map.enabled',
      category: 'map',
      value: true,
      dataType: 'boolean',
      description: 'Enable map features',
      isPublic: true,
      metadata: { displayName: 'Map Enabled', displayOrder: 1, group: 'Map' }
    },
    {
      key: 'map.default_center',
      category: 'map',
      value: { lat: 25.2048, lng: 55.2708 },
      dataType: 'object',
      description: 'Default map center (Dubai)',
      isPublic: true,
      metadata: { displayName: 'Default Center', displayOrder: 2, group: 'Map' }
    },

    // Security Settings
    {
      key: 'security.max_login_attempts',
      category: 'security',
      value: 5,
      dataType: 'number',
      description: 'Maximum failed login attempts before account lock',
      isPublic: false,
      metadata: { displayName: 'Max Login Attempts', displayOrder: 1, group: 'Security' }
    },
    {
      key: 'security.account_lock_duration',
      category: 'security',
      value: 30,
      dataType: 'number',
      description: 'Account lock duration in minutes',
      isPublic: false,
      metadata: { displayName: 'Lock Duration (min)', displayOrder: 2, group: 'Security' }
    },
    {
      key: 'security.session_timeout',
      category: 'security',
      value: 60,
      dataType: 'number',
      description: 'Session timeout in minutes',
      isPublic: false,
      metadata: { displayName: 'Session Timeout (min)', displayOrder: 3, group: 'Security' }
    },

    // Backup Settings
    {
      key: 'backup.enabled',
      category: 'backup',
      value: true,
      dataType: 'boolean',
      description: 'Enable automatic backups',
      isPublic: false,
      metadata: { displayName: 'Backup Enabled', displayOrder: 1, group: 'Backup' }
    },
    {
      key: 'backup.retention_days',
      category: 'backup',
      value: 30,
      dataType: 'number',
      description: 'Backup retention period in days',
      isPublic: false,
      metadata: { displayName: 'Retention (days)', displayOrder: 2, group: 'Backup' }
    },

    // Feature Flags
    {
      key: 'features.analytics',
      category: 'features',
      value: true,
      dataType: 'boolean',
      description: 'Enable analytics features',
      isPublic: true,
      metadata: { displayName: 'Analytics', displayOrder: 1, group: 'Features' }
    },
    {
      key: 'features.geolocation',
      category: 'features',
      value: true,
      dataType: 'boolean',
      description: 'Enable geolocation features',
      isPublic: true,
      metadata: { displayName: 'Geolocation', displayOrder: 2, group: 'Features' }
    },
    {
      key: 'features.realtime',
      category: 'features',
      value: true,
      dataType: 'boolean',
      description: 'Enable real-time updates',
      isPublic: true,
      metadata: { displayName: 'Real-time Updates', displayOrder: 3, group: 'Features' }
    }
  ];

  for (const settingData of defaultSettings) {
    const exists = await this.findOne({ key: settingData.key });
    if (!exists) {
      await this.create(settingData);
    }
  }

  console.log('✅ Default system settings initialized');
};

module.exports = mongoose.model('SystemSettings', systemSettingsSchema);

const SystemSettings = require('../models/SystemSettings');
const kafkaClient = require('../config/kafka');
const redisClient = require('../config/redis');

// Get all settings or by category
exports.getSettings = async (req, res) => {
  try {
    const { category, includeNonPublic } = req.query;

    let settings;

    if (category) {
      const isAdmin = req.isAdmin || false; // Should be set by auth middleware
      settings = await SystemSettings.getByCategory(category, isAdmin || includeNonPublic === 'true');
    } else {
      const query = {};
      if (!req.isAdmin && includeNonPublic !== 'true') {
        query.isPublic = true;
      }
      settings = await SystemSettings.find(query).sort({ category: 1, 'metadata.displayOrder': 1 });
    }

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Error getting settings:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting settings',
      error: error.message
    });
  }
};

// Get setting by key
exports.getSettingByKey = async (req, res) => {
  try {
    const { key } = req.params;

    const setting = await SystemSettings.findOne({ key });

    if (!setting) {
      return res.status(404).json({
        success: false,
        message: 'Setting not found'
      });
    }

    // Check if user has permission to view this setting
    if (!setting.isPublic && !req.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: setting
    });
  } catch (error) {
    console.error('Error getting setting:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting setting',
      error: error.message
    });
  }
};

// Update setting
exports.updateSetting = async (req, res) => {
  try {
    const userId = req.userId || req.headers['x-user-id'];
    const { key } = req.params;
    const { value } = req.body;

    if (value === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Value is required'
      });
    }

    const oldSetting = await SystemSettings.findOne({ key });

    if (!oldSetting) {
      return res.status(404).json({
        success: false,
        message: 'Setting not found'
      });
    }

    const setting = await SystemSettings.updateSetting(key, value, userId);

    // Invalidate cache for this setting
    await redisClient.del(`setting:${key}`);

    // Publish event
    await kafkaClient.publish('audit.log', {
      eventId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      eventType: 'system.setting_updated',
      timestamp: new Date().toISOString(),
      userId,
      payload: {
        key,
        category: setting.category,
        changes: {
          before: oldSetting.value,
          after: setting.value
        }
      }
    });

    res.json({
      success: true,
      message: 'Setting updated successfully',
      data: setting
    });
  } catch (error) {
    console.error('Error updating setting:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating setting',
      error: error.message
    });
  }
};

// Bulk update settings
exports.bulkUpdateSettings = async (req, res) => {
  try {
    const userId = req.userId || req.headers['x-user-id'];
    const { settings } = req.body;

    if (!Array.isArray(settings)) {
      return res.status(400).json({
        success: false,
        message: 'Settings must be an array'
      });
    }

    const results = [];
    const errors = [];

    for (const { key, value } of settings) {
      try {
        const setting = await SystemSettings.updateSetting(key, value, userId);
        await redisClient.del(`setting:${key}`);
        results.push({ key, success: true });
      } catch (error) {
        errors.push({ key, error: error.message });
      }
    }

    // Publish event
    await kafkaClient.publish('audit.log', {
      eventId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      eventType: 'system.bulk_settings_updated',
      timestamp: new Date().toISOString(),
      userId,
      payload: {
        totalSettings: settings.length,
        successful: results.length,
        failed: errors.length
      }
    });

    res.json({
      success: true,
      message: 'Bulk update completed',
      data: {
        results,
        errors
      }
    });
  } catch (error) {
    console.error('Error in bulk update:', error);
    res.status(500).json({
      success: false,
      message: 'Error performing bulk update',
      error: error.message
    });
  }
};

// Reset setting to default
exports.resetSetting = async (req, res) => {
  try {
    const userId = req.userId || req.headers['x-user-id'];
    const { key } = req.params;

    // This would require storing default values
    // For now, return an error
    res.status(501).json({
      success: false,
      message: 'Reset to default not implemented'
    });
  } catch (error) {
    console.error('Error resetting setting:', error);
    res.status(500).json({
      success: false,
      message: 'Error resetting setting',
      error: error.message
    });
  }
};

// Initialize default settings
exports.initializeDefaults = async (req, res) => {
  try {
    const userId = req.userId || req.headers['x-user-id'];

    await SystemSettings.initializeDefaults();

    // Publish event
    await kafkaClient.publish('audit.log', {
      eventId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      eventType: 'system.settings_initialized',
      timestamp: new Date().toISOString(),
      userId
    });

    res.json({
      success: true,
      message: 'Default settings initialized successfully'
    });
  } catch (error) {
    console.error('Error initializing defaults:', error);
    res.status(500).json({
      success: false,
      message: 'Error initializing defaults',
      error: error.message
    });
  }
};

module.exports = exports;

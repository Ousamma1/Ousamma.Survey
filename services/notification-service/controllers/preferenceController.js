const NotificationPreference = require('../models/NotificationPreference');

class PreferenceController {
  /**
   * Get user preferences
   */
  async getPreferences(req, res) {
    try {
      const { userId } = req.params;

      const preferences = await NotificationPreference.getOrCreate(userId);

      res.json({
        success: true,
        preferences
      });
    } catch (error) {
      console.error('Error fetching preferences:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Update user preferences
   */
  async updatePreferences(req, res) {
    try {
      const { userId } = req.params;
      const updates = req.body;

      let preferences = await NotificationPreference.findOne({ userId });

      if (!preferences) {
        preferences = await NotificationPreference.create({
          userId,
          ...updates
        });
      } else {
        Object.assign(preferences, updates);
        await preferences.save();
      }

      res.json({
        success: true,
        preferences
      });
    } catch (error) {
      console.error('Error updating preferences:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Add device token
   */
  async addDeviceToken(req, res) {
    try {
      const { userId } = req.params;
      const { token, platform } = req.body;

      if (!token || !platform) {
        return res.status(400).json({
          success: false,
          error: 'Token and platform are required'
        });
      }

      const preferences = await NotificationPreference.getOrCreate(userId);
      await preferences.addDeviceToken(token, platform);

      res.json({
        success: true,
        message: 'Device token added successfully',
        preferences
      });
    } catch (error) {
      console.error('Error adding device token:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Remove device token
   */
  async removeDeviceToken(req, res) {
    try {
      const { userId } = req.params;
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({
          success: false,
          error: 'Token is required'
        });
      }

      const preferences = await NotificationPreference.findOne({ userId });

      if (!preferences) {
        return res.status(404).json({
          success: false,
          error: 'Preferences not found'
        });
      }

      await preferences.removeDeviceToken(token);

      res.json({
        success: true,
        message: 'Device token removed successfully',
        preferences
      });
    } catch (error) {
      console.error('Error removing device token:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Update channel preferences
   */
  async updateChannels(req, res) {
    try {
      const { userId } = req.params;
      const { channels } = req.body;

      const preferences = await NotificationPreference.getOrCreate(userId);
      preferences.channels = { ...preferences.channels, ...channels };
      await preferences.save();

      res.json({
        success: true,
        preferences
      });
    } catch (error) {
      console.error('Error updating channel preferences:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Update category preferences
   */
  async updateCategories(req, res) {
    try {
      const { userId } = req.params;
      const { categories } = req.body;

      const preferences = await NotificationPreference.getOrCreate(userId);
      preferences.categories = { ...preferences.categories, ...categories };
      await preferences.save();

      res.json({
        success: true,
        preferences
      });
    } catch (error) {
      console.error('Error updating category preferences:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = new PreferenceController();

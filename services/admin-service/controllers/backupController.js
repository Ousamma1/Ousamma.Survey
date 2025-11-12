const backupService = require('../services/backupService');
const kafkaClient = require('../config/kafka');

// Trigger backup
exports.triggerBackup = async (req, res) => {
  try {
    const userId = req.userId || req.headers['x-user-id'];

    const result = await backupService.triggerBackup(userId);

    // Publish event
    await kafkaClient.publish('audit.log', {
      eventId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      eventType: 'system.backup_triggered',
      timestamp: new Date().toISOString(),
      userId,
      payload: {
        fileName: result.fileName,
        fileSize: result.fileSize
      }
    });

    res.json({
      success: true,
      message: 'Backup completed successfully',
      data: result
    });
  } catch (error) {
    console.error('Error triggering backup:', error);

    // Log failure event
    await kafkaClient.publish('audit.log', {
      eventId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      eventType: 'system.backup_failed',
      timestamp: new Date().toISOString(),
      userId: req.userId || req.headers['x-user-id'],
      payload: {
        error: error.message
      }
    });

    res.status(500).json({
      success: false,
      message: 'Backup failed',
      error: error.message
    });
  }
};

// List backups
exports.listBackups = async (req, res) => {
  try {
    const backups = await backupService.listBackups();

    res.json({
      success: true,
      data: backups,
      total: backups.length
    });
  } catch (error) {
    console.error('Error listing backups:', error);
    res.status(500).json({
      success: false,
      message: 'Error listing backups',
      error: error.message
    });
  }
};

// Restore backup
exports.restoreBackup = async (req, res) => {
  try {
    const userId = req.userId || req.headers['x-user-id'];
    const { fileName } = req.body;

    if (!fileName) {
      return res.status(400).json({
        success: false,
        message: 'fileName is required'
      });
    }

    const result = await backupService.restoreBackup(fileName, userId);

    // Publish event
    await kafkaClient.publish('audit.log', {
      eventId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      eventType: 'system.backup_restored',
      timestamp: new Date().toISOString(),
      userId,
      payload: {
        fileName
      }
    });

    res.json({
      success: true,
      message: 'Backup restored successfully',
      data: result
    });
  } catch (error) {
    console.error('Error restoring backup:', error);

    // Log failure event
    await kafkaClient.publish('audit.log', {
      eventId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      eventType: 'system.restore_failed',
      timestamp: new Date().toISOString(),
      userId: req.userId || req.headers['x-user-id'],
      payload: {
        fileName: req.body.fileName,
        error: error.message
      }
    });

    res.status(500).json({
      success: false,
      message: error.message || 'Restore failed',
      error: error.message
    });
  }
};

module.exports = exports;

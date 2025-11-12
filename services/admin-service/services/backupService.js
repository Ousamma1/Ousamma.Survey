const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs').promises;
const logger = require('../config/logger');

const execAsync = promisify(exec);

class BackupService {
  constructor() {
    this.backupDir = process.env.BACKUP_DIR || '/tmp/backups';
    this.retentionDays = parseInt(process.env.BACKUP_RETENTION_DAYS || '30');
  }

  // Create backup directory if it doesn't exist
  async ensureBackupDirectory() {
    try {
      await fs.mkdir(this.backupDir, { recursive: true });
      return true;
    } catch (error) {
      logger.error('Error creating backup directory:', error);
      return false;
    }
  }

  // Trigger database backup
  async triggerBackup(userId) {
    try {
      logger.info('Starting database backup...');

      await this.ensureBackupDirectory();

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFileName = `backup-${timestamp}.gz`;
      const backupPath = path.join(this.backupDir, backupFileName);

      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
      const dbName = mongoUri.split('/').pop();

      // Use mongodump command
      const command = `mongodump --uri="${mongoUri}" --gzip --archive="${backupPath}"`;

      const { stdout, stderr } = await execAsync(command);

      if (stderr && !stderr.includes('done')) {
        throw new Error(stderr);
      }

      // Get file size
      const stats = await fs.stat(backupPath);
      const fileSize = stats.size;

      logger.info(`Backup completed: ${backupFileName} (${this.formatBytes(fileSize)})`);

      // Clean old backups
      await this.cleanOldBackups();

      return {
        success: true,
        fileName: backupFileName,
        filePath: backupPath,
        fileSize,
        timestamp: new Date(),
        triggeredBy: userId
      };
    } catch (error) {
      logger.error('Backup failed:', error);
      throw new Error(`Backup failed: ${error.message}`);
    }
  }

  // Clean old backups based on retention policy
  async cleanOldBackups() {
    try {
      const files = await fs.readdir(this.backupDir);
      const now = Date.now();
      const retentionMs = this.retentionDays * 24 * 60 * 60 * 1000;

      for (const file of files) {
        if (!file.startsWith('backup-')) continue;

        const filePath = path.join(this.backupDir, file);
        const stats = await fs.stat(filePath);
        const age = now - stats.mtimeMs;

        if (age > retentionMs) {
          await fs.unlink(filePath);
          logger.info(`Deleted old backup: ${file}`);
        }
      }
    } catch (error) {
      logger.error('Error cleaning old backups:', error);
    }
  }

  // List all backups
  async listBackups() {
    try {
      await this.ensureBackupDirectory();
      const files = await fs.readdir(this.backupDir);
      const backups = [];

      for (const file of files) {
        if (!file.startsWith('backup-')) continue;

        const filePath = path.join(this.backupDir, file);
        const stats = await fs.stat(filePath);

        backups.push({
          fileName: file,
          filePath,
          fileSize: stats.size,
          createdAt: stats.mtime
        });
      }

      // Sort by creation date (newest first)
      backups.sort((a, b) => b.createdAt - a.createdAt);

      return backups;
    } catch (error) {
      logger.error('Error listing backups:', error);
      return [];
    }
  }

  // Restore from backup
  async restoreBackup(backupFileName, userId) {
    try {
      logger.info(`Starting database restore from: ${backupFileName}`);

      const backupPath = path.join(this.backupDir, backupFileName);

      // Check if backup file exists
      try {
        await fs.access(backupPath);
      } catch (error) {
        throw new Error('Backup file not found');
      }

      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';

      // Use mongorestore command
      const command = `mongorestore --uri="${mongoUri}" --gzip --archive="${backupPath}" --drop`;

      const { stdout, stderr } = await execAsync(command);

      if (stderr && !stderr.includes('done')) {
        throw new Error(stderr);
      }

      logger.info(`Restore completed from: ${backupFileName}`);

      return {
        success: true,
        fileName: backupFileName,
        timestamp: new Date(),
        restoredBy: userId
      };
    } catch (error) {
      logger.error('Restore failed:', error);
      throw new Error(`Restore failed: ${error.message}`);
    }
  }

  // Format bytes to human readable format
  formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }
}

module.exports = new BackupService();

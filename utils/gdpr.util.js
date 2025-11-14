/**
 * GDPR Compliance Utility
 * Data export, deletion, consent management, and privacy features
 */

const fs = require('fs').promises;
const path = require('path');
const securityConfig = require('../config/security.config');
const encryptionUtil = require('./encryption.util');

/**
 * GDPR Data Export
 */
class DataExportService {
  /**
   * Export user data in specified format
   * @param {Object} userData - User data to export
   * @param {string} format - Export format (json, csv, xml)
   * @param {boolean} includeFiles - Include file attachments
   * @returns {Object} - Export result with data and metadata
   */
  static async exportUserData(userData, format = 'json', includeFiles = false) {
    try {
      const exportData = {
        exportDate: new Date().toISOString(),
        dataSubject: {
          userId: userData.id,
          email: userData.email
        },
        personalData: this.collectPersonalData(userData),
        activityData: this.collectActivityData(userData),
        preferences: this.collectPreferences(userData),
        consents: this.collectConsents(userData)
      };

      if (includeFiles) {
        exportData.files = await this.collectFiles(userData.id);
      }

      // Format data
      let formattedData;
      switch (format.toLowerCase()) {
        case 'json':
          formattedData = JSON.stringify(exportData, null, 2);
          break;
        case 'csv':
          formattedData = this.convertToCSV(exportData);
          break;
        case 'xml':
          formattedData = this.convertToXML(exportData);
          break;
        default:
          formattedData = JSON.stringify(exportData, null, 2);
      }

      return {
        format,
        data: formattedData,
        metadata: {
          exportedAt: new Date().toISOString(),
          recordCount: this.countRecords(exportData),
          includesFiles: includeFiles
        }
      };
    } catch (error) {
      console.error('Data export error:', error);
      throw new Error('Failed to export user data');
    }
  }

  /**
   * Collect personal data
   * @param {Object} userData - User data
   * @returns {Object} - Personal data
   */
  static collectPersonalData(userData) {
    return {
      profile: {
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        phone: userData.phone,
        dateOfBirth: userData.dateOfBirth,
        address: userData.address,
        createdAt: userData.createdAt,
        updatedAt: userData.updatedAt
      },
      authentication: {
        lastLogin: userData.lastLogin,
        twoFactorEnabled: userData.twoFactorEnabled,
        accountStatus: userData.accountStatus
      }
    };
  }

  /**
   * Collect activity data
   * @param {Object} userData - User data
   * @returns {Object} - Activity data
   */
  static collectActivityData(userData) {
    return {
      surveys: userData.surveys || [],
      responses: userData.responses || [],
      projects: userData.projects || [],
      loginHistory: userData.loginHistory || [],
      activityLog: userData.activityLog || []
    };
  }

  /**
   * Collect user preferences
   * @param {Object} userData - User data
   * @returns {Object} - Preferences
   */
  static collectPreferences(userData) {
    return {
      notifications: userData.notificationPreferences || {},
      privacy: userData.privacySettings || {},
      language: userData.language || 'en',
      timezone: userData.timezone || 'UTC'
    };
  }

  /**
   * Collect consent records
   * @param {Object} userData - User data
   * @returns {Array} - Consent records
   */
  static collectConsents(userData) {
    return userData.consents || [];
  }

  /**
   * Collect user files
   * @param {string} userId - User ID
   * @returns {Array} - File metadata
   */
  static async collectFiles(userId) {
    // This would query your file storage system
    // Placeholder implementation
    return [];
  }

  /**
   * Convert data to CSV format
   * @param {Object} data - Data to convert
   * @returns {string} - CSV string
   */
  static convertToCSV(data) {
    const rows = [];
    rows.push('Category,Field,Value');

    const flattenObject = (obj, prefix = '') => {
      for (const [key, value] of Object.entries(obj)) {
        const path = prefix ? `${prefix}.${key}` : key;
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          flattenObject(value, path);
        } else {
          const csvValue = Array.isArray(value) ? JSON.stringify(value) : value;
          rows.push(`"${prefix}","${key}","${csvValue}"`);
        }
      }
    };

    flattenObject(data);
    return rows.join('\n');
  }

  /**
   * Convert data to XML format
   * @param {Object} data - Data to convert
   * @returns {string} - XML string
   */
  static convertToXML(data) {
    const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>\n';

    const objectToXML = (obj, indent = 0) => {
      const indentStr = '  '.repeat(indent);
      let xml = '';

      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          xml += `${indentStr}<${key}>\n${objectToXML(value, indent + 1)}${indentStr}</${key}>\n`;
        } else if (Array.isArray(value)) {
          xml += `${indentStr}<${key}>${JSON.stringify(value)}</${key}>\n`;
        } else {
          xml += `${indentStr}<${key}>${value}</${key}>\n`;
        }
      }

      return xml;
    };

    return xmlHeader + '<UserDataExport>\n' + objectToXML(data, 1) + '</UserDataExport>';
  }

  /**
   * Count records in export
   * @param {Object} data - Export data
   * @returns {number} - Record count
   */
  static countRecords(data) {
    let count = 0;

    const countObjects = (obj) => {
      for (const value of Object.values(obj)) {
        if (Array.isArray(value)) {
          count += value.length;
        } else if (typeof value === 'object' && value !== null) {
          countObjects(value);
        }
      }
    };

    countObjects(data);
    return count;
  }
}

/**
 * GDPR Data Deletion
 */
class DataDeletionService {
  /**
   * Delete user data (Right to be Forgotten)
   * @param {string} userId - User ID
   * @param {Object} options - Deletion options
   * @returns {Object} - Deletion result
   */
  static async deleteUserData(userId, options = {}) {
    const deletionLog = {
      userId,
      timestamp: new Date().toISOString(),
      requestedBy: options.requestedBy || userId,
      deletedData: []
    };

    try {
      // Soft delete or anonymize based on legal requirements
      const method = options.hardDelete ? 'hard' : 'soft';

      if (method === 'hard') {
        // Permanently delete all user data
        deletionLog.deletedData.push(await this.hardDeleteUser(userId));
      } else {
        // Anonymize data for compliance
        deletionLog.deletedData.push(await this.anonymizeUser(userId));
      }

      // Delete or anonymize related data
      deletionLog.deletedData.push(await this.deleteUserSurveys(userId, method));
      deletionLog.deletedData.push(await this.deleteUserResponses(userId, method));
      deletionLog.deletedData.push(await this.deleteUserProjects(userId, method));
      deletionLog.deletedData.push(await this.deleteUserFiles(userId, method));
      deletionLog.deletedData.push(await this.deleteUserSessions(userId));
      deletionLog.deletedData.push(await this.deleteUserTokens(userId));

      // Keep audit log for legal compliance
      await this.createDeletionAuditLog(deletionLog);

      return {
        success: true,
        deletionMethod: method,
        timestamp: deletionLog.timestamp,
        message: 'User data has been deleted successfully'
      };
    } catch (error) {
      console.error('Data deletion error:', error);
      throw new Error('Failed to delete user data');
    }
  }

  /**
   * Hard delete user (permanent deletion)
   * @param {string} userId - User ID
   * @returns {Object} - Deletion result
   */
  static async hardDeleteUser(userId) {
    // Implement actual database deletion
    return { entity: 'user', userId, method: 'deleted', count: 1 };
  }

  /**
   * Anonymize user data (GDPR-compliant)
   * @param {string} userId - User ID
   * @returns {Object} - Anonymization result
   */
  static async anonymizeUser(userId) {
    const anonymousId = `anon_${encryptionUtil.generateToken(16)}`;

    // Replace PII with anonymous data
    const anonymousData = {
      email: `${anonymousId}@deleted.local`,
      firstName: 'Deleted',
      lastName: 'User',
      phone: null,
      address: null,
      dateOfBirth: null,
      deletedAt: new Date(),
      anonymized: true
    };

    // Update user record with anonymous data
    // Implement actual database update
    return { entity: 'user', userId, method: 'anonymized', count: 1 };
  }

  /**
   * Delete user surveys
   * @param {string} userId - User ID
   * @param {string} method - Deletion method
   * @returns {Object} - Deletion result
   */
  static async deleteUserSurveys(userId, method) {
    // Implement actual database deletion/anonymization
    return { entity: 'surveys', userId, method, count: 0 };
  }

  /**
   * Delete user responses
   * @param {string} userId - User ID
   * @param {string} method - Deletion method
   * @returns {Object} - Deletion result
   */
  static async deleteUserResponses(userId, method) {
    // Implement actual database deletion/anonymization
    return { entity: 'responses', userId, method, count: 0 };
  }

  /**
   * Delete user projects
   * @param {string} userId - User ID
   * @param {string} method - Deletion method
   * @returns {Object} - Deletion result
   */
  static async deleteUserProjects(userId, method) {
    // Implement actual database deletion/anonymization
    return { entity: 'projects', userId, method, count: 0 };
  }

  /**
   * Delete user files
   * @param {string} userId - User ID
   * @param {string} method - Deletion method
   * @returns {Object} - Deletion result
   */
  static async deleteUserFiles(userId, method) {
    // Implement actual file deletion
    return { entity: 'files', userId, method, count: 0 };
  }

  /**
   * Delete user sessions
   * @param {string} userId - User ID
   * @returns {Object} - Deletion result
   */
  static async deleteUserSessions(userId) {
    // Implement actual session deletion
    return { entity: 'sessions', userId, method: 'deleted', count: 0 };
  }

  /**
   * Delete user tokens
   * @param {string} userId - User ID
   * @returns {Object} - Deletion result
   */
  static async deleteUserTokens(userId) {
    // Implement actual token deletion
    return { entity: 'tokens', userId, method: 'deleted', count: 0 };
  }

  /**
   * Create audit log for deletion
   * @param {Object} deletionLog - Deletion log data
   */
  static async createDeletionAuditLog(deletionLog) {
    // Store deletion audit log (must be retained for legal compliance)
    console.info('GDPR Deletion Audit Log:', JSON.stringify(deletionLog));
  }
}

/**
 * Consent Management
 */
class ConsentManager {
  /**
   * Record user consent
   * @param {string} userId - User ID
   * @param {string} consentType - Type of consent
   * @param {boolean} granted - Whether consent is granted
   * @param {Object} metadata - Additional metadata
   * @returns {Object} - Consent record
   */
  static async recordConsent(userId, consentType, granted, metadata = {}) {
    const consent = {
      userId,
      consentType,
      granted,
      timestamp: new Date().toISOString(),
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      version: metadata.version || '1.0',
      expiresAt: metadata.expiresAt || null
    };

    // Store consent record
    // Implement actual database storage
    console.info('Consent recorded:', consent);

    return consent;
  }

  /**
   * Get user consents
   * @param {string} userId - User ID
   * @returns {Array} - Array of consent records
   */
  static async getUserConsents(userId) {
    // Retrieve consent records from database
    // Placeholder implementation
    return [];
  }

  /**
   * Check if user has given consent
   * @param {string} userId - User ID
   * @param {string} consentType - Type of consent
   * @returns {boolean} - True if consent granted
   */
  static async hasConsent(userId, consentType) {
    const consents = await this.getUserConsents(userId);
    const consent = consents.find(c => c.consentType === consentType);

    if (!consent) return false;

    // Check if consent is expired
    if (consent.expiresAt && new Date(consent.expiresAt) < new Date()) {
      return false;
    }

    return consent.granted;
  }

  /**
   * Withdraw consent
   * @param {string} userId - User ID
   * @param {string} consentType - Type of consent
   * @returns {Object} - Updated consent record
   */
  static async withdrawConsent(userId, consentType) {
    return this.recordConsent(userId, consentType, false, {
      action: 'withdrawn'
    });
  }

  /**
   * Get consent types
   * @returns {Array} - Array of consent types
   */
  static getConsentTypes() {
    return [
      {
        type: 'essential',
        name: 'Essential Cookies',
        description: 'Required for the website to function',
        required: true
      },
      {
        type: 'analytics',
        name: 'Analytics Cookies',
        description: 'Help us understand how visitors use our website',
        required: false
      },
      {
        type: 'marketing',
        name: 'Marketing Cookies',
        description: 'Used to deliver relevant advertisements',
        required: false
      },
      {
        type: 'dataProcessing',
        name: 'Data Processing',
        description: 'Consent to process personal data',
        required: true
      },
      {
        type: 'communications',
        name: 'Email Communications',
        description: 'Receive newsletters and updates',
        required: false
      }
    ];
  }
}

/**
 * Data Retention Policy
 */
class DataRetentionService {
  /**
   * Check and cleanup old data based on retention policy
   */
  static async enforceRetentionPolicy() {
    const now = new Date();

    // Delete data older than retention period
    const retentionDate = new Date(
      now.getTime() - securityConfig.gdpr.dataRetentionDays * 24 * 60 * 60 * 1000
    );

    // Delete inactive accounts
    const inactiveDate = new Date(
      now.getTime() - securityConfig.gdpr.inactiveDeletionDays * 24 * 60 * 60 * 1000
    );

    console.info(`Enforcing data retention policy: retention date=${retentionDate}, inactive date=${inactiveDate}`);

    // Implement actual data cleanup
    // This would query and delete/anonymize old data
  }

  /**
   * Mark data for deletion
   * @param {string} dataType - Type of data
   * @param {string} dataId - Data ID
   * @param {Date} deletionDate - Scheduled deletion date
   */
  static async scheduleDataDeletion(dataType, dataId, deletionDate) {
    // Schedule data for future deletion
    console.info(`Scheduled ${dataType} ${dataId} for deletion on ${deletionDate}`);
  }
}

module.exports = {
  DataExportService,
  DataDeletionService,
  ConsentManager,
  DataRetentionService
};

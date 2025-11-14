/**
 * API Key Management Utility
 * Handles API key generation, validation, and management
 */

const encryptionUtil = require('./encryption.util');
const securityConfig = require('../config/security.config');

/**
 * API Key Manager
 */
class ApiKeyManager {
  /**
   * Generate new API key
   * @param {Object} options - API key options
   * @returns {Object} - API key data
   */
  static generateApiKey(options = {}) {
    const {
      userId,
      name,
      description,
      permissions = ['read'],
      expiresIn = securityConfig.apiKey.expiryDays
    } = options;

    // Generate API key
    const apiKey = encryptionUtil.generateApiKey(securityConfig.apiKey.prefix);
    const apiKeyHash = encryptionUtil.hashApiKey(apiKey);

    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresIn);

    // Create API key record
    const apiKeyRecord = {
      userId,
      name,
      description,
      keyHash: apiKeyHash,
      keyPrefix: apiKey.substring(0, 12) + '...', // Store prefix for identification
      permissions,
      createdAt: new Date(),
      expiresAt,
      lastUsedAt: null,
      usageCount: 0,
      active: true,
      rotationDue: new Date(Date.now() + securityConfig.apiKey.rotationDays * 24 * 60 * 60 * 1000)
    };

    return {
      apiKey, // Return plain key only once
      record: apiKeyRecord
    };
  }

  /**
   * Validate API key
   * @param {string} apiKey - API key to validate
   * @param {Object} storedRecord - Stored API key record from database
   * @returns {Object} - Validation result
   */
  static validateApiKey(apiKey, storedRecord) {
    const result = {
      valid: false,
      reason: null,
      record: null
    };

    // Check if key exists
    if (!storedRecord) {
      result.reason = 'API key not found';
      return result;
    }

    // Check if key is active
    if (!storedRecord.active) {
      result.reason = 'API key is inactive';
      return result;
    }

    // Check expiration
    if (storedRecord.expiresAt && new Date() > new Date(storedRecord.expiresAt)) {
      result.reason = 'API key has expired';
      return result;
    }

    // Verify key hash
    const apiKeyHash = encryptionUtil.hashApiKey(apiKey);
    if (apiKeyHash !== storedRecord.keyHash) {
      result.reason = 'Invalid API key';
      return result;
    }

    // Check if rotation is due
    if (storedRecord.rotationDue && new Date() > new Date(storedRecord.rotationDue)) {
      result.warning = 'API key rotation is due';
    }

    result.valid = true;
    result.record = storedRecord;
    return result;
  }

  /**
   * Rotate API key
   * @param {Object} oldKeyRecord - Old API key record
   * @returns {Object} - New API key data
   */
  static rotateApiKey(oldKeyRecord) {
    // Generate new key with same settings
    const newKey = this.generateApiKey({
      userId: oldKeyRecord.userId,
      name: oldKeyRecord.name,
      description: oldKeyRecord.description,
      permissions: oldKeyRecord.permissions,
      expiresIn: securityConfig.apiKey.expiryDays
    });

    // Mark old key for deletion after grace period (7 days)
    const gracePeriodEnd = new Date();
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 7);

    return {
      newKey: newKey.apiKey,
      newRecord: newKey.record,
      oldKeyExpiresAt: gracePeriodEnd
    };
  }

  /**
   * Revoke API key
   * @param {string} keyId - API key ID
   * @returns {Object} - Revocation result
   */
  static revokeApiKey(keyId) {
    return {
      keyId,
      revoked: true,
      revokedAt: new Date()
    };
  }

  /**
   * Update API key usage
   * @param {Object} keyRecord - API key record
   * @returns {Object} - Updated usage data
   */
  static updateUsage(keyRecord) {
    return {
      lastUsedAt: new Date(),
      usageCount: (keyRecord.usageCount || 0) + 1
    };
  }

  /**
   * Check if user has reached max keys limit
   * @param {number} currentKeyCount - Current number of keys
   * @returns {boolean} - True if limit reached
   */
  static hasReachedLimit(currentKeyCount) {
    return currentKeyCount >= securityConfig.apiKey.maxKeysPerUser;
  }

  /**
   * Generate service-to-service API key
   * @param {string} serviceName - Name of the service
   * @returns {Object} - Service API key data
   */
  static generateServiceKey(serviceName) {
    const apiKey = encryptionUtil.generateApiKey(securityConfig.serviceSecurity.serviceKeyPrefix);
    const apiKeyHash = encryptionUtil.hashApiKey(apiKey);

    const keyRecord = {
      serviceName,
      keyHash: apiKeyHash,
      keyPrefix: apiKey.substring(0, 12) + '...',
      permissions: ['service'],
      createdAt: new Date(),
      expiresAt: null, // Service keys don't expire
      active: true,
      rotationDue: new Date(Date.now() + securityConfig.serviceSecurity.keyRotationDays * 24 * 60 * 60 * 1000)
    };

    return {
      apiKey,
      record: keyRecord
    };
  }

  /**
   * Mask API key for display
   * @param {string} apiKey - API key to mask
   * @returns {string} - Masked API key
   */
  static maskApiKey(apiKey) {
    if (!apiKey) return '';
    const prefix = apiKey.substring(0, 12);
    return `${prefix}...`;
  }

  /**
   * Get API key statistics
   * @param {Array} apiKeys - Array of API key records
   * @returns {Object} - Statistics
   */
  static getStatistics(apiKeys) {
    const now = new Date();

    return {
      total: apiKeys.length,
      active: apiKeys.filter(k => k.active).length,
      expired: apiKeys.filter(k => k.expiresAt && new Date(k.expiresAt) < now).length,
      rotationDue: apiKeys.filter(k => k.rotationDue && new Date(k.rotationDue) < now).length,
      totalUsage: apiKeys.reduce((sum, k) => sum + (k.usageCount || 0), 0)
    };
  }
}

module.exports = ApiKeyManager;

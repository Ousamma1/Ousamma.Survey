/**
 * Encryption Utility
 * Handles encryption/decryption of sensitive data at rest
 */

const crypto = require('crypto');
const securityConfig = require('../config/security.config');

class EncryptionUtil {
  constructor() {
    this.algorithm = securityConfig.encryption.algorithm;
    this.keyLength = securityConfig.encryption.keyLength;
    this.ivLength = securityConfig.encryption.ivLength;
    this.tagLength = securityConfig.encryption.tagLength;
    this.saltLength = securityConfig.encryption.saltLength;
    this.iterations = securityConfig.encryption.iterations;
    this.digest = securityConfig.encryption.digest;

    // Derive key from the encryption key in config
    this.masterKey = this.deriveKey(securityConfig.encryption.encryptionKey);
  }

  /**
   * Derive a cryptographic key from a password/secret
   * @param {string} password - The password to derive key from
   * @param {Buffer} salt - Optional salt (generated if not provided)
   * @returns {Object} - Object containing key and salt
   */
  deriveKey(password, salt = null) {
    if (!salt) {
      salt = crypto.randomBytes(this.saltLength);
    }

    const key = crypto.pbkdf2Sync(
      password,
      salt,
      this.iterations,
      this.keyLength,
      this.digest
    );

    return { key, salt };
  }

  /**
   * Encrypt data using AES-256-GCM
   * @param {string|Object} data - Data to encrypt (string or object)
   * @returns {string} - Encrypted data in format: salt:iv:authTag:encryptedData (base64)
   */
  encrypt(data) {
    try {
      // Convert object to string if necessary
      const plaintext = typeof data === 'object' ? JSON.stringify(data) : String(data);

      // Generate random IV
      const iv = crypto.randomBytes(this.ivLength);

      // Create cipher
      const cipher = crypto.createCipheriv(this.algorithm, this.masterKey.key, iv);

      // Encrypt data
      let encrypted = cipher.update(plaintext, 'utf8', 'base64');
      encrypted += cipher.final('base64');

      // Get auth tag
      const authTag = cipher.getAuthTag();

      // Return format: salt:iv:authTag:encryptedData (all base64 encoded)
      return [
        this.masterKey.salt.toString('base64'),
        iv.toString('base64'),
        authTag.toString('base64'),
        encrypted
      ].join(':');

    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt data using AES-256-GCM
   * @param {string} encryptedData - Encrypted data in format: salt:iv:authTag:encryptedData
   * @param {boolean} parseJSON - Whether to parse result as JSON
   * @returns {string|Object} - Decrypted data
   */
  decrypt(encryptedData, parseJSON = false) {
    try {
      // Split the encrypted data
      const parts = encryptedData.split(':');
      if (parts.length !== 4) {
        throw new Error('Invalid encrypted data format');
      }

      const [saltB64, ivB64, authTagB64, encrypted] = parts;

      // Convert from base64
      const salt = Buffer.from(saltB64, 'base64');
      const iv = Buffer.from(ivB64, 'base64');
      const authTag = Buffer.from(authTagB64, 'base64');

      // Derive key from salt
      const { key } = this.deriveKey(securityConfig.encryption.encryptionKey, salt);

      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
      decipher.setAuthTag(authTag);

      // Decrypt
      let decrypted = decipher.update(encrypted, 'base64', 'utf8');
      decrypted += decipher.final('utf8');

      // Parse JSON if requested
      if (parseJSON) {
        try {
          return JSON.parse(decrypted);
        } catch {
          return decrypted;
        }
      }

      return decrypted;

    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Hash data using SHA-256
   * @param {string} data - Data to hash
   * @returns {string} - Hashed data (hex)
   */
  hash(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Generate a secure random token
   * @param {number} length - Length in bytes (default 32)
   * @returns {string} - Random token (hex)
   */
  generateToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate a secure random API key
   * @param {string} prefix - Prefix for the key
   * @returns {string} - API key with prefix
   */
  generateApiKey(prefix = securityConfig.apiKey.prefix) {
    const randomBytes = crypto.randomBytes(securityConfig.apiKey.length);
    const key = randomBytes.toString('base64url');
    return `${prefix}${key}`;
  }

  /**
   * Hash an API key for storage
   * @param {string} apiKey - The API key to hash
   * @returns {string} - Hashed API key
   */
  hashApiKey(apiKey) {
    return crypto
      .createHash('sha256')
      .update(apiKey)
      .digest('hex');
  }

  /**
   * Verify an API key against a hash
   * @param {string} apiKey - The API key to verify
   * @param {string} hash - The hash to verify against
   * @returns {boolean} - True if valid
   */
  verifyApiKey(apiKey, hash) {
    const apiKeyHash = this.hashApiKey(apiKey);
    return crypto.timingSafeEqual(
      Buffer.from(apiKeyHash),
      Buffer.from(hash)
    );
  }

  /**
   * Encrypt sensitive fields in an object
   * @param {Object} obj - Object containing sensitive fields
   * @param {Array<string>} fields - Fields to encrypt
   * @returns {Object} - Object with encrypted fields
   */
  encryptFields(obj, fields = []) {
    const result = { ...obj };

    fields.forEach(field => {
      if (result[field] !== undefined && result[field] !== null) {
        result[field] = this.encrypt(result[field]);
      }
    });

    return result;
  }

  /**
   * Decrypt sensitive fields in an object
   * @param {Object} obj - Object containing encrypted fields
   * @param {Array<string>} fields - Fields to decrypt
   * @returns {Object} - Object with decrypted fields
   */
  decryptFields(obj, fields = []) {
    const result = { ...obj };

    fields.forEach(field => {
      if (result[field] !== undefined && result[field] !== null) {
        try {
          result[field] = this.decrypt(result[field]);
        } catch (error) {
          console.error(`Failed to decrypt field ${field}:`, error);
        }
      }
    });

    return result;
  }

  /**
   * Generate a password reset token
   * @returns {Object} - Object containing token and hash
   */
  generateResetToken() {
    const token = this.generateToken(32);
    const hash = this.hash(token);
    const expiresAt = new Date(Date.now() + securityConfig.password.resetTokenExpiry);

    return { token, hash, expiresAt };
  }

  /**
   * Verify a password reset token
   * @param {string} token - Token to verify
   * @param {string} hash - Stored hash
   * @param {Date} expiresAt - Expiration date
   * @returns {boolean} - True if valid
   */
  verifyResetToken(token, hash, expiresAt) {
    if (new Date() > new Date(expiresAt)) {
      return false;
    }

    const tokenHash = this.hash(token);
    return crypto.timingSafeEqual(
      Buffer.from(tokenHash),
      Buffer.from(hash)
    );
  }

  /**
   * Encrypt file data
   * @param {Buffer} fileBuffer - File buffer to encrypt
   * @returns {Object} - Object containing encrypted buffer and metadata
   */
  encryptFile(fileBuffer) {
    try {
      const iv = crypto.randomBytes(this.ivLength);
      const cipher = crypto.createCipheriv(this.algorithm, this.masterKey.key, iv);

      const encrypted = Buffer.concat([
        cipher.update(fileBuffer),
        cipher.final()
      ]);

      const authTag = cipher.getAuthTag();

      return {
        data: encrypted,
        iv: iv.toString('base64'),
        authTag: authTag.toString('base64'),
        salt: this.masterKey.salt.toString('base64')
      };
    } catch (error) {
      console.error('File encryption error:', error);
      throw new Error('Failed to encrypt file');
    }
  }

  /**
   * Decrypt file data
   * @param {Buffer} encryptedBuffer - Encrypted file buffer
   * @param {string} ivB64 - IV in base64
   * @param {string} authTagB64 - Auth tag in base64
   * @param {string} saltB64 - Salt in base64
   * @returns {Buffer} - Decrypted file buffer
   */
  decryptFile(encryptedBuffer, ivB64, authTagB64, saltB64) {
    try {
      const iv = Buffer.from(ivB64, 'base64');
      const authTag = Buffer.from(authTagB64, 'base64');
      const salt = Buffer.from(saltB64, 'base64');

      const { key } = this.deriveKey(securityConfig.encryption.encryptionKey, salt);

      const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
      decipher.setAuthTag(authTag);

      const decrypted = Buffer.concat([
        decipher.update(encryptedBuffer),
        decipher.final()
      ]);

      return decrypted;
    } catch (error) {
      console.error('File decryption error:', error);
      throw new Error('Failed to decrypt file');
    }
  }
}

// Export singleton instance
module.exports = new EncryptionUtil();

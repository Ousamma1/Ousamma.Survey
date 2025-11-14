/**
 * Authentication Utility
 * Password complexity, brute force protection, 2FA, and account lockout
 */

const bcrypt = require('bcryptjs');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const securityConfig = require('../config/security.config');
const encryptionUtil = require('./encryption.util');

/**
 * Password Complexity Checker
 */
class PasswordUtil {
  /**
   * Validate password against security requirements
   * @param {string} password - Password to validate
   * @returns {Object} - Validation result
   */
  static validateComplexity(password) {
    const errors = [];
    const config = securityConfig.password;

    if (!password) {
      return { valid: false, errors: ['Password is required'] };
    }

    if (password.length < config.minLength) {
      errors.push(`Password must be at least ${config.minLength} characters long`);
    }

    if (password.length > config.maxLength) {
      errors.push(`Password must not exceed ${config.maxLength} characters`);
    }

    if (config.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (config.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (config.requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (config.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    // Check for common weak passwords
    const weakPasswords = [
      'password', 'Password123', '12345678', 'qwerty', 'abc123',
      'password1', 'Password1', '123456789', 'welcome', 'admin123'
    ];

    if (weakPasswords.includes(password)) {
      errors.push('Password is too common. Please choose a stronger password');
    }

    // Check for sequential characters
    if (/(.)\1{2,}/.test(password)) {
      errors.push('Password contains too many repeated characters');
    }

    // Check for keyboard patterns
    const patterns = ['qwerty', 'asdfgh', '123456', 'abcdef'];
    if (patterns.some(pattern => password.toLowerCase().includes(pattern))) {
      errors.push('Password contains keyboard patterns');
    }

    return {
      valid: errors.length === 0,
      errors,
      strength: this.calculateStrength(password)
    };
  }

  /**
   * Calculate password strength score
   * @param {string} password - Password to evaluate
   * @returns {Object} - Strength score and level
   */
  static calculateStrength(password) {
    let score = 0;

    // Length
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (password.length >= 16) score += 1;

    // Character variety
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[^a-zA-Z0-9]/.test(password)) score += 1;

    // Additional complexity
    if (/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) score += 1;

    const level = score <= 3 ? 'weak' : score <= 5 ? 'medium' : score <= 7 ? 'strong' : 'very-strong';

    return { score, level };
  }

  /**
   * Hash password
   * @param {string} password - Plain text password
   * @returns {Promise<string>} - Hashed password
   */
  static async hash(password) {
    return bcrypt.hash(password, securityConfig.password.saltRounds);
  }

  /**
   * Verify password
   * @param {string} password - Plain text password
   * @param {string} hash - Hashed password
   * @returns {Promise<boolean>} - True if password matches
   */
  static async verify(password, hash) {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate temporary password
   * @returns {string} - Temporary password
   */
  static generateTemporary() {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';

    // Ensure at least one of each required character type
    password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
    password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
    password += '0123456789'[Math.floor(Math.random() * 10)];
    password += '!@#$%^&*'[Math.floor(Math.random() * 8)];

    // Fill remaining characters
    for (let i = password.length; i < length; i++) {
      password += charset[Math.floor(Math.random() * charset.length)];
    }

    // Shuffle password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }
}

/**
 * Brute Force Protection
 * Tracks failed login attempts and implements account lockout
 */
class BruteForceProtection {
  constructor() {
    this.attempts = new Map(); // In-memory store (use Redis in production)
  }

  /**
   * Record failed login attempt
   * @param {string} identifier - User email or IP
   * @returns {Object} - Attempt info
   */
  recordFailedAttempt(identifier) {
    const key = `login:${identifier}`;
    const now = Date.now();

    let attemptData = this.attempts.get(key) || {
      count: 0,
      firstAttempt: now,
      lastAttempt: now,
      lockedUntil: null
    };

    // Reset if outside window
    if (now - attemptData.firstAttempt > 15 * 60 * 1000) { // 15 minutes
      attemptData = {
        count: 1,
        firstAttempt: now,
        lastAttempt: now,
        lockedUntil: null
      };
    } else {
      attemptData.count += 1;
      attemptData.lastAttempt = now;

      // Lock account if max attempts reached
      if (attemptData.count >= securityConfig.password.maxAttempts) {
        attemptData.lockedUntil = now + securityConfig.password.lockoutDuration;
      }
    }

    this.attempts.set(key, attemptData);
    return attemptData;
  }

  /**
   * Check if account is locked
   * @param {string} identifier - User email or IP
   * @returns {Object} - Lock status
   */
  isLocked(identifier) {
    const key = `login:${identifier}`;
    const attemptData = this.attempts.get(key);

    if (!attemptData || !attemptData.lockedUntil) {
      return { locked: false };
    }

    const now = Date.now();

    if (now < attemptData.lockedUntil) {
      return {
        locked: true,
        remainingTime: Math.ceil((attemptData.lockedUntil - now) / 1000),
        attempts: attemptData.count
      };
    }

    // Lock expired, reset attempts
    this.attempts.delete(key);
    return { locked: false };
  }

  /**
   * Reset attempts after successful login
   * @param {string} identifier - User email or IP
   */
  reset(identifier) {
    const key = `login:${identifier}`;
    this.attempts.delete(key);
  }

  /**
   * Get remaining attempts
   * @param {string} identifier - User email or IP
   * @returns {number} - Remaining attempts
   */
  getRemainingAttempts(identifier) {
    const key = `login:${identifier}`;
    const attemptData = this.attempts.get(key);

    if (!attemptData) {
      return securityConfig.password.maxAttempts;
    }

    return Math.max(0, securityConfig.password.maxAttempts - attemptData.count);
  }
}

/**
 * Two-Factor Authentication (2FA)
 */
class TwoFactorAuth {
  /**
   * Generate 2FA secret for user
   * @param {string} userEmail - User's email
   * @returns {Object} - Secret and otpauth URL
   */
  static generateSecret(userEmail) {
    const secret = speakeasy.generateSecret({
      name: `${securityConfig.twoFactor.issuer} (${userEmail})`,
      issuer: securityConfig.twoFactor.issuer,
      length: 32
    });

    return {
      secret: secret.base32,
      otpauthUrl: secret.otpauth_url
    };
  }

  /**
   * Generate QR code for 2FA setup
   * @param {string} otpauthUrl - OTPAuth URL
   * @returns {Promise<string>} - QR code data URL
   */
  static async generateQRCode(otpauthUrl) {
    try {
      return await QRCode.toDataURL(otpauthUrl);
    } catch (error) {
      console.error('QR code generation error:', error);
      throw new Error('Failed to generate QR code');
    }
  }

  /**
   * Verify 2FA token
   * @param {string} token - 6-digit token
   * @param {string} secret - User's 2FA secret
   * @returns {boolean} - True if token is valid
   */
  static verifyToken(token, secret) {
    return speakeasy.totp.verify({
      secret: secret,
      encoding: securityConfig.twoFactor.encoding,
      token: token,
      window: securityConfig.twoFactor.window
    });
  }

  /**
   * Generate backup codes
   * @param {number} count - Number of backup codes
   * @returns {Array<string>} - Array of backup codes
   */
  static generateBackupCodes(count = securityConfig.twoFactor.backupCodesCount) {
    const codes = [];
    for (let i = 0; i < count; i++) {
      const code = encryptionUtil.generateToken(4).toUpperCase();
      codes.push(code);
    }
    return codes;
  }

  /**
   * Hash backup codes for storage
   * @param {Array<string>} codes - Backup codes
   * @returns {Array<string>} - Hashed codes
   */
  static hashBackupCodes(codes) {
    return codes.map(code => encryptionUtil.hash(code));
  }

  /**
   * Verify backup code
   * @param {string} code - Backup code to verify
   * @param {Array<string>} hashedCodes - Array of hashed backup codes
   * @returns {number} - Index of matched code, or -1
   */
  static verifyBackupCode(code, hashedCodes) {
    const codeHash = encryptionUtil.hash(code);
    return hashedCodes.findIndex(hash => hash === codeHash);
  }
}

/**
 * Session Management
 */
class SessionManager {
  constructor() {
    this.sessions = new Map(); // In-memory store (use Redis in production)
  }

  /**
   * Create session
   * @param {string} userId - User ID
   * @param {Object} data - Session data
   * @returns {string} - Session ID
   */
  createSession(userId, data = {}) {
    const sessionId = encryptionUtil.generateToken(32);
    const now = Date.now();

    this.sessions.set(sessionId, {
      userId,
      createdAt: now,
      lastActivity: now,
      data
    });

    return sessionId;
  }

  /**
   * Get session
   * @param {string} sessionId - Session ID
   * @returns {Object|null} - Session data or null
   */
  getSession(sessionId) {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Update session activity
   * @param {string} sessionId - Session ID
   */
  updateActivity(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivity = Date.now();
      this.sessions.set(sessionId, session);
    }
  }

  /**
   * Delete session
   * @param {string} sessionId - Session ID
   */
  deleteSession(sessionId) {
    this.sessions.delete(sessionId);
  }

  /**
   * Check if session is valid
   * @param {string} sessionId - Session ID
   * @returns {boolean} - True if valid
   */
  isValid(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    const now = Date.now();
    const age = now - session.lastActivity;

    // Check timeout
    if (age > securityConfig.session.timeout) {
      this.deleteSession(sessionId);
      return false;
    }

    // Check absolute timeout
    const totalAge = now - session.createdAt;
    if (totalAge > securityConfig.session.absoluteTimeout) {
      this.deleteSession(sessionId);
      return false;
    }

    return true;
  }

  /**
   * Cleanup expired sessions
   */
  cleanup() {
    const now = Date.now();
    for (const [sessionId, session] of this.sessions.entries()) {
      const age = now - session.lastActivity;
      if (age > securityConfig.session.timeout) {
        this.deleteSession(sessionId);
      }
    }
  }
}

// Export singleton instances
const bruteForceProtection = new BruteForceProtection();
const sessionManager = new SessionManager();

// Cleanup expired sessions every 5 minutes
setInterval(() => sessionManager.cleanup(), 5 * 60 * 1000);

module.exports = {
  PasswordUtil,
  BruteForceProtection,
  bruteForceProtection,
  TwoFactorAuth,
  SessionManager,
  sessionManager
};

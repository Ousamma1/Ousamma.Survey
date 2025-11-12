/**
 * Encryption Service
 * Handles encryption and decryption of sensitive data like API keys
 */

import CryptoJS from 'crypto-js';

export class EncryptionService {
  private encryptionKey: string;

  constructor(encryptionKey?: string) {
    this.encryptionKey = encryptionKey || process.env.ENCRYPTION_KEY || '';

    if (!this.encryptionKey) {
      throw new Error('Encryption key is required');
    }

    if (this.encryptionKey.length < 32) {
      throw new Error('Encryption key must be at least 32 characters');
    }
  }

  /**
   * Encrypt a string
   */
  encrypt(text: string): string {
    try {
      const encrypted = CryptoJS.AES.encrypt(text, this.encryptionKey);
      return encrypted.toString();
    } catch (error) {
      throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Decrypt a string
   */
  decrypt(encryptedText: string): string {
    try {
      const decrypted = CryptoJS.AES.decrypt(encryptedText, this.encryptionKey);
      return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Hash a string (one-way)
   */
  hash(text: string): string {
    return CryptoJS.SHA256(text).toString();
  }

  /**
   * Verify a hash
   */
  verifyHash(text: string, hash: string): boolean {
    return this.hash(text) === hash;
  }

  /**
   * Encrypt an object
   */
  encryptObject(obj: any): string {
    const jsonString = JSON.stringify(obj);
    return this.encrypt(jsonString);
  }

  /**
   * Decrypt an object
   */
  decryptObject<T>(encryptedText: string): T {
    const decrypted = this.decrypt(encryptedText);
    return JSON.parse(decrypted) as T;
  }
}

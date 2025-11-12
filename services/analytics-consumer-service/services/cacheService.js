/**
 * Cache Service
 * Manages caching for analytics data
 * Uses in-memory cache for now, can be extended to use Redis
 */

class CacheService {
  constructor() {
    this.cache = new Map();
    this.ttls = new Map();
  }

  /**
   * Set value in cache
   */
  async set(key, value, ttl = 300) {
    try {
      this.cache.set(key, value);

      // Set TTL
      if (ttl > 0) {
        const expiresAt = Date.now() + (ttl * 1000);
        this.ttls.set(key, expiresAt);

        // Auto-expire
        setTimeout(() => {
          this.delete(key);
        }, ttl * 1000);
      }

      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  /**
   * Get value from cache
   */
  async get(key) {
    try {
      // Check if expired
      const expiresAt = this.ttls.get(key);
      if (expiresAt && Date.now() > expiresAt) {
        this.delete(key);
        return null;
      }

      return this.cache.get(key) || null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key) {
    try {
      this.cache.delete(key);
      this.ttls.delete(key);
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  /**
   * Clear all cache
   */
  async clear() {
    try {
      this.cache.clear();
      this.ttls.clear();
      return true;
    } catch (error) {
      console.error('Cache clear error:', error);
      return false;
    }
  }

  /**
   * Check if key exists
   */
  async has(key) {
    const expiresAt = this.ttls.get(key);
    if (expiresAt && Date.now() > expiresAt) {
      this.delete(key);
      return false;
    }
    return this.cache.has(key);
  }

  /**
   * Get all keys
   */
  async keys() {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache stats
   */
  async stats() {
    return {
      size: this.cache.size,
      keys: await this.keys()
    };
  }
}

module.exports = new CacheService();

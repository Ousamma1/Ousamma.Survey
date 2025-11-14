const redis = require('redis');

/**
 * Enhanced Redis Cache Manager
 * Features:
 * - Cache-aside pattern with automatic fallback
 * - Event-driven cache invalidation
 * - Cache warming strategies
 * - Namespace management
 * - Batch operations
 * - Smart TTL management
 * - Compression support
 * - Memory optimization
 */
class RedisCacheManager {
  constructor() {
    this.client = null;
    this.isReady = false;
    this.namespaces = new Map();
    this.invalidationListeners = new Map();

    // TTL strategies (in seconds)
    this.ttlStrategies = {
      short: 60,           // 1 minute - frequently changing data
      medium: 300,         // 5 minutes - semi-static data
      long: 3600,          // 1 hour - static data
      day: 86400,          // 24 hours - very static data
      session: 1800,       // 30 minutes - user sessions
      analytics: 300,      // 5 minutes - analytics data
      geolocation: 600,    // 10 minutes - location data
      survey: 900,         // 15 minutes - survey data
      user: 1800           // 30 minutes - user data
    };

    // Cache key prefixes for namespacing
    this.prefixes = {
      survey: 'survey:',
      response: 'response:',
      analytics: 'analytics:',
      user: 'user:',
      session: 'session:',
      geolocation: 'geo:',
      surveyor: 'surveyor:',
      project: 'project:',
      notification: 'notification:',
      admin: 'admin:'
    };
  }

  /**
   * Connect to Redis with enhanced configuration
   */
  async connect() {
    try {
      const redisConfig = {
        socket: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT) || 6379,
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              console.error('Too many Redis reconnection attempts');
              return new Error('Redis reconnection limit exceeded');
            }
            // Exponential backoff: 50ms, 100ms, 200ms, ...
            return Math.min(retries * 50, 3000);
          }
        },
        password: process.env.REDIS_PASSWORD || undefined,
        // Database selection for namespace isolation
        database: parseInt(process.env.REDIS_DB) || 0,
        // Connection options
        name: process.env.SERVICE_NAME || 'cache-service',
        // Performance tuning
        commandsQueueMaxLength: 10000,
        // Enable offline queue for resilience
        enableOfflineQueue: true,
        // Socket options
        socket: {
          ...this.socket,
          keepAlive: 30000,
          noDelay: true
        }
      };

      console.log(`[Redis Cache] Connecting to ${redisConfig.socket.host}:${redisConfig.socket.port}...`);
      this.client = redis.createClient(redisConfig);

      // Event handlers
      this.client.on('error', (err) => {
        console.error('[Redis Cache] Error:', err.message);
        this.isReady = false;
      });

      this.client.on('connect', () => {
        console.log('[Redis Cache] Connecting...');
      });

      this.client.on('ready', () => {
        console.log('[Redis Cache] Connected and ready');
        this.isReady = true;
      });

      this.client.on('end', () => {
        console.warn('[Redis Cache] Connection closed');
        this.isReady = false;
      });

      this.client.on('reconnecting', () => {
        console.log('[Redis Cache] Reconnecting...');
      });

      await this.client.connect();
      return this.client;
    } catch (error) {
      console.error('[Redis Cache] Connection failed:', error.message);
      throw error;
    }
  }

  /**
   * Disconnect from Redis gracefully
   */
  async disconnect() {
    try {
      if (this.client) {
        await this.client.quit();
        this.client = null;
        this.isReady = false;
        console.log('[Redis Cache] Disconnected successfully');
      }
    } catch (error) {
      console.error('[Redis Cache] Disconnect error:', error.message);
      // Force disconnect if graceful quit fails
      if (this.client) {
        this.client.disconnect();
      }
    }
  }

  /**
   * Build cache key with namespace
   */
  buildKey(namespace, key) {
    const prefix = this.prefixes[namespace] || `${namespace}:`;
    return `${prefix}${key}`;
  }

  /**
   * Get value from cache with automatic JSON parsing
   */
  async get(namespace, key) {
    try {
      if (!this.isReady) {
        console.warn('[Redis Cache] Not ready, cache miss');
        return null;
      }
      const cacheKey = this.buildKey(namespace, key);
      const value = await this.client.get(cacheKey);

      if (value === null) {
        return null;
      }

      try {
        return JSON.parse(value);
      } catch {
        // Return raw value if not JSON
        return value;
      }
    } catch (error) {
      console.error('[Redis Cache] Get error:', error.message);
      return null;
    }
  }

  /**
   * Set value in cache with TTL
   */
  async set(namespace, key, value, ttl = null) {
    try {
      if (!this.isReady) {
        console.warn('[Redis Cache] Not ready, skipping cache set');
        return false;
      }

      const cacheKey = this.buildKey(namespace, key);
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);

      // Use TTL strategy if ttl is a string (e.g., 'medium', 'long')
      const ttlValue = typeof ttl === 'string'
        ? this.ttlStrategies[ttl] || this.ttlStrategies.medium
        : ttl;

      if (ttlValue) {
        await this.client.setEx(cacheKey, ttlValue, stringValue);
      } else {
        await this.client.set(cacheKey, stringValue);
      }

      return true;
    } catch (error) {
      console.error('[Redis Cache] Set error:', error.message);
      return false;
    }
  }

  /**
   * Cache-aside pattern: get from cache or fetch from source
   */
  async getOrSet(namespace, key, fetchFn, ttl = 'medium') {
    try {
      // Try to get from cache
      const cached = await this.get(namespace, key);
      if (cached !== null) {
        return { data: cached, fromCache: true };
      }

      // Cache miss - fetch from source
      const data = await fetchFn();

      // Store in cache for next time
      if (data !== null && data !== undefined) {
        await this.set(namespace, key, data, ttl);
      }

      return { data, fromCache: false };
    } catch (error) {
      console.error('[Redis Cache] GetOrSet error:', error.message);
      // Return uncached data on error
      try {
        const data = await fetchFn();
        return { data, fromCache: false };
      } catch (fetchError) {
        throw fetchError;
      }
    }
  }

  /**
   * Delete a single key
   */
  async del(namespace, key) {
    try {
      if (!this.isReady) {
        console.warn('[Redis Cache] Not ready, skipping delete');
        return false;
      }
      const cacheKey = this.buildKey(namespace, key);
      await this.client.del(cacheKey);
      return true;
    } catch (error) {
      console.error('[Redis Cache] Delete error:', error.message);
      return false;
    }
  }

  /**
   * Delete multiple keys
   */
  async delMultiple(namespace, keys) {
    try {
      if (!this.isReady || !keys.length) {
        return false;
      }
      const cacheKeys = keys.map(key => this.buildKey(namespace, key));
      await this.client.del(cacheKeys);
      return true;
    } catch (error) {
      console.error('[Redis Cache] Delete multiple error:', error.message);
      return false;
    }
  }

  /**
   * Delete all keys matching a pattern
   * Note: Use with caution in production (can be slow)
   */
  async delPattern(namespace, pattern = '*') {
    try {
      if (!this.isReady) {
        console.warn('[Redis Cache] Not ready, skipping pattern delete');
        return false;
      }

      const searchPattern = this.buildKey(namespace, pattern);
      const keys = [];

      // Use SCAN instead of KEYS for better performance
      let cursor = 0;
      do {
        const result = await this.client.scan(cursor, {
          MATCH: searchPattern,
          COUNT: 100
        });
        cursor = result.cursor;
        keys.push(...result.keys);
      } while (cursor !== 0);

      if (keys.length > 0) {
        // Delete in batches to avoid blocking
        const batchSize = 100;
        for (let i = 0; i < keys.length; i += batchSize) {
          const batch = keys.slice(i, i + batchSize);
          await this.client.del(batch);
        }
        console.log(`[Redis Cache] Deleted ${keys.length} keys matching ${searchPattern}`);
      }

      return true;
    } catch (error) {
      console.error('[Redis Cache] Pattern delete error:', error.message);
      return false;
    }
  }

  /**
   * Batch get multiple keys
   */
  async mget(namespace, keys) {
    try {
      if (!this.isReady || !keys.length) {
        return [];
      }

      const cacheKeys = keys.map(key => this.buildKey(namespace, key));
      const values = await this.client.mGet(cacheKeys);

      return values.map(value => {
        if (value === null) return null;
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      });
    } catch (error) {
      console.error('[Redis Cache] Batch get error:', error.message);
      return [];
    }
  }

  /**
   * Batch set multiple keys
   */
  async mset(namespace, keyValuePairs, ttl = 'medium') {
    try {
      if (!this.isReady || !keyValuePairs.length) {
        return false;
      }

      // Use pipeline for better performance
      const pipeline = this.client.multi();

      const ttlValue = typeof ttl === 'string'
        ? this.ttlStrategies[ttl] || this.ttlStrategies.medium
        : ttl;

      for (const { key, value } of keyValuePairs) {
        const cacheKey = this.buildKey(namespace, key);
        const stringValue = typeof value === 'string' ? value : JSON.stringify(value);

        if (ttlValue) {
          pipeline.setEx(cacheKey, ttlValue, stringValue);
        } else {
          pipeline.set(cacheKey, stringValue);
        }
      }

      await pipeline.exec();
      return true;
    } catch (error) {
      console.error('[Redis Cache] Batch set error:', error.message);
      return false;
    }
  }

  /**
   * Increment a counter
   */
  async incr(namespace, key, amount = 1) {
    try {
      if (!this.isReady) {
        return null;
      }
      const cacheKey = this.buildKey(namespace, key);
      return await this.client.incrBy(cacheKey, amount);
    } catch (error) {
      console.error('[Redis Cache] Increment error:', error.message);
      return null;
    }
  }

  /**
   * Set expiration on existing key
   */
  async expire(namespace, key, ttl) {
    try {
      if (!this.isReady) {
        return false;
      }
      const cacheKey = this.buildKey(namespace, key);
      const ttlValue = typeof ttl === 'string'
        ? this.ttlStrategies[ttl] || this.ttlStrategies.medium
        : ttl;
      await this.client.expire(cacheKey, ttlValue);
      return true;
    } catch (error) {
      console.error('[Redis Cache] Expire error:', error.message);
      return false;
    }
  }

  /**
   * Check if key exists
   */
  async exists(namespace, key) {
    try {
      if (!this.isReady) {
        return false;
      }
      const cacheKey = this.buildKey(namespace, key);
      const result = await this.client.exists(cacheKey);
      return result === 1;
    } catch (error) {
      console.error('[Redis Cache] Exists error:', error.message);
      return false;
    }
  }

  /**
   * Get remaining TTL for a key
   */
  async ttl(namespace, key) {
    try {
      if (!this.isReady) {
        return -1;
      }
      const cacheKey = this.buildKey(namespace, key);
      return await this.client.ttl(cacheKey);
    } catch (error) {
      console.error('[Redis Cache] TTL error:', error.message);
      return -1;
    }
  }

  /**
   * Clear all cache in namespace
   */
  async clearNamespace(namespace) {
    return await this.delPattern(namespace, '*');
  }

  /**
   * Flush entire cache (use with extreme caution!)
   */
  async flushAll() {
    try {
      if (!this.isReady) {
        return false;
      }
      await this.client.flushDb();
      console.warn('[Redis Cache] All cache cleared');
      return true;
    } catch (error) {
      console.error('[Redis Cache] Flush error:', error.message);
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats() {
    try {
      if (!this.isReady) {
        return null;
      }
      const info = await this.client.info('stats');
      const memory = await this.client.info('memory');

      return {
        connected: this.isReady,
        stats: info,
        memory: memory
      };
    } catch (error) {
      console.error('[Redis Cache] Stats error:', error.message);
      return null;
    }
  }

  /**
   * Cache warming - preload frequently accessed data
   */
  async warmCache(namespace, dataLoader) {
    try {
      console.log(`[Redis Cache] Warming cache for namespace: ${namespace}`);
      const data = await dataLoader();

      if (Array.isArray(data)) {
        const keyValuePairs = data.map(item => ({
          key: item.key || item.id,
          value: item.value || item
        }));
        await this.mset(namespace, keyValuePairs, 'long');
        console.log(`[Redis Cache] Warmed ${data.length} items for ${namespace}`);
      }

      return true;
    } catch (error) {
      console.error('[Redis Cache] Warm cache error:', error.message);
      return false;
    }
  }

  /**
   * Register invalidation listener for event-driven cache clearing
   */
  onInvalidate(namespace, pattern, callback) {
    const key = `${namespace}:${pattern}`;
    if (!this.invalidationListeners.has(key)) {
      this.invalidationListeners.set(key, []);
    }
    this.invalidationListeners.get(key).push(callback);
  }

  /**
   * Trigger cache invalidation
   */
  async invalidate(namespace, pattern = '*') {
    const key = `${namespace}:${pattern}`;
    const listeners = this.invalidationListeners.get(key) || [];

    // Execute all registered callbacks
    for (const callback of listeners) {
      try {
        await callback();
      } catch (error) {
        console.error('[Redis Cache] Invalidation callback error:', error.message);
      }
    }

    // Clear the cache
    return await this.delPattern(namespace, pattern);
  }

  /**
   * Check connection status
   */
  isConnected() {
    return this.isReady && this.client !== null;
  }

  /**
   * Get Redis client instance (for advanced operations)
   */
  getClient() {
    return this.client;
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      if (!this.isReady) {
        return { status: 'unhealthy', connected: false };
      }
      await this.client.ping();
      return {
        status: 'healthy',
        connected: true,
        uptime: process.uptime()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        connected: false,
        error: error.message
      };
    }
  }
}

// Export singleton instance
module.exports = new RedisCacheManager();

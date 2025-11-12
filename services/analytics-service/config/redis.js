const redis = require('redis');

/**
 * Redis connection manager for caching
 * Singleton pattern to ensure only one connection instance
 */
class RedisClient {
  constructor() {
    this.client = null;
    this.isReady = false;
  }

  /**
   * Connect to Redis
   */
  async connect() {
    try {
      const redisConfig = {
        socket: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT) || 6379,
        },
        password: process.env.REDIS_PASSWORD || undefined,
      };

      console.log('Connecting to Redis...');
      this.client = redis.createClient(redisConfig);

      // Event handlers
      this.client.on('error', (err) => {
        console.error('Redis error:', err);
        this.isReady = false;
      });

      this.client.on('connect', () => {
        console.log('Redis connecting...');
      });

      this.client.on('ready', () => {
        console.log('Redis connected and ready');
        this.isReady = true;
      });

      this.client.on('end', () => {
        console.warn('Redis connection closed');
        this.isReady = false;
      });

      this.client.on('reconnecting', () => {
        console.log('Redis reconnecting...');
      });

      await this.client.connect();
      return this.client;
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect() {
    try {
      if (this.client) {
        await this.client.quit();
        this.client = null;
        this.isReady = false;
        console.log('Redis disconnected successfully');
      }
    } catch (error) {
      console.error('Error disconnecting from Redis:', error);
      throw error;
    }
  }

  /**
   * Get a value from cache
   */
  async get(key) {
    try {
      if (!this.isReady) {
        console.warn('Redis not ready, skipping cache get');
        return null;
      }
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Redis get error:', error);
      return null;
    }
  }

  /**
   * Set a value in cache with optional TTL
   */
  async set(key, value, ttl = null) {
    try {
      if (!this.isReady) {
        console.warn('Redis not ready, skipping cache set');
        return false;
      }
      const stringValue = JSON.stringify(value);
      if (ttl) {
        await this.client.setEx(key, ttl, stringValue);
      } else {
        await this.client.set(key, stringValue);
      }
      return true;
    } catch (error) {
      console.error('Redis set error:', error);
      return false;
    }
  }

  /**
   * Delete a key from cache
   */
  async del(key) {
    try {
      if (!this.isReady) {
        console.warn('Redis not ready, skipping cache delete');
        return false;
      }
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error('Redis delete error:', error);
      return false;
    }
  }

  /**
   * Delete all keys matching a pattern
   */
  async delPattern(pattern) {
    try {
      if (!this.isReady) {
        console.warn('Redis not ready, skipping pattern delete');
        return false;
      }
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
      }
      return true;
    } catch (error) {
      console.error('Redis pattern delete error:', error);
      return false;
    }
  }

  /**
   * Check if Redis is connected
   */
  isConnected() {
    return this.isReady && this.client !== null;
  }

  /**
   * Get Redis client instance
   */
  getClient() {
    return this.client;
  }
}

// Export singleton instance
module.exports = new RedisClient();

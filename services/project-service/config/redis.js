const redis = require('redis');

/**
 * Redis client manager for Project Service
 * Handles caching and session management
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
          port: parseInt(process.env.REDIS_PORT || '6379'),
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              return new Error('Redis reconnection limit exceeded');
            }
            return Math.min(retries * 100, 3000);
          }
        }
      };

      if (process.env.REDIS_PASSWORD) {
        redisConfig.password = process.env.REDIS_PASSWORD;
      }

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
        console.log('Redis connected successfully');
        this.isReady = true;
      });

      this.client.on('reconnecting', () => {
        console.log('Redis reconnecting...');
        this.isReady = false;
      });

      this.client.on('end', () => {
        console.log('Redis connection closed');
        this.isReady = false;
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
   * Check if connected to Redis
   */
  isConnected() {
    return this.isReady && this.client && this.client.isOpen;
  }

  /**
   * Get a value from cache
   */
  async get(key) {
    try {
      if (!this.isConnected()) {
        console.warn('Redis not connected, skipping get');
        return null;
      }
      return await this.client.get(key);
    } catch (error) {
      console.error('Redis get error:', error);
      return null;
    }
  }

  /**
   * Set a value in cache
   */
  async set(key, value, ttl = null) {
    try {
      if (!this.isConnected()) {
        console.warn('Redis not connected, skipping set');
        return false;
      }

      const options = {};
      if (ttl) {
        options.EX = ttl;
      }

      await this.client.set(key, value, options);
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
      if (!this.isConnected()) {
        console.warn('Redis not connected, skipping del');
        return false;
      }
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error('Redis del error:', error);
      return false;
    }
  }

  /**
   * Delete keys matching a pattern
   */
  async delPattern(pattern) {
    try {
      if (!this.isConnected()) {
        console.warn('Redis not connected, skipping delPattern');
        return 0;
      }

      const keys = await this.client.keys(pattern);
      if (keys.length === 0) return 0;

      await this.client.del(keys);
      return keys.length;
    } catch (error) {
      console.error('Redis delPattern error:', error);
      return 0;
    }
  }

  /**
   * Check if a key exists
   */
  async exists(key) {
    try {
      if (!this.isConnected()) {
        console.warn('Redis not connected, skipping exists');
        return false;
      }
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Redis exists error:', error);
      return false;
    }
  }

  /**
   * Get the Redis client instance
   */
  getClient() {
    return this.client;
  }
}

// Export singleton instance
module.exports = new RedisClient();

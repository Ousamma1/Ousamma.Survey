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
   * Delete a key pattern (for cache invalidation)
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

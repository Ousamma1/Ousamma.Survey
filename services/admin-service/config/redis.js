const redis = require('redis');

class RedisClient {
  constructor() {
    this.client = null;
    this.isReady = false;
  }

  async connect() {
    try {
      const config = {
        socket: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              console.error('❌ Redis max reconnection attempts reached');
              return new Error('Max reconnection attempts reached');
            }
            return Math.min(retries * 100, 3000);
          }
        }
      };

      this.client = redis.createClient(config);

      this.client.on('error', (err) => {
        console.error('❌ Redis Client Error:', err);
        this.isReady = false;
      });

      this.client.on('connect', () => {
        console.log('🔄 Redis connecting...');
      });

      this.client.on('ready', () => {
        console.log('✅ Redis connected successfully');
        this.isReady = true;
      });

      this.client.on('reconnecting', () => {
        console.log('🔄 Redis reconnecting...');
        this.isReady = false;
      });

      this.client.on('end', () => {
        console.log('⚠️  Redis connection closed');
        this.isReady = false;
      });

      await this.client.connect();
      return this.client;
    } catch (error) {
      console.error('❌ Redis connection failed:', error);
      throw error;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.quit();
      console.log('Redis disconnected');
    }
  }

  async get(key) {
    try {
      if (!this.isReady) {
        console.warn('⚠️  Redis not ready, skipping get operation');
        return null;
      }
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Error getting key ${key}:`, error);
      return null;
    }
  }

  async set(key, value, ttl = null) {
    try {
      if (!this.isReady) {
        console.warn('⚠️  Redis not ready, skipping set operation');
        return false;
      }
      const serialized = JSON.stringify(value);
      if (ttl) {
        await this.client.setEx(key, ttl, serialized);
      } else {
        await this.client.set(key, serialized);
      }
      return true;
    } catch (error) {
      console.error(`Error setting key ${key}:`, error);
      return false;
    }
  }

  async del(key) {
    try {
      if (!this.isReady) {
        console.warn('⚠️  Redis not ready, skipping del operation');
        return false;
      }
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error(`Error deleting key ${key}:`, error);
      return false;
    }
  }

  async delPattern(pattern) {
    try {
      if (!this.isReady) {
        console.warn('⚠️  Redis not ready, skipping delPattern operation');
        return false;
      }
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
      }
      return true;
    } catch (error) {
      console.error(`Error deleting pattern ${pattern}:`, error);
      return false;
    }
  }

  getStatus() {
    return {
      connected: this.isReady,
      status: this.isReady ? 'connected' : 'disconnected'
    };
  }
}

module.exports = new RedisClient();

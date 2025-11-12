const redisClient = require('../config/redis');

/**
 * Cache Service
 * Handles caching strategy with Redis
 */
class CacheService {
  constructor() {
    this.defaultTTL = parseInt(process.env.REDIS_TTL) || 3600;
    this.hotDataTTL = parseInt(process.env.CACHE_TTL_HOT_DATA) || 300;
    this.coldDataTTL = parseInt(process.env.CACHE_TTL_COLD_DATA) || 3600;
  }

  /**
   * Generate cache key
   */
  static generateKey(prefix, id, suffix = '') {
    return suffix ? `${prefix}:${id}:${suffix}` : `${prefix}:${id}`;
  }

  /**
   * Get survey analytics from cache
   */
  async getSurveyAnalytics(surveyId) {
    try {
      const key = CacheService.generateKey('survey_analytics', surveyId);
      return await redisClient.get(key);
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set survey analytics in cache
   */
  async setSurveyAnalytics(surveyId, data, ttl = null) {
    try {
      const key = CacheService.generateKey('survey_analytics', surveyId);
      const cacheTTL = ttl || this.hotDataTTL;
      return await redisClient.set(key, data, cacheTTL);
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  /**
   * Get question analytics from cache
   */
  async getQuestionAnalytics(surveyId, questionId = null) {
    try {
      let key;
      if (questionId) {
        key = CacheService.generateKey('question_analytics', surveyId, questionId);
      } else {
        key = CacheService.generateKey('question_analytics', surveyId, 'all');
      }
      return await redisClient.get(key);
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set question analytics in cache
   */
  async setQuestionAnalytics(surveyId, data, questionId = null, ttl = null) {
    try {
      let key;
      if (questionId) {
        key = CacheService.generateKey('question_analytics', surveyId, questionId);
      } else {
        key = CacheService.generateKey('question_analytics', surveyId, 'all');
      }
      const cacheTTL = ttl || this.hotDataTTL;
      return await redisClient.set(key, data, cacheTTL);
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  /**
   * Get realtime stats from cache
   */
  async getRealtimeStats(surveyId) {
    try {
      const key = CacheService.generateKey('realtime_stats', surveyId);
      return await redisClient.get(key);
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set realtime stats in cache
   */
  async setRealtimeStats(surveyId, data) {
    try {
      const key = CacheService.generateKey('realtime_stats', surveyId);
      // Realtime stats have short TTL (5 minutes)
      return await redisClient.set(key, data, 300);
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  /**
   * Get group analytics from cache
   */
  async getGroupAnalytics(groupId) {
    try {
      const key = CacheService.generateKey('group_analytics', groupId);
      return await redisClient.get(key);
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set group analytics in cache
   */
  async setGroupAnalytics(groupId, data, ttl = null) {
    try {
      const key = CacheService.generateKey('group_analytics', groupId);
      const cacheTTL = ttl || this.coldDataTTL;
      return await redisClient.set(key, data, cacheTTL);
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  /**
   * Invalidate cache for a survey
   */
  async invalidateSurveyCache(surveyId) {
    try {
      const patterns = [
        CacheService.generateKey('survey_analytics', surveyId),
        `question_analytics:${surveyId}:*`,
        CacheService.generateKey('realtime_stats', surveyId)
      ];

      for (const pattern of patterns) {
        if (pattern.includes('*')) {
          await redisClient.delPattern(pattern);
        } else {
          await redisClient.del(pattern);
        }
      }

      return true;
    } catch (error) {
      console.error('Cache invalidation error:', error);
      return false;
    }
  }

  /**
   * Invalidate cache for a question
   */
  async invalidateQuestionCache(surveyId, questionId) {
    try {
      const keys = [
        CacheService.generateKey('question_analytics', surveyId, questionId),
        CacheService.generateKey('question_analytics', surveyId, 'all')
      ];

      for (const key of keys) {
        await redisClient.del(key);
      }

      return true;
    } catch (error) {
      console.error('Cache invalidation error:', error);
      return false;
    }
  }

  /**
   * Warm cache for frequently accessed surveys
   */
  async warmCache(surveyIds, dataFetcher) {
    try {
      console.log(`Warming cache for ${surveyIds.length} surveys...`);

      for (const surveyId of surveyIds) {
        // Fetch survey analytics
        const surveyAnalytics = await dataFetcher.getSurveyAnalytics(surveyId);
        if (surveyAnalytics) {
          await this.setSurveyAnalytics(surveyId, surveyAnalytics);
        }

        // Fetch question analytics
        const questionAnalytics = await dataFetcher.getQuestionAnalytics(surveyId);
        if (questionAnalytics) {
          await this.setQuestionAnalytics(surveyId, questionAnalytics);
        }
      }

      console.log('Cache warming completed');
      return true;
    } catch (error) {
      console.error('Cache warming error:', error);
      return false;
    }
  }

  /**
   * Get cached data or fetch from database
   */
  async getOrFetch(cacheKey, fetchFunction, ttl = null) {
    try {
      // Try to get from cache
      let data = await redisClient.get(cacheKey);

      if (data) {
        return data;
      }

      // If not in cache, fetch from database
      data = await fetchFunction();

      if (data) {
        // Store in cache
        const cacheTTL = ttl || this.defaultTTL;
        await redisClient.set(cacheKey, data, cacheTTL);
      }

      return data;
    } catch (error) {
      console.error('Get or fetch error:', error);
      // Fallback to fetch function on error
      return await fetchFunction();
    }
  }

  /**
   * Set cache with automatic TTL based on data access frequency
   */
  async setWithAdaptiveTTL(key, data, accessCount = 0) {
    try {
      let ttl;
      if (accessCount > 100) {
        // Hot data - short TTL for freshness
        ttl = this.hotDataTTL;
      } else if (accessCount > 10) {
        // Warm data - medium TTL
        ttl = Math.floor((this.hotDataTTL + this.coldDataTTL) / 2);
      } else {
        // Cold data - long TTL
        ttl = this.coldDataTTL;
      }

      return await redisClient.set(key, data, ttl);
    } catch (error) {
      console.error('Adaptive TTL set error:', error);
      return false;
    }
  }

  /**
   * Increment access counter for a key
   */
  async incrementAccessCount(key) {
    try {
      const counterKey = `${key}:access_count`;
      const client = redisClient.getClient();
      if (client) {
        await client.incr(counterKey);
        await client.expire(counterKey, 86400); // Reset daily
      }
    } catch (error) {
      console.error('Increment access count error:', error);
    }
  }

  /**
   * Get access count for a key
   */
  async getAccessCount(key) {
    try {
      const counterKey = `${key}:access_count`;
      const client = redisClient.getClient();
      if (client) {
        const count = await client.get(counterKey);
        return parseInt(count) || 0;
      }
      return 0;
    } catch (error) {
      console.error('Get access count error:', error);
      return 0;
    }
  }
}

module.exports = new CacheService();

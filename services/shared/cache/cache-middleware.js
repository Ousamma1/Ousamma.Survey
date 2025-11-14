const cache = require('./redis-cache');

/**
 * Express middleware for automatic response caching
 * Usage: app.get('/api/data', cacheMiddleware('medium'), handler)
 */
function cacheMiddleware(ttl = 'medium', options = {}) {
  const {
    namespace = 'api',
    keyGenerator = (req) => `${req.method}:${req.originalUrl}`,
    condition = () => true,
    skipCache = (req) => false
  } = options;

  return async (req, res, next) => {
    // Skip caching for non-GET requests by default
    if (req.method !== 'GET') {
      return next();
    }

    // Check skip condition
    if (skipCache(req)) {
      return next();
    }

    // Check cache condition
    if (!condition(req)) {
      return next();
    }

    try {
      const cacheKey = keyGenerator(req);

      // Try to get from cache
      const cachedData = await cache.get(namespace, cacheKey);

      if (cachedData) {
        // Cache hit
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('X-Cache-Key', cacheKey);
        return res.json(cachedData);
      }

      // Cache miss - store original json method
      const originalJson = res.json.bind(res);

      // Override json method to cache the response
      res.json = function(data) {
        // Set cache headers
        res.setHeader('X-Cache', 'MISS');
        res.setHeader('X-Cache-Key', cacheKey);

        // Cache the response asynchronously (don't wait)
        cache.set(namespace, cacheKey, data, ttl).catch(err => {
          console.error('[Cache Middleware] Failed to cache response:', err);
        });

        // Send the response
        return originalJson(data);
      };

      next();
    } catch (error) {
      console.error('[Cache Middleware] Error:', error);
      next();
    }
  };
}

/**
 * Cache invalidation middleware
 * Automatically invalidates cache on POST, PUT, PATCH, DELETE requests
 */
function invalidateMiddleware(options = {}) {
  const {
    namespace = 'api',
    pattern = '*',
    methods = ['POST', 'PUT', 'PATCH', 'DELETE']
  } = options;

  return async (req, res, next) => {
    // Only invalidate on specified methods
    if (!methods.includes(req.method)) {
      return next();
    }

    // Store original json method
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);

    // Override response methods to invalidate cache after successful response
    const invalidateCache = async (data) => {
      // Only invalidate on successful responses (2xx status codes)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          await cache.invalidate(namespace, pattern);
          console.log(`[Cache Invalidation] Cleared ${namespace}:${pattern}`);
        } catch (error) {
          console.error('[Cache Invalidation] Error:', error);
        }
      }
      return data;
    };

    res.json = async function(data) {
      await invalidateCache(data);
      return originalJson(data);
    };

    res.send = async function(data) {
      await invalidateCache(data);
      return originalSend(data);
    };

    next();
  };
}

/**
 * ETag middleware for HTTP caching
 * Generates ETags based on response content
 */
function etagMiddleware() {
  const crypto = require('crypto');

  return (req, res, next) => {
    const originalJson = res.json.bind(res);

    res.json = function(data) {
      // Generate ETag from response data
      const etag = crypto
        .createHash('md5')
        .update(JSON.stringify(data))
        .digest('hex');

      // Check If-None-Match header
      const clientEtag = req.headers['if-none-match'];

      res.setHeader('ETag', `"${etag}"`);
      res.setHeader('Cache-Control', 'private, must-revalidate');

      if (clientEtag === `"${etag}"`) {
        // Content hasn't changed
        return res.status(304).end();
      }

      return originalJson(data);
    };

    next();
  };
}

/**
 * Cache warming utility
 * Preloads frequently accessed data into cache
 */
async function warmCaches(warmingStrategies) {
  console.log('[Cache Warming] Starting cache warming...');

  for (const strategy of warmingStrategies) {
    try {
      await cache.warmCache(strategy.namespace, strategy.loader);
    } catch (error) {
      console.error(`[Cache Warming] Failed for ${strategy.namespace}:`, error);
    }
  }

  console.log('[Cache Warming] Completed');
}

/**
 * Cache statistics endpoint handler
 */
async function getCacheStats(req, res) {
  try {
    const stats = await cache.getStats();
    const health = await cache.healthCheck();

    res.json({
      health,
      stats,
      namespaces: Array.from(cache.namespaces.keys()),
      ttlStrategies: cache.ttlStrategies
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve cache stats',
      message: error.message
    });
  }
}

/**
 * Cache clearing endpoint handler
 * Use with caution - requires authentication
 */
async function clearCache(req, res) {
  try {
    const { namespace, pattern } = req.query;

    if (namespace) {
      if (pattern) {
        await cache.delPattern(namespace, pattern);
        res.json({ message: `Cleared cache: ${namespace}:${pattern}` });
      } else {
        await cache.clearNamespace(namespace);
        res.json({ message: `Cleared namespace: ${namespace}` });
      }
    } else {
      // Clear all cache - use with extreme caution
      await cache.flushAll();
      res.json({ message: 'Cleared all cache' });
    }
  } catch (error) {
    res.status(500).json({
      error: 'Failed to clear cache',
      message: error.message
    });
  }
}

/**
 * Response compression middleware wrapper
 * Automatically compresses responses > 1KB
 */
function compressionMiddleware() {
  const compression = require('compression');

  return compression({
    // Compress responses > 1KB
    threshold: 1024,
    // Compression level (0-9, default 6)
    level: 6,
    // Filter function - compress JSON and text
    filter: (req, res) => {
      if (req.headers['x-no-compression']) {
        return false;
      }
      return compression.filter(req, res);
    }
  });
}

module.exports = {
  cacheMiddleware,
  invalidateMiddleware,
  etagMiddleware,
  warmCaches,
  getCacheStats,
  clearCache,
  compressionMiddleware,
  cache
};

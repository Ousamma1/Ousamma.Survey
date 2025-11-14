/**
 * Optimized MongoDB Configuration
 * Provides enhanced connection pooling and performance settings
 */

/**
 * Get optimized MongoDB connection options
 * @param {Object} options - Override options
 * @returns {Object} MongoDB connection options
 */
function getOptimizedMongoConfig(options = {}) {
  const defaultConfig = {
    // Connection Pool Settings
    maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL_SIZE) || 20,
    minPoolSize: parseInt(process.env.MONGODB_MIN_POOL_SIZE) || 5,

    // Timeout Settings
    connectTimeoutMS: parseInt(process.env.MONGODB_CONNECT_TIMEOUT) || 10000,
    socketTimeoutMS: parseInt(process.env.MONGODB_SOCKET_TIMEOUT) || 45000,
    serverSelectionTimeoutMS: parseInt(process.env.MONGODB_SERVER_SELECTION_TIMEOUT) || 5000,

    // Performance Settings
    maxIdleTimeMS: parseInt(process.env.MONGODB_MAX_IDLE_TIME) || 60000,
    waitQueueTimeoutMS: parseInt(process.env.MONGODB_WAIT_QUEUE_TIMEOUT) || 10000,

    // Retry Settings
    retryWrites: true,
    retryReads: true,

    // Compression
    compressors: ['zstd', 'snappy', 'zlib'],

    // Write Concern (adjust based on your consistency requirements)
    w: process.env.MONGODB_WRITE_CONCERN || 'majority',
    journal: process.env.MONGODB_JOURNAL !== 'false',

    // Read Preference (use 'primaryPreferred' for read replicas)
    readPreference: process.env.MONGODB_READ_PREFERENCE || 'primary',

    // Additional Settings
    autoIndex: process.env.NODE_ENV !== 'production', // Disable in production
    bufferCommands: false, // Fail fast if not connected

    // Monitoring
    monitorCommands: process.env.NODE_ENV === 'development',

    // Family (IPv4/IPv6)
    family: 4,

    // heartbeatFrequencyMS
    heartbeatFrequencyMS: 10000,

    // Auth settings (if needed)
    authSource: process.env.MONGODB_AUTH_SOURCE || 'admin'
  };

  return { ...defaultConfig, ...options };
}

/**
 * Get connection string with optimized parameters
 * @param {string} baseUri - Base MongoDB URI
 * @returns {string} Optimized connection string
 */
function getOptimizedConnectionString(baseUri) {
  const uri = new URL(baseUri);

  // Add recommended connection parameters
  const params = new URLSearchParams(uri.search);

  if (!params.has('retryWrites')) params.set('retryWrites', 'true');
  if (!params.has('w')) params.set('w', 'majority');
  if (!params.has('maxPoolSize')) params.set('maxPoolSize', '20');
  if (!params.has('minPoolSize')) params.set('minPoolSize', '5');

  uri.search = params.toString();
  return uri.toString();
}

/**
 * Database event listeners for monitoring
 */
const databaseEventListeners = {
  /**
   * Set up comprehensive event listeners
   * @param {Mongoose} mongoose - Mongoose instance
   */
  setupListeners(mongoose) {
    const connection = mongoose.connection;

    // Connection events
    connection.on('connected', () => {
      console.log('✅ MongoDB connected');
    });

    connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected');
    });

    connection.on('reconnected', () => {
      console.log('🔄 MongoDB reconnected');
    });

    // Monitoring events (only in development)
    if (process.env.NODE_ENV === 'development') {
      connection.on('commandStarted', (event) => {
        if (event.commandName !== 'ismaster') {
          console.log(`[MongoDB] ${event.commandName}:`, JSON.stringify(event.command, null, 2));
        }
      });

      connection.on('commandSucceeded', (event) => {
        if (event.commandName !== 'ismaster') {
          console.log(`[MongoDB] ${event.commandName} completed in ${event.duration}ms`);
        }
      });

      connection.on('commandFailed', (event) => {
        console.error(`[MongoDB] ${event.commandName} failed:`, event.failure);
      });
    }

    // Pool monitoring
    connection.on('connectionPoolCreated', () => {
      console.log('📊 Connection pool created');
    });

    connection.on('connectionPoolClosed', () => {
      console.log('📊 Connection pool closed');
    });

    connection.on('connectionCheckOutStarted', () => {
      // Track connection checkout
    });

    connection.on('connectionCheckOutFailed', (event) => {
      console.warn('⚠️  Connection checkout failed:', event.reason);
    });
  }
};

/**
 * Index creation helper
 */
const indexHelpers = {
  /**
   * Create indexes if they don't exist
   * @param {Model} model - Mongoose model
   * @param {Array} indexes - Array of index definitions
   */
  async ensureIndexes(model, indexes) {
    console.log(`Creating indexes for ${model.modelName}...`);

    for (const indexDef of indexes) {
      try {
        await model.collection.createIndex(indexDef.fields, indexDef.options || {});
        console.log(`  ✅ Index created: ${JSON.stringify(indexDef.fields)}`);
      } catch (error) {
        if (error.code === 85 || error.code === 86) {
          // Index already exists or index options differ
          console.log(`  ℹ️  Index exists: ${JSON.stringify(indexDef.fields)}`);
        } else {
          console.error(`  ❌ Failed to create index:`, error.message);
        }
      }
    }
  },

  /**
   * List all indexes for a model
   * @param {Model} model - Mongoose model
   */
  async listIndexes(model) {
    try {
      const indexes = await model.collection.listIndexes().toArray();
      console.log(`\nIndexes for ${model.modelName}:`);
      indexes.forEach((index) => {
        console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
      });
      return indexes;
    } catch (error) {
      console.error('Failed to list indexes:', error);
      return [];
    }
  },

  /**
   * Analyze query performance
   * @param {Query} query - Mongoose query
   */
  async explainQuery(query) {
    const explanation = await query.explain('executionStats');
    const stats = explanation.executionStats;

    console.log('\n📊 Query Performance Analysis:');
    console.log(`  Execution Time: ${stats.executionTimeMillis}ms`);
    console.log(`  Documents Examined: ${stats.totalDocsExamined}`);
    console.log(`  Documents Returned: ${stats.nReturned}`);
    console.log(`  Index Used: ${stats.executionStages.indexName || 'COLLECTION SCAN (NO INDEX!)'}`);

    if (stats.totalDocsExamined > stats.nReturned * 10) {
      console.warn('  ⚠️  WARNING: Query is examining too many documents. Consider adding an index.');
    }

    return explanation;
  }
};

/**
 * Query optimization helpers
 */
const queryHelpers = {
  /**
   * Pagination helper with cursor-based pagination
   * @param {Model} model - Mongoose model
   * @param {Object} query - Query conditions
   * @param {Object} options - Pagination options
   */
  async paginateCursor(model, query = {}, options = {}) {
    const {
      limit = 20,
      cursor = null,
      sortField = '_id',
      sortOrder = 1,
      select = null
    } = options;

    // Build query with cursor
    let queryBuilder = model.find(query);

    if (cursor) {
      queryBuilder = queryBuilder.where(sortField).gt(cursor);
    }

    // Apply sorting
    queryBuilder = queryBuilder.sort({ [sortField]: sortOrder });

    // Apply limit (add 1 to check if there are more results)
    queryBuilder = queryBuilder.limit(limit + 1);

    // Apply field projection
    if (select) {
      queryBuilder = queryBuilder.select(select);
    }

    const results = await queryBuilder.lean().exec();

    const hasMore = results.length > limit;
    const items = hasMore ? results.slice(0, limit) : results;

    const nextCursor = hasMore && items.length > 0
      ? items[items.length - 1][sortField]
      : null;

    return {
      items,
      nextCursor,
      hasMore,
      count: items.length
    };
  },

  /**
   * Offset-based pagination (less efficient for large datasets)
   * @param {Model} model - Mongoose model
   * @param {Object} query - Query conditions
   * @param {Object} options - Pagination options
   */
  async paginateOffset(model, query = {}, options = {}) {
    const {
      page = 1,
      limit = 20,
      sort = { _id: -1 },
      select = null
    } = options;

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      model
        .find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .select(select)
        .lean()
        .exec(),
      model.countDocuments(query)
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    };
  },

  /**
   * Aggregate with optimization
   * @param {Model} model - Mongoose model
   * @param {Array} pipeline - Aggregation pipeline
   * @param {Object} options - Options
   */
  async aggregateOptimized(model, pipeline, options = {}) {
    const {
      allowDiskUse = true,
      maxTimeMS = 30000,
      hint = null
    } = options;

    let aggregation = model.aggregate(pipeline);

    if (allowDiskUse) {
      aggregation = aggregation.allowDiskUse(true);
    }

    if (maxTimeMS) {
      aggregation = aggregation.option({ maxTimeMS });
    }

    if (hint) {
      aggregation = aggregation.hint(hint);
    }

    return await aggregation.exec();
  }
};

module.exports = {
  getOptimizedMongoConfig,
  getOptimizedConnectionString,
  databaseEventListeners,
  indexHelpers,
  queryHelpers
};

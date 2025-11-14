/**
 * Database Test Helper
 * Sprint 19: Testing & QA
 *
 * Utilities for managing test database connections and data
 */

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

/**
 * Connect to in-memory MongoDB for testing
 */
async function connect() {
  // Close any existing connections
  await disconnect();

  // Start in-memory MongoDB server
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();

  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
}

/**
 * Disconnect from test database
 */
async function disconnect() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  if (mongoServer) {
    await mongoServer.stop();
    mongoServer = null;
  }
}

/**
 * Clear all collections in the test database
 */
async function clearDatabase() {
  if (mongoose.connection.readyState === 0) {
    return;
  }

  const collections = mongoose.connection.collections;

  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
}

/**
 * Drop the test database
 */
async function dropDatabase() {
  if (mongoose.connection.readyState === 0) {
    return;
  }

  await mongoose.connection.dropDatabase();
}

/**
 * Create a test database connection with custom URI
 */
async function connectWithUri(uri) {
  await disconnect();

  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
}

/**
 * Get connection state
 */
function isConnected() {
  return mongoose.connection.readyState === 1;
}

/**
 * Setup and teardown for tests
 */
const setup = {
  beforeAll: async () => {
    await connect();
  },

  afterEach: async () => {
    await clearDatabase();
  },

  afterAll: async () => {
    await disconnect();
  }
};

module.exports = {
  connect,
  disconnect,
  clearDatabase,
  dropDatabase,
  connectWithUri,
  isConnected,
  setup,
  mongoServer: () => mongoServer
};

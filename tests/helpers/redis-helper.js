/**
 * Redis Test Helper
 * Sprint 19: Testing & QA
 *
 * Mock Redis client for testing
 */

/**
 * Mock Redis Client
 */
class MockRedisClient {
  constructor() {
    this.data = new Map();
    this.expirations = new Map();
    this.connected = false;
  }

  async connect() {
    this.connected = true;
  }

  async disconnect() {
    this.connected = false;
    this.data.clear();
    this.expirations.clear();
  }

  async quit() {
    await this.disconnect();
  }

  // String operations
  async get(key) {
    this._checkExpiration(key);
    return this.data.get(key) || null;
  }

  async set(key, value, options = {}) {
    this.data.set(key, value);

    if (options.EX) {
      // Expiration in seconds
      this.expirations.set(key, Date.now() + options.EX * 1000);
    } else if (options.PX) {
      // Expiration in milliseconds
      this.expirations.set(key, Date.now() + options.PX);
    }

    return 'OK';
  }

  async setEx(key, seconds, value) {
    return this.set(key, value, { EX: seconds });
  }

  async del(...keys) {
    let deleted = 0;
    for (const key of keys) {
      if (this.data.has(key)) {
        this.data.delete(key);
        this.expirations.delete(key);
        deleted++;
      }
    }
    return deleted;
  }

  async exists(...keys) {
    let count = 0;
    for (const key of keys) {
      this._checkExpiration(key);
      if (this.data.has(key)) {
        count++;
      }
    }
    return count;
  }

  async expire(key, seconds) {
    if (!this.data.has(key)) {
      return 0;
    }
    this.expirations.set(key, Date.now() + seconds * 1000);
    return 1;
  }

  async ttl(key) {
    if (!this.data.has(key)) {
      return -2;
    }
    if (!this.expirations.has(key)) {
      return -1;
    }

    const expiration = this.expirations.get(key);
    const remaining = Math.floor((expiration - Date.now()) / 1000);

    return remaining > 0 ? remaining : -2;
  }

  // Hash operations
  async hSet(key, field, value) {
    let hash = this.data.get(key);
    if (!hash || typeof hash !== 'object') {
      hash = {};
      this.data.set(key, hash);
    }
    const isNew = !hash.hasOwnProperty(field);
    hash[field] = value;
    return isNew ? 1 : 0;
  }

  async hGet(key, field) {
    this._checkExpiration(key);
    const hash = this.data.get(key);
    return hash && typeof hash === 'object' ? hash[field] || null : null;
  }

  async hGetAll(key) {
    this._checkExpiration(key);
    const hash = this.data.get(key);
    return hash && typeof hash === 'object' ? { ...hash } : {};
  }

  async hDel(key, ...fields) {
    const hash = this.data.get(key);
    if (!hash || typeof hash !== 'object') {
      return 0;
    }

    let deleted = 0;
    for (const field of fields) {
      if (hash.hasOwnProperty(field)) {
        delete hash[field];
        deleted++;
      }
    }
    return deleted;
  }

  // List operations
  async lPush(key, ...values) {
    let list = this.data.get(key);
    if (!Array.isArray(list)) {
      list = [];
      this.data.set(key, list);
    }
    list.unshift(...values);
    return list.length;
  }

  async rPush(key, ...values) {
    let list = this.data.get(key);
    if (!Array.isArray(list)) {
      list = [];
      this.data.set(key, list);
    }
    list.push(...values);
    return list.length;
  }

  async lPop(key) {
    const list = this.data.get(key);
    return Array.isArray(list) ? list.shift() || null : null;
  }

  async rPop(key) {
    const list = this.data.get(key);
    return Array.isArray(list) ? list.pop() || null : null;
  }

  async lRange(key, start, stop) {
    this._checkExpiration(key);
    const list = this.data.get(key);
    if (!Array.isArray(list)) {
      return [];
    }

    const end = stop === -1 ? undefined : stop + 1;
    return list.slice(start, end);
  }

  // Set operations
  async sAdd(key, ...members) {
    let set = this.data.get(key);
    if (!(set instanceof Set)) {
      set = new Set();
      this.data.set(key, set);
    }

    let added = 0;
    for (const member of members) {
      const sizeBefore = set.size;
      set.add(member);
      if (set.size > sizeBefore) {
        added++;
      }
    }
    return added;
  }

  async sMembers(key) {
    this._checkExpiration(key);
    const set = this.data.get(key);
    return set instanceof Set ? Array.from(set) : [];
  }

  async sIsMember(key, member) {
    this._checkExpiration(key);
    const set = this.data.get(key);
    return set instanceof Set ? set.has(member) : false;
  }

  async sRem(key, ...members) {
    const set = this.data.get(key);
    if (!(set instanceof Set)) {
      return 0;
    }

    let removed = 0;
    for (const member of members) {
      if (set.delete(member)) {
        removed++;
      }
    }
    return removed;
  }

  // Utility methods
  async flushAll() {
    this.data.clear();
    this.expirations.clear();
    return 'OK';
  }

  async flushDb() {
    return this.flushAll();
  }

  async keys(pattern) {
    this._cleanupExpired();

    if (pattern === '*') {
      return Array.from(this.data.keys());
    }

    // Simple pattern matching (* and ?)
    const regex = new RegExp(
      '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$'
    );

    return Array.from(this.data.keys()).filter(key => regex.test(key));
  }

  async ping() {
    return 'PONG';
  }

  isReady() {
    return this.connected;
  }

  // Private helper methods
  _checkExpiration(key) {
    if (this.expirations.has(key)) {
      const expiration = this.expirations.get(key);
      if (Date.now() >= expiration) {
        this.data.delete(key);
        this.expirations.delete(key);
      }
    }
  }

  _cleanupExpired() {
    const now = Date.now();
    for (const [key, expiration] of this.expirations.entries()) {
      if (now >= expiration) {
        this.data.delete(key);
        this.expirations.delete(key);
      }
    }
  }
}

/**
 * Create mock Redis client
 */
function createMockRedis() {
  return new MockRedisClient();
}

/**
 * Mock Redis connection with auto-connect
 */
async function createConnectedMockRedis() {
  const client = new MockRedisClient();
  await client.connect();
  return client;
}

module.exports = {
  MockRedisClient,
  createMockRedis,
  createConnectedMockRedis
};

/**
 * In-Memory Storage Adapter
 *
 * Fast in-memory storage with TTL support and Redis-compatible API.
 * Perfect for development and as a fallback option.
 */

const logger = require('../middleware/logger');

class InMemoryAdapter {
  constructor() {
    this.store = new Map();
    this.ttls = new Map();
    this.cleanupInterval = null;
  }

  /**
   * Initialize the adapter and start cleanup interval
   */
  async connect() {
    logger.info('In-memory storage initialized');

    // Start cleanup interval to remove expired keys every 60 seconds
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpired();
    }, 60000);

    return true;
  }

  /**
   * Cleanup interval
   */
  async disconnect() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.store.clear();
    this.ttls.clear();
    logger.info('In-memory storage cleared');
  }

  /**
   * Remove expired keys
   */
  cleanupExpired() {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, expiry] of this.ttls.entries()) {
      if (expiry <= now) {
        this.store.delete(key);
        this.ttls.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug(`In-memory: Cleaned up ${cleaned} expired keys`);
    }
  }

  /**
   * Check if a key is expired
   */
  isExpired(key) {
    const expiry = this.ttls.get(key);
    if (!expiry) return false;

    if (expiry <= Date.now()) {
      this.store.delete(key);
      this.ttls.delete(key);
      return true;
    }

    return false;
  }

  /**
   * Set a key-value pair with optional TTL (in seconds)
   */
  async set(key, value, ttl = null) {
    this.store.set(key, value);

    if (ttl) {
      this.ttls.set(key, Date.now() + (ttl * 1000));
    } else {
      this.ttls.delete(key);
    }

    return true;
  }

  /**
   * Get a value by key
   */
  async get(key) {
    if (this.isExpired(key)) {
      return null;
    }

    return this.store.get(key) || null;
  }

  /**
   * Delete a key
   */
  async delete(key) {
    this.ttls.delete(key);
    return this.store.delete(key);
  }

  /**
   * Check if a key exists
   */
  async exists(key) {
    if (this.isExpired(key)) {
      return false;
    }
    return this.store.has(key);
  }

  /**
   * Get all keys matching a pattern (simple wildcard support)
   */
  async keys(pattern) {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    const matchingKeys = [];

    for (const key of this.store.keys()) {
      if (!this.isExpired(key) && regex.test(key)) {
        matchingKeys.push(key);
      }
    }

    return matchingKeys;
  }

  /**
   * Set a hash field
   */
  async setHash(key, field, value) {
    let hash = this.store.get(key);

    if (!hash || typeof hash !== 'object') {
      hash = {};
    }

    hash[field] = value;
    this.store.set(key, hash);
    return true;
  }

  /**
   * Get hash field(s)
   * If field is null, returns all fields as an object
   */
  async getHash(key, field = null) {
    if (this.isExpired(key)) {
      return null;
    }

    const hash = this.store.get(key);

    if (!hash || typeof hash !== 'object') {
      return null;
    }

    if (field) {
      return hash[field] || null;
    }

    return { ...hash };
  }

  /**
   * Delete hash field(s)
   * If field is null, deletes the entire hash
   */
  async deleteHash(key, field = null) {
    if (field) {
      const hash = this.store.get(key);
      if (hash && typeof hash === 'object') {
        delete hash[field];
        return true;
      }
      return false;
    } else {
      return this.delete(key);
    }
  }

  /**
   * Get multiple keys at once
   */
  async mget(keys) {
    return keys.map(key => this.isExpired(key) ? null : (this.store.get(key) || null));
  }

  /**
   * Increment a counter
   */
  async increment(key, amount = 1) {
    const current = this.store.get(key) || 0;
    const newValue = Number(current) + amount;
    this.store.set(key, newValue);
    return newValue;
  }

  /**
   * Set expiration on a key
   */
  async expire(key, seconds) {
    if (this.store.has(key)) {
      this.ttls.set(key, Date.now() + (seconds * 1000));
      return true;
    }
    return false;
  }

  /**
   * Get TTL for a key (returns seconds remaining, -1 if no expiry, -2 if key doesn't exist)
   */
  async ttl(key) {
    if (!this.store.has(key)) {
      return -2;
    }

    const expiry = this.ttls.get(key);
    if (!expiry) {
      return -1;
    }

    const remaining = Math.ceil((expiry - Date.now()) / 1000);
    return remaining > 0 ? remaining : -2;
  }

  /**
   * Flush all data
   */
  async flushAll() {
    this.store.clear();
    this.ttls.clear();
    logger.warn('In-memory: All data flushed');
    return true;
  }

  /**
   * Get storage statistics
   */
  getStats() {
    return {
      keys: this.store.size,
      keysWithTTL: this.ttls.size,
      type: 'in-memory'
    };
  }
}

module.exports = InMemoryAdapter;

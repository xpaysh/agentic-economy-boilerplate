/**
 * Storage Layer - Production-Ready Adapter
 *
 * Provides a unified interface for storage operations with automatic
 * fallback from Redis to in-memory storage.
 */

const RedisAdapter = require('./redis-adapter');
const InMemoryAdapter = require('./in-memory-adapter');
const logger = require('../middleware/logger');

class StorageManager {
  constructor(config = {}) {
    this.config = {
      useRedis: process.env.USE_REDIS === 'true' || config.useRedis || false,
      redisUrl: process.env.REDIS_URL || config.redisUrl || 'redis://localhost:6379',
      fallbackToMemory: config.fallbackToMemory !== false // default true
    };

    this.adapter = null;
    this.initialized = false;
  }

  /**
   * Initialize storage adapter
   * Attempts Redis first, falls back to in-memory if configured
   */
  async initialize() {
    if (this.initialized) {
      return this.adapter;
    }

    // Try Redis if enabled
    if (this.config.useRedis) {
      try {
        logger.info('Initializing Redis storage adapter...');
        this.adapter = new RedisAdapter(this.config.redisUrl);
        await this.adapter.connect();
        logger.info('✓ Redis storage adapter connected successfully');
        this.initialized = true;
        return this.adapter;
      } catch (error) {
        logger.error('Failed to connect to Redis:', error.message);

        if (!this.config.fallbackToMemory) {
          throw new Error('Redis connection failed and fallback is disabled');
        }

        logger.warn('→ Falling back to in-memory storage');
      }
    }

    // Use in-memory storage (default or fallback)
    logger.info('Initializing in-memory storage adapter...');
    this.adapter = new InMemoryAdapter();
    await this.adapter.connect();
    logger.info('✓ In-memory storage adapter initialized');
    this.initialized = true;
    return this.adapter;
  }

  /**
   * Get the current adapter instance
   */
  getAdapter() {
    if (!this.initialized) {
      throw new Error('Storage not initialized. Call initialize() first.');
    }
    return this.adapter;
  }

  /**
   * Close storage connections
   */
  async close() {
    if (this.adapter) {
      await this.adapter.disconnect();
      this.initialized = false;
    }
  }

  // Convenience methods that proxy to the adapter

  async set(key, value, ttl = null) {
    return this.getAdapter().set(key, value, ttl);
  }

  async get(key) {
    return this.getAdapter().get(key);
  }

  async delete(key) {
    return this.getAdapter().delete(key);
  }

  async exists(key) {
    return this.getAdapter().exists(key);
  }

  async keys(pattern) {
    return this.getAdapter().keys(pattern);
  }

  async setHash(key, field, value) {
    return this.getAdapter().setHash(key, field, value);
  }

  async getHash(key, field = null) {
    return this.getAdapter().getHash(key, field);
  }

  async deleteHash(key, field = null) {
    return this.getAdapter().deleteHash(key, field);
  }

  // Payment-specific helpers

  async savePayment(paymentId, paymentData, ttl = 3600) {
    return this.set(`payment:${paymentId}`, paymentData, ttl);
  }

  async getPayment(paymentId) {
    return this.get(`payment:${paymentId}`);
  }

  async deletePayment(paymentId) {
    return this.delete(`payment:${paymentId}`);
  }

  async listPayments() {
    return this.keys('payment:*');
  }

  // Product-specific helpers

  async saveProduct(productId, productData) {
    return this.set(`product:${productId}`, productData);
  }

  async getProduct(productId) {
    return this.get(`product:${productId}`);
  }

  async listProducts() {
    return this.keys('product:*');
  }

  // Session-specific helpers

  async saveSession(sessionId, sessionData, ttl = 1800) {
    return this.set(`session:${sessionId}`, sessionData, ttl);
  }

  async getSession(sessionId) {
    return this.get(`session:${sessionId}`);
  }

  async deleteSession(sessionId) {
    return this.delete(`session:${sessionId}`);
  }
}

// Export singleton instance factory
let defaultInstance = null;

function createStorage(config) {
  return new StorageManager(config);
}

function getDefaultStorage() {
  if (!defaultInstance) {
    defaultInstance = new StorageManager();
  }
  return defaultInstance;
}

module.exports = {
  StorageManager,
  createStorage,
  getDefaultStorage,
  RedisAdapter,
  InMemoryAdapter
};

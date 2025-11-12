/**
 * Redis Storage Adapter
 *
 * Production-ready Redis implementation with connection pooling,
 * automatic reconnection, and proper error handling.
 */

const redis = require('redis');
const logger = require('../middleware/logger');

class RedisAdapter {
  constructor(redisUrl) {
    this.redisUrl = redisUrl;
    this.client = null;
    this.connected = false;
  }

  /**
   * Connect to Redis with retry logic
   */
  async connect() {
    try {
      this.client = redis.createClient({
        url: this.redisUrl,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              logger.error('Redis: Max reconnection attempts reached');
              return new Error('Max reconnection attempts reached');
            }
            const delay = Math.min(retries * 100, 3000);
            logger.warn(`Redis: Reconnecting in ${delay}ms (attempt ${retries})`);
            return delay;
          }
        }
      });

      this.client.on('error', (err) => {
        logger.error('Redis Client Error:', err.message);
      });

      this.client.on('connect', () => {
        logger.info('Redis: Connected to server');
      });

      this.client.on('reconnecting', () => {
        logger.warn('Redis: Reconnecting...');
      });

      this.client.on('ready', () => {
        logger.info('Redis: Client ready');
        this.connected = true;
      });

      await this.client.connect();
      return true;
    } catch (error) {
      logger.error('Failed to connect to Redis:', error.message);
      throw error;
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect() {
    if (this.client) {
      await this.client.quit();
      this.connected = false;
      logger.info('Redis: Disconnected');
    }
  }

  /**
   * Set a key-value pair with optional TTL (in seconds)
   */
  async set(key, value, ttl = null) {
    try {
      const serialized = JSON.stringify(value);
      if (ttl) {
        await this.client.setEx(key, ttl, serialized);
      } else {
        await this.client.set(key, serialized);
      }
      return true;
    } catch (error) {
      logger.error(`Redis SET error for key ${key}:`, error.message);
      throw error;
    }
  }

  /**
   * Get a value by key
   */
  async get(key) {
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error(`Redis GET error for key ${key}:`, error.message);
      throw error;
    }
  }

  /**
   * Delete a key
   */
  async delete(key) {
    try {
      const result = await this.client.del(key);
      return result > 0;
    } catch (error) {
      logger.error(`Redis DELETE error for key ${key}:`, error.message);
      throw error;
    }
  }

  /**
   * Check if a key exists
   */
  async exists(key) {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error(`Redis EXISTS error for key ${key}:`, error.message);
      throw error;
    }
  }

  /**
   * Get all keys matching a pattern
   */
  async keys(pattern) {
    try {
      return await this.client.keys(pattern);
    } catch (error) {
      logger.error(`Redis KEYS error for pattern ${pattern}:`, error.message);
      throw error;
    }
  }

  /**
   * Set a hash field
   */
  async setHash(key, field, value) {
    try {
      const serialized = JSON.stringify(value);
      await this.client.hSet(key, field, serialized);
      return true;
    } catch (error) {
      logger.error(`Redis HSET error for key ${key}, field ${field}:`, error.message);
      throw error;
    }
  }

  /**
   * Get hash field(s)
   * If field is null, returns all fields as an object
   */
  async getHash(key, field = null) {
    try {
      if (field) {
        const value = await this.client.hGet(key, field);
        return value ? JSON.parse(value) : null;
      } else {
        const hash = await this.client.hGetAll(key);
        const result = {};
        for (const [k, v] of Object.entries(hash)) {
          result[k] = JSON.parse(v);
        }
        return result;
      }
    } catch (error) {
      logger.error(`Redis HGET error for key ${key}:`, error.message);
      throw error;
    }
  }

  /**
   * Delete hash field(s)
   * If field is null, deletes the entire hash
   */
  async deleteHash(key, field = null) {
    try {
      if (field) {
        const result = await this.client.hDel(key, field);
        return result > 0;
      } else {
        const result = await this.client.del(key);
        return result > 0;
      }
    } catch (error) {
      logger.error(`Redis HDEL error for key ${key}:`, error.message);
      throw error;
    }
  }

  /**
   * Get multiple keys at once
   */
  async mget(keys) {
    try {
      const values = await this.client.mGet(keys);
      return values.map(v => v ? JSON.parse(v) : null);
    } catch (error) {
      logger.error('Redis MGET error:', error.message);
      throw error;
    }
  }

  /**
   * Increment a counter
   */
  async increment(key, amount = 1) {
    try {
      return await this.client.incrBy(key, amount);
    } catch (error) {
      logger.error(`Redis INCR error for key ${key}:`, error.message);
      throw error;
    }
  }

  /**
   * Set expiration on a key
   */
  async expire(key, seconds) {
    try {
      return await this.client.expire(key, seconds);
    } catch (error) {
      logger.error(`Redis EXPIRE error for key ${key}:`, error.message);
      throw error;
    }
  }

  /**
   * Get TTL for a key
   */
  async ttl(key) {
    try {
      return await this.client.ttl(key);
    } catch (error) {
      logger.error(`Redis TTL error for key ${key}:`, error.message);
      throw error;
    }
  }

  /**
   * Flush all data (use with caution!)
   */
  async flushAll() {
    try {
      await this.client.flushAll();
      logger.warn('Redis: All data flushed');
      return true;
    } catch (error) {
      logger.error('Redis FLUSHALL error:', error.message);
      throw error;
    }
  }
}

module.exports = RedisAdapter;

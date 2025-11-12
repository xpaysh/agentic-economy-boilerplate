/**
 * Rate Limiter Middleware
 *
 * Configurable rate limiting for vending machines with support for
 * different limits per agent type and Redis-backed storage
 */

const rateLimit = require('express-rate-limit');
const logger = require('./logger');

/**
 * Create a basic rate limiter
 */
function createRateLimiter(options = {}) {
  const config = {
    windowMs: options.windowMs || parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000, // 1 minute
    max: options.max || parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: options.message || {
      error: 'Too many requests from this IP, please try again later',
      retryAfter: null
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
      res.status(429).json({
        error: 'Rate limit exceeded',
        retryAfter: res.getHeader('Retry-After')
      });
    },
    skip: (req) => {
      // Skip rate limiting for health checks
      return req.path === '/health' || req.path === '/ping';
    }
  };

  return rateLimit(config);
}

/**
 * Create a stricter rate limiter for payment endpoints
 */
function createPaymentRateLimiter(options = {}) {
  return createRateLimiter({
    windowMs: options.windowMs || 60000, // 1 minute
    max: options.max || 20, // 20 requests per minute
    message: {
      error: 'Too many payment requests, please slow down',
      retryAfter: null
    },
    ...options
  });
}

/**
 * Create agent-aware rate limiter
 * Different limits for different agent types
 */
function createAgentRateLimiter(options = {}) {
  const limits = {
    enterprise: options.enterpriseLimit || 1000,
    standard: options.standardLimit || 100,
    suspicious: options.suspiciousLimit || 10,
    default: options.defaultLimit || 50
  };

  return rateLimit({
    windowMs: options.windowMs || 60000,
    max: (req) => {
      const agentType = req.agentType || 'default';
      const limit = limits[agentType] || limits.default;

      logger.debug(`Rate limit for agent type ${agentType}: ${limit} requests/minute`);
      return limit;
    },
    keyGenerator: (req) => {
      // Use agent ID if available, otherwise fall back to IP
      return req.headers['x-agent-id'] || req.agentId || req.ip;
    },
    handler: (req, res) => {
      logger.warn(`Rate limit exceeded for agent: ${req.agentId || req.ip}, type: ${req.agentType}`);
      res.status(429).json({
        error: 'Rate limit exceeded for your agent type',
        agentType: req.agentType,
        retryAfter: res.getHeader('Retry-After')
      });
    },
    standardHeaders: true,
    legacyHeaders: false
  });
}

/**
 * Redis-backed rate limiter (optional)
 * Use when running multiple server instances
 */
function createRedisRateLimiter(redisClient, options = {}) {
  // Note: Requires 'rate-limit-redis' package
  // This is a placeholder for Redis-backed rate limiting
  // In production, install: npm install rate-limit-redis

  try {
    const RedisStore = require('rate-limit-redis');

    return rateLimit({
      windowMs: options.windowMs || 60000,
      max: options.max || 100,
      store: new RedisStore({
        client: redisClient,
        prefix: 'rl:',
      }),
      standardHeaders: true,
      legacyHeaders: false
    });
  } catch (error) {
    logger.warn('rate-limit-redis not available, falling back to in-memory rate limiter');
    return createRateLimiter(options);
  }
}

/**
 * Burst rate limiter
 * Allows short bursts but limits sustained traffic
 */
function createBurstRateLimiter(options = {}) {
  const shortWindow = rateLimit({
    windowMs: 1000, // 1 second
    max: options.burstMax || 10,
    skipSuccessfulRequests: false,
    handler: (req, res, next) => {
      // Don't send response yet, let the longer window handler take over
      next(new Error('Burst limit exceeded'));
    }
  });

  const longWindow = rateLimit({
    windowMs: options.windowMs || 60000, // 1 minute
    max: options.max || 100,
    standardHeaders: true,
    legacyHeaders: false
  });

  return [shortWindow, longWindow];
}

/**
 * Sliding window rate limiter
 * More accurate than fixed window
 */
function createSlidingWindowRateLimiter(storage, options = {}) {
  const windowMs = options.windowMs || 60000;
  const max = options.max || 100;

  return async (req, res, next) => {
    const key = `rl:${req.ip}`;
    const now = Date.now();
    const windowStart = now - windowMs;

    try {
      // Get recent requests
      const requests = await storage.get(key) || [];

      // Filter requests within the window
      const recentRequests = requests.filter(timestamp => timestamp > windowStart);

      if (recentRequests.length >= max) {
        const oldestRequest = Math.min(...recentRequests);
        const retryAfter = Math.ceil((oldestRequest + windowMs - now) / 1000);

        res.setHeader('Retry-After', retryAfter);
        res.setHeader('X-RateLimit-Limit', max);
        res.setHeader('X-RateLimit-Remaining', 0);
        res.setHeader('X-RateLimit-Reset', new Date(oldestRequest + windowMs).toISOString());

        return res.status(429).json({
          error: 'Rate limit exceeded',
          retryAfter
        });
      }

      // Add current request
      recentRequests.push(now);
      await storage.set(key, recentRequests, Math.ceil(windowMs / 1000));

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', max - recentRequests.length);
      res.setHeader('X-RateLimit-Reset', new Date(now + windowMs).toISOString());

      next();
    } catch (error) {
      logger.error('Rate limiter error:', error);
      // Fail open - allow the request
      next();
    }
  };
}

/**
 * Cost-based rate limiter
 * Different endpoints cost different amounts
 */
function createCostBasedRateLimiter(options = {}) {
  const costs = options.costs || {
    'GET /api/products': 1,
    'POST /api/purchase': 5,
    'POST /api/confirm': 10,
    default: 1
  };

  const budget = options.budget || 100; // points per window
  const windowMs = options.windowMs || 60000;

  const costMap = new Map();

  return (req, res, next) => {
    const key = req.agentId || req.ip;
    const endpoint = `${req.method} ${req.path}`;
    const cost = costs[endpoint] || costs.default;

    const now = Date.now();
    const usage = costMap.get(key) || { points: 0, resetAt: now + windowMs };

    // Reset if window expired
    if (now >= usage.resetAt) {
      usage.points = 0;
      usage.resetAt = now + windowMs;
    }

    // Check if over budget
    if (usage.points + cost > budget) {
      const retryAfter = Math.ceil((usage.resetAt - now) / 1000);

      res.setHeader('Retry-After', retryAfter);
      res.setHeader('X-RateLimit-Limit', budget);
      res.setHeader('X-RateLimit-Remaining', 0);

      logger.warn(`Cost-based rate limit exceeded for ${key}. Used: ${usage.points}, Cost: ${cost}`);

      return res.status(429).json({
        error: 'Rate limit exceeded',
        cost,
        used: usage.points,
        limit: budget,
        retryAfter
      });
    }

    // Deduct cost
    usage.points += cost;
    costMap.set(key, usage);

    // Set headers
    res.setHeader('X-RateLimit-Limit', budget);
    res.setHeader('X-RateLimit-Remaining', budget - usage.points);
    res.setHeader('X-RateLimit-Cost', cost);

    next();
  };
}

module.exports = {
  createRateLimiter,
  createPaymentRateLimiter,
  createAgentRateLimiter,
  createRedisRateLimiter,
  createBurstRateLimiter,
  createSlidingWindowRateLimiter,
  createCostBasedRateLimiter
};

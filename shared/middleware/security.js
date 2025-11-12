/**
 * Security Middleware
 *
 * Security headers, CORS, and protection middleware
 */

const helmet = require('helmet');
const cors = require('cors');
const logger = require('./logger');

/**
 * Configure Helmet security headers
 */
function configureHelmet(options = {}) {
  return helmet({
    contentSecurityPolicy: options.contentSecurityPolicy !== false ? {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"]
      }
    } : false,
    crossOriginEmbedderPolicy: options.crossOriginEmbedderPolicy !== false,
    crossOriginOpenerPolicy: options.crossOriginOpenerPolicy !== false,
    crossOriginResourcePolicy: options.crossOriginResourcePolicy !== false,
    dnsPrefetchControl: { allow: false },
    frameguard: { action: 'deny' },
    hidePoweredBy: true,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
    ieNoOpen: true,
    noSniff: true,
    referrerPolicy: { policy: 'no-referrer' },
    xssFilter: true
  });
}

/**
 * Configure CORS
 */
function configureCORS(options = {}) {
  const corsOptions = {
    origin: options.origin || process.env.CORS_ORIGIN || '*',
    credentials: options.credentials !== false,
    methods: options.methods || ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: options.allowedHeaders || [
      'Content-Type',
      'Authorization',
      'X-Agent-ID',
      'X-Agent-Type',
      'X-Request-ID'
    ],
    exposedHeaders: options.exposedHeaders || [
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
      'Retry-After'
    ],
    maxAge: options.maxAge || 86400 // 24 hours
  };

  return cors(corsOptions);
}

/**
 * Request ID middleware
 * Adds unique ID to each request for tracking
 */
function requestId(req, res, next) {
  const existingId = req.get('X-Request-ID');
  const id = existingId || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  req.id = id;
  res.setHeader('X-Request-ID', id);

  next();
}

/**
 * Validate content type for POST/PUT requests
 */
function validateContentType(allowedTypes = ['application/json']) {
  return (req, res, next) => {
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      const contentType = req.get('content-type');

      if (!contentType || !allowedTypes.some(type => contentType.includes(type))) {
        logger.warn('Invalid content type:', {
          contentType,
          method: req.method,
          path: req.path,
          ip: req.ip
        });

        return res.status(415).json({
          error: 'Unsupported Media Type',
          message: `Content-Type must be one of: ${allowedTypes.join(', ')}`,
          received: contentType
        });
      }
    }

    next();
  };
}

/**
 * Input sanitization middleware
 */
function sanitizeInput(req, res, next) {
  const sanitize = (obj) => {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    const sanitized = Array.isArray(obj) ? [] : {};

    for (const [key, value] of Object.entries(obj)) {
      // Skip prototype pollution
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        logger.warn('Potential prototype pollution attempt detected:', {
          key,
          ip: req.ip,
          path: req.path
        });
        continue;
      }

      // Recursively sanitize nested objects
      if (typeof value === 'object' && value !== null) {
        sanitized[key] = sanitize(value);
      } else if (typeof value === 'string') {
        // Basic XSS prevention - strip HTML tags
        sanitized[key] = value.replace(/<[^>]*>/g, '');
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  };

  if (req.body) {
    req.body = sanitize(req.body);
  }

  if (req.query) {
    req.query = sanitize(req.query);
  }

  next();
}

/**
 * IP whitelist middleware
 */
function ipWhitelist(whitelist = []) {
  const allowedIPs = new Set(whitelist);

  return (req, res, next) => {
    const clientIP = req.ip;

    if (!allowedIPs.has(clientIP)) {
      logger.warn('IP not in whitelist:', {
        ip: clientIP,
        path: req.path,
        method: req.method
      });

      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied from this IP address'
      });
    }

    next();
  };
}

/**
 * IP blacklist middleware
 */
function ipBlacklist(blacklist = []) {
  const blockedIPs = new Set(blacklist);

  return (req, res, next) => {
    const clientIP = req.ip;

    if (blockedIPs.has(clientIP)) {
      logger.warn('Blocked IP attempted access:', {
        ip: clientIP,
        path: req.path,
        method: req.method
      });

      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied'
      });
    }

    next();
  };
}

/**
 * Signature verification middleware
 * Verifies request signature for enhanced security
 */
function verifySignature(secretKey) {
  const crypto = require('crypto');

  return (req, res, next) => {
    const signature = req.get('X-Signature');
    const timestamp = req.get('X-Timestamp');

    if (!signature || !timestamp) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing signature or timestamp'
      });
    }

    // Check timestamp freshness (within 5 minutes)
    const requestTime = parseInt(timestamp);
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;

    if (Math.abs(now - requestTime) > fiveMinutes) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Request timestamp is too old'
      });
    }

    // Verify signature
    const payload = `${req.method}${req.path}${timestamp}${JSON.stringify(req.body || {})}`;
    const expectedSignature = crypto
      .createHmac('sha256', secretKey)
      .update(payload)
      .digest('hex');

    if (signature !== expectedSignature) {
      logger.warn('Invalid signature:', {
        ip: req.ip,
        path: req.path,
        provided: signature,
        expected: expectedSignature
      });

      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid signature'
      });
    }

    next();
  };
}

/**
 * API key authentication middleware
 */
function requireApiKey(validKeys = []) {
  const keySet = new Set(validKeys);

  return (req, res, next) => {
    const apiKey = req.get('X-API-Key') || req.query.apiKey;

    if (!apiKey) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'API key required'
      });
    }

    if (!keySet.has(apiKey)) {
      logger.warn('Invalid API key:', {
        ip: req.ip,
        path: req.path
      });

      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid API key'
      });
    }

    next();
  };
}

/**
 * Prevent timing attacks with constant-time string comparison
 */
function constantTimeCompare(a, b) {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Security headers for payment endpoints
 */
function paymentSecurityHeaders(req, res, next) {
  // Additional security for payment endpoints
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');

  next();
}

/**
 * Complete security middleware stack
 */
function securityMiddleware(options = {}) {
  return [
    requestId,
    configureHelmet(options.helmet || {}),
    configureCORS(options.cors || {}),
    validateContentType(options.contentTypes),
    sanitizeInput
  ];
}

module.exports = {
  configureHelmet,
  configureCORS,
  requestId,
  validateContentType,
  sanitizeInput,
  ipWhitelist,
  ipBlacklist,
  verifySignature,
  requireApiKey,
  constantTimeCompare,
  paymentSecurityHeaders,
  securityMiddleware
};

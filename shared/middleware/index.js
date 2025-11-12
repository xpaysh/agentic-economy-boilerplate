/**
 * Shared Middleware
 *
 * Production-ready middleware for all vending machines
 */

const logger = require('./logger');
const rateLimiter = require('./rate-limiter');
const agentDetection = require('./agent-detection');
const errorHandler = require('./error-handler');
const security = require('./security');

module.exports = {
  logger,
  rateLimiter,
  agentDetection,
  errorHandler,
  security
};

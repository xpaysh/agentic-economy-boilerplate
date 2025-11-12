/**
 * @agentic-economy/shared
 *
 * Production-ready utilities for agentic payment vending machines
 */

const storage = require('./storage');
const middleware = require('./middleware');
const testing = require('./testing');

module.exports = {
  storage,
  middleware,
  testing
};

/**
 * Error Handler Middleware
 *
 * Centralized error handling for all vending machines
 */

const logger = require('./logger');

/**
 * Standard error response format
 */
function formatErrorResponse(error, req) {
  const isDevelopment = process.env.NODE_ENV === 'development';

  return {
    error: {
      message: error.message || 'An unexpected error occurred',
      code: error.code || 'INTERNAL_ERROR',
      status: error.status || 500,
      ...(isDevelopment && {
        stack: error.stack,
        details: error.details
      }),
      requestId: req.id || req.headers['x-request-id']
    }
  };
}

/**
 * Main error handler middleware
 */
function errorHandler(err, req, res, next) {
  // Log the error
  logger.error('Request error:', {
    error: err.message,
    stack: err.stack,
    method: req.method,
    path: req.path,
    ip: req.ip,
    agentId: req.agentId,
    requestId: req.id
  });

  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json(formatErrorResponse({
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      status: 400,
      details: err.details || err.message
    }, req));
  }

  if (err.name === 'UnauthorizedError' || err.code === 'UNAUTHORIZED') {
    return res.status(401).json(formatErrorResponse({
      message: 'Authentication required',
      code: 'UNAUTHORIZED',
      status: 401
    }, req));
  }

  if (err.name === 'ForbiddenError' || err.code === 'FORBIDDEN') {
    return res.status(403).json(formatErrorResponse({
      message: 'Access forbidden',
      code: 'FORBIDDEN',
      status: 403
    }, req));
  }

  if (err.name === 'NotFoundError' || err.code === 'NOT_FOUND') {
    return res.status(404).json(formatErrorResponse({
      message: 'Resource not found',
      code: 'NOT_FOUND',
      status: 404
    }, req));
  }

  if (err.name === 'PaymentRequiredError' || err.code === 'PAYMENT_REQUIRED') {
    return res.status(402).json(formatErrorResponse({
      message: 'Payment required',
      code: 'PAYMENT_REQUIRED',
      status: 402,
      details: err.details
    }, req));
  }

  if (err.code === 'ETIMEDOUT' || err.code === 'ECONNREFUSED') {
    return res.status(503).json(formatErrorResponse({
      message: 'Service temporarily unavailable',
      code: 'SERVICE_UNAVAILABLE',
      status: 503
    }, req));
  }

  // Default error response
  const status = err.status || err.statusCode || 500;
  res.status(status).json(formatErrorResponse(err, req));
}

/**
 * 404 Not Found handler
 */
function notFoundHandler(req, res, next) {
  logger.warn('Route not found:', {
    method: req.method,
    path: req.path,
    ip: req.ip,
    agentId: req.agentId
  });

  res.status(404).json({
    error: {
      message: 'Route not found',
      code: 'NOT_FOUND',
      status: 404,
      path: req.path
    }
  });
}

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Create custom error classes
 */
class AppError extends Error {
  constructor(message, status = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Access forbidden') {
    super(message, 403, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

class PaymentRequiredError extends AppError {
  constructor(message = 'Payment required', details = null) {
    super(message, 402, 'PAYMENT_REQUIRED', details);
    this.name = 'PaymentRequiredError';
  }
}

class PaymentError extends AppError {
  constructor(message, details = null) {
    super(message, 400, 'PAYMENT_ERROR', details);
    this.name = 'PaymentError';
  }
}

class RateLimitError extends AppError {
  constructor(message = 'Rate limit exceeded', retryAfter = null) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED', { retryAfter });
    this.name = 'RateLimitError';
  }
}

class ServiceUnavailableError extends AppError {
  constructor(message = 'Service temporarily unavailable') {
    super(message, 503, 'SERVICE_UNAVAILABLE');
    this.name = 'ServiceUnavailableError';
  }
}

/**
 * Error logger middleware
 * Logs all errors before they reach the error handler
 */
function errorLogger(err, req, res, next) {
  const errorInfo = {
    message: err.message,
    name: err.name,
    code: err.code,
    status: err.status || 500,
    method: req.method,
    path: req.path,
    ip: req.ip,
    agentId: req.agentId,
    userAgent: req.get('user-agent'),
    timestamp: new Date().toISOString()
  };

  // Log based on severity
  if (err.status >= 500) {
    logger.error('Server error:', errorInfo, { stack: err.stack });
  } else if (err.status >= 400) {
    logger.warn('Client error:', errorInfo);
  } else {
    logger.info('Error:', errorInfo);
  }

  next(err);
}

/**
 * Global error handlers for uncaught exceptions
 */
function setupGlobalErrorHandlers() {
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', {
      error: error.message,
      stack: error.stack
    });

    // Give time for logs to flush
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Promise Rejection:', {
      reason: reason instanceof Error ? reason.message : reason,
      stack: reason instanceof Error ? reason.stack : undefined,
      promise
    });
  });

  process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully...');
    // Perform cleanup here
  });

  process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully...');
    process.exit(0);
  });
}

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  errorLogger,
  setupGlobalErrorHandlers,
  // Error classes
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  PaymentRequiredError,
  PaymentError,
  RateLimitError,
  ServiceUnavailableError
};

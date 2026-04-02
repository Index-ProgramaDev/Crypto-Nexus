import { ZodError } from 'zod';
import { logger } from '../config/logger.js';

/**
 * Centralized error handler middleware
 */
export function errorHandler(err, req, res, next) {
  // Log error
  logger.error({
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    user: req.user?.id
  });

  // Zod validation error
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message
    }));

    return res.status(400).json({
      success: false,
      error: 'Validation error',
      message: 'Invalid input data',
      details: formattedErrors
    });
  }

  // Prisma errors
  if (err.code && err.code.startsWith('P')) {
    // Prisma unique constraint violation
    if (err.code === 'P2002') {
      const field = err.meta?.target?.[0] || 'field';
      return res.status(409).json({
        success: false,
        error: 'Duplicate entry',
        message: `This ${field} is already in use`
      });
    }

    // Prisma foreign key constraint
    if (err.code === 'P2003') {
      return res.status(400).json({
        success: false,
        error: 'Invalid reference',
        message: 'Referenced record does not exist'
      });
    }

    // Prisma record not found
    if (err.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Record not found'
      });
    }
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Invalid token',
      message: 'Authentication token is invalid'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Token expired',
      message: 'Please login again'
    });
  }

  // Multer file upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      error: 'File too large',
      message: 'File size exceeds the limit'
    });
  }

  // Default error response
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal server error';

  // Don't expose internal errors in production
  const isDev = process.env.NODE_ENV === 'development';
  
  res.status(statusCode).json({
    success: false,
    error: err.name || 'Internal server error',
    message: isDev ? message : 'Something went wrong',
    ...(isDev && { stack: err.stack })
  });
}

/**
 * 404 Not Found handler
 */
export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: 'Not found',
    message: `Route ${req.method} ${req.url} not found`
  });
}

/**
 * Async handler wrapper to catch errors in async route handlers
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

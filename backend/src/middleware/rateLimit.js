import rateLimit from 'express-rate-limit';
import { config } from '../config/index.js';
import { logger } from '../config/logger.js';

/**
 * General API rate limiter
 */
export const apiLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.nodeEnv === 'development' ? 10000 : config.rateLimitMaxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      error: 'Too many requests',
      message: 'Please try again later'
    });
  }
});

/**
 * Strict rate limiter for authentication endpoints
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 100 : 5, // 100 in dev, 5 in production
  skipSuccessfulRequests: true,
  handler: (req, res) => {
    logger.warn(`Auth rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      error: 'Too many login attempts',
      message: 'Please try again after 15 minutes'
    });
  }
});

/**
 * Post creation rate limiter
 */
export const postLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 posts per window
  keyGenerator: (req) => req.user?.id || req.ip,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Post limit exceeded',
      message: 'You can only create 10 posts per 15 minutes'
    });
  }
});

/**
 * Comment creation rate limiter
 */
export const commentLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // 20 comments per window
  keyGenerator: (req) => req.user?.id || req.ip,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Comment limit exceeded',
      message: 'You can only create 20 comments per 5 minutes'
    });
  }
});

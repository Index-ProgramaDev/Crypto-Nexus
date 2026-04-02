import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';

/**
 * Authentication middleware
 * Validates JWT token and attaches user to request
 */
export async function authenticate(req, res, next) {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'Access token is missing or invalid'
      });
    }

    const token = authHeader.substring(7);

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, config.jwt.secret);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: 'Token expired',
          message: 'Please login again'
        });
      }
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
        message: 'Authentication failed'
      });
    }

    // Check if user exists and is not blocked
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user) {
      return res.status(403).json({
        success: false,
        error: 'user_not_registered',
        message: 'User not found or not registered'
      });
    }

    // Check if user is blocked
    if (user.isBlocked) {
      if (user.blockedUntil && new Date() > user.blockedUntil) {
        // Unblock user if block period expired
        await prisma.user.update({
          where: { id: user.id },
          data: { isBlocked: false, blockedUntil: null }
        });
      } else {
        return res.status(403).json({
          success: false,
          error: 'user_blocked',
          message: user.blockedUntil 
            ? `Account blocked until ${user.blockedUntil.toISOString()}`
            : 'Account is permanently banned'
        });
      }
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      vipAccess: user.vipAccess,
      violationCount: user.violationCount
    };

    next();
  } catch (error) {
    logger.error('Authentication middleware error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Authentication failed'
    });
  }
}

/**
 * Optional authentication middleware
 * Attaches user if token is valid, but doesn't require it
 */
export async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);
    
    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          vipAccess: true,
          violationCount: true,
          isBlocked: true
        }
      });

      if (user && !user.isBlocked) {
        req.user = user;
      }
    } catch (err) {
      // Invalid token, continue without user
    }

    next();
  } catch (error) {
    next();
  }
}

/**
 * Role-based authorization middleware
 * @param {...string} allowedRoles - Roles that can access the resource
 */
export function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'You must be logged in to access this resource'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'You do not have permission to access this resource'
      });
    }

    next();
  };
}

/**
 * Admin-only middleware
 */
export function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      message: 'You must be logged in'
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Access denied',
      message: 'Admin access required'
    });
  }

  next();
}

/**
 * Check content access level middleware
 * Verifies if user can access content at specific access level
 */
export function checkAccessLevel(requiredLevel) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'Login required'
      });
    }

    const { role, vipAccess } = req.user;

    // Admin can access everything
    if (role === 'admin') {
      return next();
    }

    // VIP access required
    if (requiredLevel === 'vip') {
      if (!vipAccess) {
        return res.status(403).json({
          success: false,
          error: 'VIP access required',
          message: 'You need VIP access to view this content'
        });
      }
      return next();
    }

    // Role hierarchy check
    const roleOrder = { user: 0, mentored: 1, advanced: 2, admin: 3 };
    const levelOrder = { public: 0, mentored: 1, advanced: 2, vip: 3 };

    if ((roleOrder[role] || 0) >= (levelOrder[requiredLevel] || 0)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      error: 'Access denied',
      message: `You need ${requiredLevel} access level to view this content`
    });
  };
}

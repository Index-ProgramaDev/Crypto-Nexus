import { prisma } from '../config/database.js';
import { getViolationAction, getWarningMessage, canViewContent, detectContactInfo } from '../utils/moderation.js';
import { logger } from '../config/logger.js';

export class ModerationService {
  /**
   * Check content for contact info violations
   * @param {string} content - Content to check
   * @param {Object} user - User object
   * @param {string} context - Context (post, comment, bio)
   * @returns {Object} Violation check result
   */
  static async checkViolation(content, user, context = 'post') {
    // Admins are exempt from moderation
    if (user.role === 'admin') {
      return { hasViolation: false };
    }

    const { hasContact, matches } = detectContactInfo(content);

    if (!hasContact) {
      return { hasViolation: false };
    }

    // Calculate new violation count
    const newViolationCount = user.violationCount + 1;
    const action = getViolationAction(user.violationCount);
    const warning = getWarningMessage(newViolationCount);

    // Log the violation
    await prisma.moderationLog.create({
      data: {
        userEmail: user.email,
        userName: user.fullName,
        violationType: 'contact_info',
        contentBlocked: content,
        actionTaken: action,
        attemptNumber: newViolationCount,
        context
      }
    });

    // Update user violation count
    const updateData = {
      violationCount: newViolationCount
    };

    // Apply block if needed
    if (action === 'blocked_30_days') {
      const blockedUntil = new Date();
      blockedUntil.setDate(blockedUntil.getDate() + 30);
      updateData.isBlocked = true;
      updateData.blockedUntil = blockedUntil;
    } else if (action === 'permanent_ban') {
      updateData.isBlocked = true;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: updateData
    });

    logger.warn(`Violation detected for ${user.email}: ${context}, action: ${action}`);

    return {
      hasViolation: true,
      action,
      warning,
      matches,
      isBlocked: action === 'blocked_30_days' || action === 'permanent_ban'
    };
  }

  /**
   * Get moderation logs
   * @param {Object} filters - Query filters
   * @returns {Object} Logs and pagination
   */
  static async getModerationLogs(filters = {}) {
    const { userEmail, page = 1, limit = 50 } = filters;

    const where = {};
    if (userEmail) {
      where.userEmail = userEmail;
    }

    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.moderationLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.moderationLog.count({ where })
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Block user (admin only)
   * @param {string} userId - User ID to block
   * @param {number} days - Number of days (null for permanent)
   */
  static async blockUser(userId, days = null) {
    const updateData = {
      isBlocked: true
    };

    if (days) {
      const blockedUntil = new Date();
      blockedUntil.setDate(blockedUntil.getDate() + days);
      updateData.blockedUntil = blockedUntil;
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData
    });

    // Log the action
    await prisma.moderationLog.create({
      data: {
        userEmail: user.email,
        userName: user.fullName,
        violationType: 'manual_block',
        contentBlocked: null,
        actionTaken: days ? 'blocked_30_days' : 'permanent_ban',
        attemptNumber: user.violationCount,
        context: 'admin_action'
      }
    });

    logger.info(`User blocked: ${user.email}, days: ${days || 'permanent'}`);
  }

  /**
   * Unblock user (admin only)
   * @param {string} userId - User ID to unblock
   */
  static async unblockUser(userId) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        isBlocked: false,
        blockedUntil: null
      }
    });

    logger.info(`User unblocked: ${user.email}`);
    return user;
  }
}

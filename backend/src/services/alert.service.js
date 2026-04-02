import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';
import { canViewContent } from '../utils/moderation.js';

export class AlertService {
  /**
   * Get alerts for current user
   * @param {Object} user - Current user
   * @param {Object} filters - Query filters
   * @returns {Array} Alerts for user
   */
  static async getUserAlerts(user, filters = {}) {
    const { isRead } = filters;

    // Build where clause for alerts visible to this user
    const where = {
      OR: [
        { targetEmail: user.email },
        { targetEmail: null, targetLevel: 'public' },
        ...(user.role !== 'user' ? [{ targetEmail: null, targetLevel: 'mentored' }] : []),
        ...(user.role === 'advanced' || user.role === 'admin' ? [{ targetEmail: null, targetLevel: 'advanced' }] : []),
        ...(user.vipAccess || user.role === 'admin' ? [{ targetEmail: null, targetLevel: 'vip' }] : [])
      ]
    };

    if (isRead !== undefined) {
      where.isRead = isRead;
    }

    const alerts = await prisma.alert.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    return alerts;
  }

  /**
   * Create new alert (admin only)
   * @param {Object} alertData - Alert data
   * @returns {Object} Created alert
   */
  static async createAlert(alertData) {
    const { title, message, type, targetLevel, targetEmail } = alertData;

    const alert = await prisma.alert.create({
      data: {
        title,
        message,
        type,
        targetLevel: targetLevel || 'public',
        targetEmail
      }
    });

    logger.info(`Alert created: ${alert.id}, target: ${targetEmail || targetLevel}`);
    return alert;
  }

  /**
   * Mark alert as read
   * @param {string} alertId - Alert ID
   * @param {string} userEmail - User email
   */
  static async markAsRead(alertId, userEmail) {
    // Verify user can see this alert
    const alert = await prisma.alert.findUnique({
      where: { id: alertId }
    });

    if (!alert) {
      throw Object.assign(new Error('Alert not found'), { statusCode: 404 });
    }

    // Check if this alert is for this user
    if (alert.targetEmail && alert.targetEmail !== userEmail) {
      throw Object.assign(new Error('Not authorized to mark this alert'), { statusCode: 403 });
    }

    const updated = await prisma.alert.update({
      where: { id: alertId },
      data: { isRead: true }
    });

    return updated;
  }

  /**
   * Delete alert (admin only)
   * @param {string} alertId - Alert ID
   */
  static async deleteAlert(alertId) {
    await prisma.alert.delete({
      where: { id: alertId }
    });

    logger.info(`Alert deleted: ${alertId}`);
  }

  /**
   * Get unread alert count for user
   * @param {Object} user - Current user
   * @returns {number} Unread count
   */
  static async getUnreadCount(user) {
    const where = {
      isRead: false,
      OR: [
        { targetEmail: user.email },
        { targetEmail: null, targetLevel: 'public' },
        ...(user.role !== 'user' ? [{ targetEmail: null, targetLevel: 'mentored' }] : []),
        ...(user.role === 'advanced' || user.role === 'admin' ? [{ targetEmail: null, targetLevel: 'advanced' }] : []),
        ...(user.vipAccess || user.role === 'admin' ? [{ targetEmail: null, targetLevel: 'vip' }] : [])
      ]
    };

    const count = await prisma.alert.count({ where });
    return count;
  }
}

import { prisma } from '../config/database.js';
import { hashPassword } from '../utils/auth.js';
import { logger } from '../config/logger.js';

export class UserService {
  /**
   * Get all users (admin only)
   * @param {Object} filters - Query filters
   * @returns {Object} Users and pagination
   */
  static async getAllUsers(filters = {}) {
    const { search, role, page = 1, limit = 50 } = filters;

    const where = {};
    
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { fullName: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (role) {
      where.role = role;
    }

    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          vipAccess: true,
          bio: true,
          phone: true,
          avatarUrl: true,
          violationCount: true,
          isBlocked: true,
          blockedUntil: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.user.count({ where })
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + users.length < total
      }
    };
  }

  /**
   * Get user by ID
   * @param {string} id - User ID
   * @returns {Object} User data
   */
  static async getUserById(id) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        vipAccess: true,
        bio: true,
        phone: true,
        avatarUrl: true,
        violationCount: true,
        isBlocked: true,
        blockedUntil: true,
        createdAt: true,
        _count: {
          select: {
            posts: true,
            comments: true
          }
        }
      }
    });

    if (!user) {
      throw Object.assign(new Error('User not found'), { statusCode: 404 });
    }

    return {
      ...user,
      postsCount: user._count.posts,
      commentsCount: user._count.comments,
      _count: undefined
    };
  }

  /**
   * Update user (admin only)
   * @param {string} id - User ID
   * @param {Object} updateData - Data to update
   * @returns {Object} Updated user
   */
  static async updateUser(id, updateData) {
    const user = await prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      throw Object.assign(new Error('User not found'), { statusCode: 404 });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        vipAccess: true,
        bio: true,
        phone: true,
        avatarUrl: true,
        violationCount: true,
        isBlocked: true,
        blockedUntil: true,
        createdAt: true
      }
    });

    logger.info(`User updated by admin: ${updated.email}`);
    return updated;
  }

  /**
   * Invite new user (admin only)
   * @param {Object} inviteData - Invitation data
   * @returns {Object} Created user
   */
  static async inviteUser(inviteData) {
    const { email, role = 'user', password } = inviteData;

    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email }
    });

    if (existing) {
      throw Object.assign(new Error('User already exists'), { statusCode: 409 });
    }

    // Generate random password if not provided
    const userPassword = password || Math.random().toString(36).slice(-10);
    const passwordHash = await hashPassword(userPassword);

    // Extract name from email
    const nameFromEmail = email.split('@')[0];
    const fullName = nameFromEmail.charAt(0).toUpperCase() + nameFromEmail.slice(1);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName,
        role,
        vipAccess: role === 'admin' ? false : undefined
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        vipAccess: true,
        createdAt: true
      }
    });

    logger.info(`User invited: ${email} with role ${role}`);

    // In production, send email with credentials
    return {
      user,
      temporaryPassword: password ? undefined : userPassword
    };
  }

  /**
   * Delete user (admin only)
   * @param {string} id - User ID
   */
  static async deleteUser(id) {
    const user = await prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      throw Object.assign(new Error('User not found'), { statusCode: 404 });
    }

    await prisma.user.delete({
      where: { id }
    });

    logger.info(`User deleted: ${user.email}`);
  }

  /**
   * Get user statistics (admin only)
   * @returns {Object} Statistics
   */
  static async getStats() {
    const [
      totalUsers,
      totalPosts,
      totalVipUsers,
      totalModerationLogs,
      blockedUsers,
      postsToday
    ] = await Promise.all([
      prisma.user.count(),
      prisma.post.count({ where: { status: 'active' } }),
      prisma.user.count({ where: { vipAccess: true } }),
      prisma.moderationLog.count(),
      prisma.user.count({ where: { isBlocked: true } }),
      prisma.post.count({
        where: {
          status: 'active',
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      })
    ]);

    // Count by role
    const usersByRole = await prisma.user.groupBy({
      by: ['role'],
      _count: { role: true }
    });

    // Count signals
    const totalSignals = await prisma.post.count({
      where: { isSignal: true, status: 'active' }
    });

    return {
      totalUsers,
      totalPosts,
      totalVipUsers,
      totalModerationLogs,
      blockedUsers,
      postsToday,
      totalSignals,
      usersByRole: usersByRole.reduce((acc, curr) => {
        acc[curr.role] = curr._count.role;
        return acc;
      }, {})
    };
  }
}

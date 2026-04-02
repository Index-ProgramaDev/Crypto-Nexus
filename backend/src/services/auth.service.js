import { prisma } from '../config/database.js';
import { hashPassword, comparePassword, generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/auth.js';
import { logger } from '../config/logger.js';

export class AuthService {
  /**
   * Register a new user
   * @param {Object} userData - User registration data
   * @returns {Object} Created user and tokens
   */
  static async register({ email, password, fullName, role = 'user' }) {
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      throw Object.assign(new Error('Email already registered'), { statusCode: 409 });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName,
        role
      },
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

    // Generate tokens
    const accessToken = generateAccessToken({ userId: user.id, email: user.email });
    const refreshToken = generateRefreshToken({ userId: user.id });

    logger.info(`New user registered: ${email}`);

    return {
      user,
      tokens: {
        accessToken,
        refreshToken
      }
    };
  }

  /**
   * Login user
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Object} User and tokens
   */
  static async login(email, password) {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });
    }

    // Check if blocked
    if (user.isBlocked) {
      if (user.blockedUntil && new Date() > user.blockedUntil) {
        // Unblock user
        await prisma.user.update({
          where: { id: user.id },
          data: { isBlocked: false, blockedUntil: null }
        });
      } else {
        const message = user.blockedUntil 
          ? `Account blocked until ${user.blockedUntil.toISOString()}`
          : 'Account is permanently banned';
        throw Object.assign(new Error(message), { statusCode: 403, code: 'user_blocked' });
      }
    }

    // Verify password
    const isValidPassword = await comparePassword(password, user.passwordHash);
    if (!isValidPassword) {
      throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });
    }

    // Generate tokens
    const accessToken = generateAccessToken({ userId: user.id, email: user.email });
    const refreshToken = generateRefreshToken({ userId: user.id });

    logger.info(`User logged in: ${email}`);

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        vipAccess: user.vipAccess,
        bio: user.bio,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        violationCount: user.violationCount,
        isBlocked: user.isBlocked,
        blockedUntil: user.blockedUntil,
        createdAt: user.createdAt
      },
      tokens: {
        accessToken,
        refreshToken
      }
    };
  }

  /**
   * Get current user
   * @param {string} userId - User ID
   * @returns {Object} User data
   */
  static async getMe(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
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

    if (!user) {
      throw Object.assign(new Error('User not found'), { statusCode: 404, code: 'user_not_registered' });
    }

    return user;
  }

  /**
   * Update user profile
   * @param {string} userId - User ID
   * @param {Object} updateData - Data to update
   * @returns {Object} Updated user
   */
  static async updateProfile(userId, updateData) {
    const user = await prisma.user.update({
      where: { id: userId },
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

    logger.info(`User profile updated: ${user.email}`);
    return user;
  }

  /**
   * Refresh access token
   * @param {string} refreshToken - Refresh token
   * @returns {Object} New tokens
   */
  static async refreshToken(refreshToken) {
    try {
      const decoded = verifyRefreshToken(refreshToken);
      
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, email: true }
      });

      if (!user) {
        throw Object.assign(new Error('User not found'), { statusCode: 404 });
      }

      const newAccessToken = generateAccessToken({ userId: user.id, email: user.email });
      const newRefreshToken = generateRefreshToken({ userId: user.id });

      return {
        tokens: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken
        }
      };
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw Object.assign(new Error('Refresh token expired'), { statusCode: 401 });
      }
      throw Object.assign(new Error('Invalid refresh token'), { statusCode: 401 });
    }
  }

  /**
   * Change password
   * @param {string} userId - User ID
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   */
  static async changePassword(userId, currentPassword, newPassword) {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw Object.assign(new Error('User not found'), { statusCode: 404 });
    }

    const isValidPassword = await comparePassword(currentPassword, user.passwordHash);
    if (!isValidPassword) {
      throw Object.assign(new Error('Current password is incorrect'), { statusCode: 400 });
    }

    const newPasswordHash = await hashPassword(newPassword);
    
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash }
    });

    logger.info(`Password changed for user: ${user.email}`);
  }
}

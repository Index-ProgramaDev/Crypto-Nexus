import { prisma } from '../config/database.js';
import { hashPassword, comparePassword, generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/auth.js';
import { logger } from '../config/logger.js';

export class AuthService {
  /**
   * Register a new user
   * @param {Object} userData - User registration data
   * @returns {Object} Created user and tokens
   */
  static async register({ email, password, username, fullName, role = 'user' }) {
    // Auto-generate username from email if not provided
    if (!username) {
      username = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '');
      // Ensure minimum length
      if (username.length < 3) {
        username = username + Math.random().toString(36).substring(2, 5);
      }
    }

    // Check if email exists
    const existingEmail = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    });
    if (existingEmail) {
      throw Object.assign(new Error('Email already registered'), { statusCode: 409, code: 'email_exists' });
    }

    // Check if username exists (and append random suffix if needed)
    let finalUsername = username.toLowerCase().trim();
    const existingUsername = await prisma.user.findUnique({
      where: { username: finalUsername }
    });
    if (existingUsername) {
      finalUsername = finalUsername + Math.random().toString(36).substring(2, 6);
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user with profile in transaction
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: email.toLowerCase().trim(),
          username: finalUsername,
          passwordHash,
          role
        }
      });

      // Create profile
      await tx.profile.create({
        data: {
          userId: newUser.id,
          fullName: fullName || username
        }
      });

      return newUser;
    });

    // Fetch user with profile for response
    const userWithProfile = await prisma.user.findUnique({
      where: { id: user.id },
      include: { profile: true }
    });

    // Generate tokens
    const accessToken = generateAccessToken({ userId: user.id, email: user.email });
    const refreshToken = generateRefreshToken({ userId: user.id });

    logger.info(`[AuthService.register] New user registered: ${email} (${user.id})`);

    return {
      user: {
        id: userWithProfile.id,
        email: userWithProfile.email,
        username: userWithProfile.username,
        role: userWithProfile.role,
        fullName: userWithProfile.profile?.fullName,
        bio: userWithProfile.profile?.bio,
        avatarUrl: userWithProfile.profile?.avatarUrl,
        isBlocked: userWithProfile.isBlocked,
        blockedUntil: userWithProfile.blockedUntil,
        emailVerified: userWithProfile.emailVerified,
        createdAt: userWithProfile.createdAt
      },
      tokens: { accessToken, refreshToken }
    };
  }

  /**
   * Login user with robust error handling
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Object} User and tokens
   */
  static async login(email, password) {
    // Input validation at service level (defense in depth)
    if (!email || typeof email !== 'string') {
      throw Object.assign(new Error('Email is required'), { statusCode: 400, code: 'missing_email' });
    }
    if (!password || typeof password !== 'string') {
      throw Object.assign(new Error('Password is required'), { statusCode: 400, code: 'missing_password' });
    }

    try {
      logger.debug(`[AuthService.login] Attempting login for email: ${email}`);
      
      // Find user - fetch ALL fields including passwordHash
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase().trim() }
      });

      // User not found - generic error to prevent user enumeration
      if (!user) {
        logger.warn(`[AuthService.login] Login failed: User not found for email: ${email}`);
        throw Object.assign(new Error('Invalid credentials'), { statusCode: 401, code: 'invalid_credentials' });
      }

      logger.debug(`[AuthService.login] User found: ${user.id}, checking status...`);

      // CRITICAL: Check if passwordHash exists (prevents 500 crash)
      if (!user.passwordHash) {
        logger.error(`[AuthService.login] CRITICAL: User ${user.id} has no passwordHash!`);
        throw Object.assign(
          new Error('Account configuration error - please contact support'), 
          { statusCode: 500, code: 'account_misconfiguration' }
        );
      }

      // Check if blocked
      if (user.isBlocked) {
        const now = new Date();
        const blockedUntil = user.blockedUntil ? new Date(user.blockedUntil) : null;
        
        if (blockedUntil && now > blockedUntil) {
          // Auto-unblock - block expired
          logger.info(`[AuthService.login] Auto-unblocking user ${user.id} - block expired`);
          await prisma.user.update({
            where: { id: user.id },
            data: { isBlocked: false, blockedUntil: null }
          });
        } else {
          const message = blockedUntil 
            ? `Account blocked until ${blockedUntil.toISOString()}`
            : 'Account is permanently banned';
          logger.warn(`[AuthService.login] Blocked user ${user.id} attempted login`);
          throw Object.assign(new Error(message), { statusCode: 403, code: 'user_blocked' });
        }
      }

      // Verify password with error boundary
      let isValidPassword;
      try {
        isValidPassword = await comparePassword(password, user.passwordHash);
      } catch (passwordError) {
        logger.error(`[AuthService.login] Password comparison failed:`, passwordError);
        throw Object.assign(
          new Error('Authentication system error'), 
          { statusCode: 500, code: 'auth_system_error' }
        );
      }

      if (!isValidPassword) {
        logger.warn(`[AuthService.login] Invalid password for user: ${user.id}`);
        throw Object.assign(new Error('Invalid credentials'), { statusCode: 401, code: 'invalid_credentials' });
      }

      // Generate tokens with error handling
      let accessToken, refreshToken;
      try {
        accessToken = generateAccessToken({ userId: user.id, email: user.email });
        refreshToken = generateRefreshToken({ userId: user.id });
      } catch (tokenError) {
        logger.error(`[AuthService.login] Token generation failed:`, tokenError);
        throw Object.assign(
          new Error('Authentication system error - token generation failed'), 
          { statusCode: 500, code: 'token_generation_failed' }
        );
      }

      logger.info(`[AuthService.login] User logged in successfully: ${user.id} (${email})`);

      // Fetch user with profile for complete data
      const userWithProfile = await prisma.user.findUnique({
        where: { id: user.id },
        include: { profile: true }
      });

      // Return safe user object (no passwordHash)
      return {
        user: {
          id: userWithProfile.id,
          email: userWithProfile.email,
          username: userWithProfile.username,
          role: userWithProfile.role,
          fullName: userWithProfile.profile?.fullName,
          bio: userWithProfile.profile?.bio,
          avatarUrl: userWithProfile.profile?.avatarUrl,
          location: userWithProfile.profile?.location,
          website: userWithProfile.profile?.website,
          isBlocked: userWithProfile.isBlocked,
          blockedUntil: userWithProfile.blockedUntil,
          emailVerified: userWithProfile.emailVerified,
          vipAccess: userWithProfile.vipAccess,
          violationCount: userWithProfile.violationCount,
          createdAt: userWithProfile.createdAt
        },
        tokens: {
          accessToken,
          refreshToken
        }
      };
      
    } catch (error) {
      // If already an AuthError with statusCode, re-throw as-is
      if (error.statusCode) {
        throw error;
      }
      
      // Log unexpected errors and convert to generic 500
      logger.error(`[AuthService.login] Unexpected error during login:`, error);
      throw Object.assign(
        new Error('Internal server error during authentication'), 
        { statusCode: 500, code: 'internal_auth_error', originalError: error.message }
      );
    }
  }

  /**
   * Get current user
   * @param {string} userId - User ID
   * @returns {Object} User data
   */
  static async getMe(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true }
    });

    if (!user) {
      throw Object.assign(new Error('User not found'), { statusCode: 404, code: 'user_not_found' });
    }

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      profile: user.profile,
      fullName: user.profile?.fullName,
      bio: user.profile?.bio,
      avatarUrl: user.profile?.avatarUrl,
      location: user.profile?.location,
      website: user.profile?.website,
      birthDate: user.profile?.birthDate,
      isPrivate: user.profile?.isPrivate,
      isBlocked: user.isBlocked,
      blockedUntil: user.blockedUntil,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt
    };
  }

  /**
   * Update user profile
   * @param {string} userId - User ID
   * @param {Object} updateData - Data to update (fullName, bio, avatarUrl, location, website)
   * @returns {Object} Updated user
   */
  static async updateProfile(userId, updateData) {
    const { fullName, bio, avatarUrl, location, birthDate, isPrivate } = updateData;
    
    // Update or create profile
    const profile = await prisma.profile.upsert({
      where: { userId },
      update: {
        ...(fullName !== undefined && { fullName }),
        ...(bio !== undefined && { bio }),
        ...(avatarUrl !== undefined && { avatarUrl }),
        ...(location !== undefined && { location }),
        ...(birthDate !== undefined && { birthDate: birthDate ? new Date(birthDate) : null }),
        ...(isPrivate !== undefined && { isPrivate })
      },
      create: {
        userId,
        fullName: fullName || '',
        bio: bio || '',
        avatarUrl: avatarUrl || '',
        location: location || '',
        birthDate: birthDate ? new Date(birthDate) : null
      }
    });

    // Fetch updated user with profile
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true }
    });

    logger.info(`[AuthService.updateProfile] Profile updated for user: ${user.email}`);

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      profile: user.profile,
      fullName: user.profile?.fullName,
      bio: user.profile?.bio,
      avatarUrl: user.profile?.avatarUrl,
      location: user.profile?.location,
      birthDate: user.profile?.birthDate,
      isPrivate: user.profile?.isPrivate,
      isBlocked: user.isBlocked,
      blockedUntil: user.blockedUntil,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt
    };
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

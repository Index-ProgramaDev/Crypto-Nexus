import { AuthService } from '../services/auth.service.js';
import { loginSchema, registerSchema, updateProfileSchema } from '../utils/validation.js';
import { asyncHandler } from '../middleware/error.js';
import { logger } from '../config/logger.js';

export const AuthController = {
  /**
   * Register new user
   * POST /api/v1/auth/register
   */
  register: asyncHandler(async (req, res) => {
    const validatedData = registerSchema.parse(req.body);
    const result = await AuthService.register(validatedData);

    res.status(201).json({
      success: true,
      data: result
    });
  }),

  /**
   * Login user
   * POST /api/v1/auth/login
   */
  login: asyncHandler(async (req, res, next) => {
    try {
      // Validate input
      let validatedData;
      try {
        validatedData = loginSchema.parse(req.body);
      } catch (validationError) {
        logger.warn(`[AuthController.login] Validation failed:`, validationError.errors);
        return res.status(400).json({
          success: false,
          error: 'Invalid input',
          message: validationError.errors?.map(e => e.message).join(', ') || 'Validation failed'
        });
      }

      // Call service
      const result = await AuthService.login(validatedData.email, validatedData.password);

      return res.json({
        success: true,
        data: result
      });
    } catch (error) {
      // Log and pass to error handler
      logger.error(`[AuthController.login] Error:`, {
        message: error.message,
        code: error.code,
        statusCode: error.statusCode
      });
      next(error);
    }
  }),

  /**
   * Get current user
   * GET /api/v1/auth/me
   */
  getMe: asyncHandler(async (req, res) => {
    const user = await AuthService.getMe(req.user.id);

    res.json({
      success: true,
      data: { user }
    });
  }),

  /**
   * Update current user profile
   * PATCH /api/v1/auth/me
   */
  updateProfile: asyncHandler(async (req, res) => {
    const validatedData = updateProfileSchema.parse(req.body);
    const user = await AuthService.updateProfile(req.user.id, validatedData);

    res.json({
      success: true,
      data: { user }
    });
  }),

  /**
   * Refresh access token
   * POST /api/v1/auth/refresh
   */
  refreshToken: asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token required',
        message: 'Please provide a refresh token'
      });
    }

    const result = await AuthService.refreshToken(refreshToken);

    res.json({
      success: true,
      data: result
    });
  }),

  /**
   * Logout user
   * POST /api/v1/auth/logout
   */
  logout: asyncHandler(async (req, res) => {
    // In a more complex setup, you might want to invalidate the token
    // For now, we just return success as client will remove token
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  }),

  /**
   * Change password
   * POST /api/v1/auth/change-password
   */
  changePassword: asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Missing fields',
        message: 'Current password and new password are required'
      });
    }

    await AuthService.changePassword(req.user.id, currentPassword, newPassword);

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  }),

  /**
   * Upload avatar
   * POST /api/v1/auth/avatar
   */
  uploadAvatar: asyncHandler(async (req, res) => {
    if (!req.file) {
      throw Object.assign(new Error('No file uploaded'), { statusCode: 400 });
    }

    // Construct URL
    const avatarUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

    // Update user profile with new avatar
    const user = await AuthService.updateProfile(req.user.id, { avatarUrl });

    res.json({
      success: true,
      data: { user, avatarUrl },
      message: 'Avatar updated successfully'
    });
  })
};

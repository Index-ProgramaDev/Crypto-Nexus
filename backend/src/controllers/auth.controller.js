import { AuthService } from '../services/auth.service.js';
import { loginSchema, registerSchema, updateProfileSchema } from '../utils/validation.js';
import { asyncHandler } from '../middleware/error.js';

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
  login: asyncHandler(async (req, res) => {
    const validatedData = loginSchema.parse(req.body);
    const result = await AuthService.login(validatedData.email, validatedData.password);

    res.json({
      success: true,
      data: result
    });
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
  })
};

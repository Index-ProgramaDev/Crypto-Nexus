import { prisma } from '../config/database.js';
import { UserService } from '../services/user.service.js';
import { ModerationService } from '../services/moderation.service.js';
import { inviteUserSchema, updateUserSchema, uuidParamSchema, paginationSchema } from '../utils/validation.js';
import { asyncHandler } from '../middleware/error.js';

export const UserController = {
  /**
   * Get all users (admin only)
   * GET /api/v1/users
   */
  getAllUsers: asyncHandler(async (req, res) => {
    const { search, role, ...pagination } = req.query;
    const validatedPagination = paginationSchema.parse(pagination);
    
    const result = await UserService.getAllUsers({
      search,
      role,
      ...validatedPagination
    });

    res.json({
      success: true,
      data: result
    });
  }),

  /**
   * Get user by ID (admin only)
   * GET /api/v1/users/:id
   */
  getUserById: asyncHandler(async (req, res) => {
    const { id } = uuidParamSchema.parse(req.params);
    const user = await UserService.getUserById(id);

    res.json({
      success: true,
      data: { user }
    });
  }),

  /**
   * Update user (admin only)
   * PATCH /api/v1/users/:id
   */
  updateUser: asyncHandler(async (req, res) => {
    const { id } = uuidParamSchema.parse(req.params);
    const validatedData = updateUserSchema.parse(req.body);
    const user = await UserService.updateUser(id, validatedData);

    res.json({
      success: true,
      data: { user }
    });
  }),

  /**
   * Invite new user (admin only)
   * POST /api/v1/users/invite
   */
  inviteUser: asyncHandler(async (req, res) => {
    const validatedData = inviteUserSchema.parse(req.body);
    const result = await UserService.inviteUser(validatedData);

    res.status(201).json({
      success: true,
      data: result,
      message: `Invitation sent to ${validatedData.email}`
    });
  }),

  /**
   * Delete user (admin only)
   * DELETE /api/v1/users/:id
   */
  deleteUser: asyncHandler(async (req, res) => {
    const { id } = uuidParamSchema.parse(req.params);
    await UserService.deleteUser(id);

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  }),

  /**
   * Get admin statistics
   * GET /api/v1/admin/stats
   */
  getStats: asyncHandler(async (req, res) => {
    const stats = await UserService.getStats();

    res.json({
      success: true,
      data: stats
    });
  }),

  /**
   * Toggle user block (admin only)
   * POST /api/v1/users/:id/block
   */
  toggleBlock: asyncHandler(async (req, res) => {
    const { id } = uuidParamSchema.parse(req.params);
    const { days } = req.body;

    const user = await prisma.user.findUnique({
      where: { id },
      select: { isBlocked: true, email: true }
    });

    if (user.isBlocked) {
      await ModerationService.unblockUser(id);
      res.json({
        success: true,
        message: 'User unblocked successfully'
      });
    } else {
      await ModerationService.blockUser(id, days);
      res.json({
        success: true,
        message: days ? `User blocked for ${days} days` : 'User permanently banned'
      });
    }
  })
};

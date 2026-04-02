import { ModerationService } from '../services/moderation.service.js';
import { paginationSchema } from '../utils/validation.js';
import { asyncHandler } from '../middleware/error.js';

export const ModerationController = {
  /**
   * Get moderation logs (admin only)
   * GET /api/v1/moderation/logs
   */
  getLogs: asyncHandler(async (req, res) => {
    const { userEmail, ...pagination } = req.query;
    const validatedPagination = paginationSchema.parse(pagination);

    const result = await ModerationService.getModerationLogs({
      userEmail,
      ...validatedPagination
    });

    res.json({
      success: true,
      data: result
    });
  }),

  /**
   * Block user (admin only)
   * POST /api/v1/users/:id/block
   */
  blockUser: asyncHandler(async (req, res) => {
    const { id: userId } = req.params;
    const { days } = req.body;

    await ModerationService.blockUser(userId, days);

    res.json({
      success: true,
      message: days ? `User blocked for ${days} days` : 'User permanently banned'
    });
  }),

  /**
   * Unblock user (admin only)
   * POST /api/v1/users/:id/unblock
   */
  unblockUser: asyncHandler(async (req, res) => {
    const { id: userId } = req.params;
    
    const user = await ModerationService.unblockUser(userId);

    res.json({
      success: true,
      data: { user },
      message: 'User unblocked successfully'
    });
  })
};

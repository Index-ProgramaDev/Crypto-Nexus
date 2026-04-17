import { FollowService } from '../services/follow.service.js';
import { uuidParamSchema } from '../utils/validation.js';
import { asyncHandler } from '../middleware/error.js';

export const FollowController = {
  /**
   * Toggle follow status for a target user
   * POST /api/v1/users/:id/follow
   */
  toggleFollow: asyncHandler(async (req, res) => {
    const { id } = uuidParamSchema.parse(req.params);
    const result = await FollowService.toggleFollow(id, req.user);

    res.json({
      success: true,
      data: result,
      message: result.following ? 'User followed successfully' : 'User unfollowed successfully'
    });
  }),

  /**
   * Get target user followers
   * GET /api/v1/users/:id/followers
   */
  getFollowers: asyncHandler(async (req, res) => {
    const { id } = uuidParamSchema.parse(req.params);
    const followers = await FollowService.getFollowers(id);

    res.json({
      success: true,
      data: { followers }
    });
  }),

  /**
   * Get target user following list
   * GET /api/v1/users/:id/following
   */
  getFollowing: asyncHandler(async (req, res) => {
    const { id } = uuidParamSchema.parse(req.params);
    const following = await FollowService.getFollowing(id);

    res.json({
      success: true,
      data: { following }
    });
  })
};

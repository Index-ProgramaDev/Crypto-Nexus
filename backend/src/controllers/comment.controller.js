import { CommentService } from '../services/comment.service.js';
import { createCommentSchema, updateCommentSchema, uuidParamSchema } from '../utils/validation.js';
import { asyncHandler } from '../middleware/error.js';

export const CommentController = {
  /**
   * Get comments for a post
   * GET /api/v1/posts/:id/comments
   */
  getComments: asyncHandler(async (req, res) => {
    const { id: postId } = uuidParamSchema.parse(req.params);
    const comments = await CommentService.getCommentsByPost(postId);

    res.json({
      success: true,
      data: { comments }
    });
  }),

  /**
   * Create new comment
   * POST /api/v1/posts/:id/comments
   */
  createComment: asyncHandler(async (req, res) => {
    const { id: postId } = uuidParamSchema.parse(req.params);
    const validatedData = createCommentSchema.parse(req.body);
    
    const comment = await CommentService.createComment(
      { postId, ...validatedData },
      req.user
    );

    res.status(201).json({
      success: true,
      data: { comment }
    });
  }),

  /**
   * Update comment
   * PATCH /api/v1/comments/:id
   */
  updateComment: asyncHandler(async (req, res) => {
    const { id } = uuidParamSchema.parse(req.params);
    const validatedData = updateCommentSchema.parse(req.body);
    const comment = await CommentService.updateComment(id, validatedData, req.user);

    res.json({
      success: true,
      data: { comment }
    });
  }),

  /**
   * Delete comment
   * DELETE /api/v1/comments/:id
   */
  deleteComment: asyncHandler(async (req, res) => {
    const { id } = uuidParamSchema.parse(req.params);
    await CommentService.deleteComment(id, req.user);

    res.json({
      success: true,
      message: 'Comment deleted successfully'
    });
  })
};

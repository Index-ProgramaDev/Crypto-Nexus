import { PostService } from '../services/post.service.js';
import { LikeService } from '../services/like.service.js';
import { createPostSchema, updatePostSchema, postQuerySchema, uuidParamSchema } from '../utils/validation.js';
import { asyncHandler } from '../middleware/error.js';

export const PostController = {
  /**
   * Get posts with filters
   * GET /api/v1/posts
   */
  getPosts: asyncHandler(async (req, res) => {
    const filters = postQuerySchema.parse(req.query);
    const result = await PostService.getPosts(filters, req.user);

    res.json({
      success: true,
      data: result
    });
  }),
  /**
   * Get personalized feed
   * GET /api/v1/posts/feed
   */
  getFeed: asyncHandler(async (req, res) => {
    const filters = postQuerySchema.parse(req.query);
    const result = await PostService.getFeed(req.user, { page: filters.page, limit: filters.limit });
    res.json({
      success: true,
      data: result
    });
  }),

  /**
   * Get single post
   * GET /api/v1/posts/:id
   */
  getPost: asyncHandler(async (req, res) => {
    const { id } = uuidParamSchema.parse(req.params);
    const post = await PostService.getPostById(id, req.user);

    res.json({
      success: true,
      data: { post }
    });
  }),

  /**
   * Create new post
   * POST /api/v1/posts
   */
  createPost: asyncHandler(async (req, res) => {
    const validatedData = createPostSchema.parse(req.body);
    const post = await PostService.createPost(validatedData, req.user);

    res.status(201).json({
      success: true,
      data: { post }
    });
  }),

  /**
   * Update post
   * PATCH /api/v1/posts/:id
   */
  updatePost: asyncHandler(async (req, res) => {
    const { id } = uuidParamSchema.parse(req.params);
    const validatedData = updatePostSchema.parse(req.body);
    const post = await PostService.updatePost(id, validatedData, req.user);

    res.json({
      success: true,
      data: { post }
    });
  }),

  /**
   * Delete post (soft delete)
   * DELETE /api/v1/posts/:id
   */
  deletePost: asyncHandler(async (req, res) => {
    const { id } = uuidParamSchema.parse(req.params);
    await PostService.deletePost(id, req.user);

    res.json({
      success: true,
      message: 'Post deleted successfully'
    });
  }),

  /**
   * Toggle pin status
   * POST /api/v1/posts/:id/pin
   */
  togglePin: asyncHandler(async (req, res) => {
    const { id } = uuidParamSchema.parse(req.params);
    const post = await PostService.togglePin(id);

    res.json({
      success: true,
      data: { post },
      message: post.isPinned ? 'Post pinned' : 'Post unpinned'
    });
  }),

  /**
   * Get user's likes
   * GET /api/v1/likes
   */
  getUserLikes: asyncHandler(async (req, res) => {
    const likes = await LikeService.getUserLikes(req.user.id);

    res.json({
      success: true,
      data: { likes }
    });
  }),

  /**
   * Toggle like on post
   * POST /api/v1/posts/:id/like
   */
  toggleLike: asyncHandler(async (req, res) => {
    const { id: postId } = uuidParamSchema.parse(req.params);
    const result = await LikeService.toggleLike(postId, req.user.id);

    res.json({
      success: true,
      data: result,
      message: result.liked ? 'Post liked' : 'Post unliked'
    });
  })
};

import { Router } from 'express';
import { PostController } from '../controllers/post.controller.js';
import { authenticate, checkAccessLevel, requireAdmin } from '../middleware/auth.js';
import { optionalAuth } from '../middleware/auth.js';
import { postLimiter } from '../middleware/rateLimit.js';

const router = Router();

// Public routes (with optional auth)
router.get('/', optionalAuth, PostController.getPosts);
router.get('/feed', authenticate, PostController.getFeed);
router.get('/:id', optionalAuth, PostController.getPost);

// Protected routes
router.post('/', authenticate, postLimiter, PostController.createPost);
router.patch('/:id', authenticate, PostController.updatePost);
router.delete('/:id', authenticate, PostController.deletePost);

// Like routes
router.get('/likes/me', authenticate, PostController.getUserLikes);
router.post('/:id/like', authenticate, PostController.toggleLike);

// Admin only routes
router.post('/:id/pin', authenticate, requireAdmin, PostController.togglePin);

export default router;

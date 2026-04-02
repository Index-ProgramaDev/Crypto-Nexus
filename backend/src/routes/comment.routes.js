import { Router } from 'express';
import { CommentController } from '../controllers/comment.controller.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { commentLimiter } from '../middleware/rateLimit.js';

const router = Router({ mergeParams: true });

// Routes mounted under /api/v1/posts/:id/comments
router.get('/', authenticate, CommentController.getComments);
router.post('/', authenticate, commentLimiter, CommentController.createComment);

// Individual comment routes
router.patch('/:id', authenticate, CommentController.updateComment);
router.delete('/:id', authenticate, CommentController.deleteComment);

export default router;

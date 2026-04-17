import { Router } from 'express';
import { FollowController } from '../controllers/follow.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router({ mergeParams: true });

// All follow routes require authentication
router.use(authenticate);

// These routes assume they are mounted on /api/v1/users
router.post('/:id/follow', FollowController.toggleFollow);
router.get('/:id/followers', FollowController.getFollowers);
router.get('/:id/following', FollowController.getFollowing);

export default router;

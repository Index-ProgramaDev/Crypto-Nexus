import { Router } from 'express';
import { UserController } from '../controllers/user.controller.js';
import { ModerationController } from '../controllers/moderation.controller.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

// Admin routes
router.get('/', authenticate, requireAdmin, UserController.getAllUsers);
router.get('/stats', authenticate, requireAdmin, UserController.getStats);
router.post('/invite', authenticate, requireAdmin, UserController.inviteUser);
router.get('/:id', authenticate, requireAdmin, UserController.getUserById);
router.patch('/:id', authenticate, requireAdmin, UserController.updateUser);
router.delete('/:id', authenticate, requireAdmin, UserController.deleteUser);

// Block/unblock routes
router.post('/:id/block', authenticate, requireAdmin, UserController.toggleBlock);

export default router;

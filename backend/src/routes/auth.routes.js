import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimit.js';

const router = Router();

// Public routes
router.post('/register', authLimiter, AuthController.register);
router.post('/login', authLimiter, AuthController.login);
router.post('/refresh', AuthController.refreshToken);

// Protected routes
router.post('/logout', authenticate, AuthController.logout);
router.get('/me', authenticate, AuthController.getMe);
router.patch('/me', authenticate, AuthController.updateProfile);
router.post('/change-password', authenticate, AuthController.changePassword);

export default router;

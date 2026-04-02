import { Router } from 'express';
import { ModerationController } from '../controllers/moderation.controller.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

// Admin only routes
router.get('/logs', authenticate, requireAdmin, ModerationController.getLogs);

export default router;

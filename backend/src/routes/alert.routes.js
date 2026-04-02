import { Router } from 'express';
import { AlertController } from '../controllers/alert.controller.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

// User routes
router.get('/', authenticate, AlertController.getAlerts);
router.get('/count', authenticate, AlertController.getUnreadCount);
router.patch('/:id/read', authenticate, AlertController.markAsRead);

// Admin only routes
router.post('/', authenticate, requireAdmin, AlertController.createAlert);
router.delete('/:id', authenticate, requireAdmin, AlertController.deleteAlert);

export default router;

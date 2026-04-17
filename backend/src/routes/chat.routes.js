import { Router } from 'express';
import { ChatController } from '../controllers/chat.controller.js';
import { authenticate } from '../middleware/auth.js';

console.log('📁 chat.routes.js loaded');
console.log('📁 ChatController.adminStartConversation:', typeof ChatController.adminStartConversation);

const router = Router();

router.use(authenticate);

// Get all conversations list (must be before /:conversationId)
router.get('/', ChatController.getConversations);

// Admin only: Start conversation with any user (must be before /:conversationId)
router.post('/admin/start/:id', ChatController.adminStartConversation);

// Start conversation or get existing with a user
router.post('/user/:id', ChatController.createOrGetConversation);

// Get single conversation details with messages
router.get('/:conversationId', ChatController.getConversation);

// Send message in a conversation
router.post('/:conversationId/messages', ChatController.sendMessage);

// Delete conversation (leave/remove from list)
router.delete('/:conversationId', ChatController.deleteConversation);

export default router;

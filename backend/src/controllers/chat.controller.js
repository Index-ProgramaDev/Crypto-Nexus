import { ChatService } from '../services/chat.service.js';
import { uuidParamSchema } from '../utils/validation.js';
import { z } from 'zod';
import { asyncHandler } from '../middleware/error.js';

const messageSchema = z.object({
  content: z.string().min(1).max(2000),
  mediaUrls: z.array(z.string().url()).optional()
});

export const ChatController = {
  createOrGetConversation: asyncHandler(async (req, res) => {
    const { id } = uuidParamSchema.parse(req.params); // target user id
    const conversation = await ChatService.getOrCreateConversation(req.user.id, id);
    res.json({ success: true, data: { conversation } });
  }),

  adminStartConversation: asyncHandler(async (req, res) => {
    const { id } = uuidParamSchema.parse(req.params); // target user id
    const conversation = await ChatService.adminStartConversation(req.user.id, id);
    res.json({ success: true, data: { conversation } });
  }),

  getConversations: asyncHandler(async (req, res) => {
    const conversations = await ChatService.getConversations(req.user.id);
    res.json({ success: true, data: { conversations } });
  }),

  getConversation: asyncHandler(async (req, res) => {
    const { id } = uuidParamSchema.parse({ id: req.params.conversationId });
    const conversation = await ChatService.getConversationById(id, req.user.id);
    res.json({ success: true, data: { conversation } });
  }),

  sendMessage: asyncHandler(async (req, res) => {
    const { id } = uuidParamSchema.parse({ id: req.params.conversationId });
    const validatedData = messageSchema.parse(req.body);
    const message = await ChatService.sendMessage(id, req.user.id, validatedData.content, validatedData.mediaUrls);
    res.status(201).json({ success: true, data: { message } });
  }),

  deleteConversation: asyncHandler(async (req, res) => {
    const { id } = uuidParamSchema.parse({ id: req.params.conversationId });
    const result = await ChatService.deleteConversation(id, req.user.id);
    res.json({ success: true, data: result });
  })
};

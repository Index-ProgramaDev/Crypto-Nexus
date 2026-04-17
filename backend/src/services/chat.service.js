import { prisma } from '../config/database.js';

export const ChatService = {
  /**
   * Get or Create Conversation between two users
   * If isAdminOnly=true, only admins can create conversations
   */
  async getOrCreateConversation(userId1, userId2, isAdminOnly = false, adminId = null) {
    if (userId1 === userId2) {
      throw Object.assign(new Error('Cannot create conversation with yourself'), { statusCode: 400 });
    }

    // Try finding existing via grouping logic or loop
    const user1Conversations = await prisma.conversationParticipant.findMany({
      where: { userId: userId1 },
      select: { conversationId: true }
    });

    const convoIds = user1Conversations.map(c => c.conversationId);

    const match = await prisma.conversationParticipant.findFirst({
      where: {
        userId: userId2,
        conversationId: { in: convoIds }
      },
      include: { conversation: true }
    });

    // If conversation exists, return it
    if (match) {
      return this.getConversationById(match.conversationId, userId1);
    }

    // If admin-only, verify admin is creating
    if (isAdminOnly && adminId) {
      const admin = await prisma.user.findUnique({ where: { id: adminId } });
      if (!admin || admin.role !== 'admin') {
        throw Object.assign(new Error('Only admins can initiate conversations'), { statusCode: 403 });
      }
    }

    // Create new conversation
    const newConvo = await prisma.conversation.create({
      data: {
        isAdminOnly,
        adminId,
        participants: {
          create: [
            { userId: userId1 },
            { userId: userId2 }
          ]
        }
      }
    });

    return this.getConversationById(newConvo.id, userId1);
  },

  /**
   * Admin initiates conversation with a user
   * Only admins can call this
   */
  async adminStartConversation(adminId, userId) {
    // Verify admin
    const admin = await prisma.user.findUnique({ where: { id: adminId } });
    if (!admin || admin.role !== 'admin') {
      throw Object.assign(new Error('Only admins can initiate conversations'), { statusCode: 403 });
    }

    // Check if conversation already exists
    const existing = await this.findConversationBetweenUsers(adminId, userId);
    if (existing) {
      return this.getConversationById(existing.id, adminId);
    }

    // Create admin-only conversation
    const newConvo = await prisma.conversation.create({
      data: {
        isAdminOnly: true,
        adminId,
        participants: {
          create: [
            { userId: adminId },
            { userId }
          ]
        }
      }
    });

    return this.getConversationById(newConvo.id, adminId);
  },

  /**
   * Find existing conversation between two users
   */
  async findConversationBetweenUsers(userId1, userId2) {
    const user1Conversations = await prisma.conversationParticipant.findMany({
      where: { userId: userId1 },
      select: { conversationId: true }
    });

    const convoIds = user1Conversations.map(c => c.conversationId);

    return prisma.conversationParticipant.findFirst({
      where: {
        userId: userId2,
        conversationId: { in: convoIds }
      },
      include: { conversation: true }
    });
  },

  async getConversationById(conversationId, currentUserId) {
    const convo = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participants: {
          include: {
            user: { select: { id: true, username: true, profile: { select: { avatarUrl: true, fullName: true } } } }
          }
        },
        messages: {
          take: 50,
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!convo) throw Object.assign(new Error('Conversation not found'), { statusCode: 404 });

    const isParticipant = convo.participants.some(p => p.userId === currentUserId);
    if (!isParticipant) throw Object.assign(new Error('Not a participant of this conversation'), { statusCode: 403 });

    return convo;
  },

  async getConversations(userId) {
    const participants = await prisma.conversationParticipant.findMany({
      where: { userId },
      select: { conversationId: true }
    });

    const convoIds = participants.map(p => p.conversationId);

    return prisma.conversation.findMany({
      where: { id: { in: convoIds } },
      include: {
        participants: {
          include: {
            user: { select: { id: true, username: true, profile: { select: { avatarUrl: true, fullName: true } } } }
          }
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });
  },

  async sendMessage(conversationId, senderId, content, mediaUrls = []) {
    // Validate participant
    const check = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId: senderId } }
    });

    if (!check) throw Object.assign(new Error('Not Authorized'), { statusCode: 403 });

    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId,
        content,
        mediaUrls
      }
    });

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() }
    });

    return message;
  },

  async deleteConversation(conversationId, userId) {
    // Verify user is a participant
    const participant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } }
    });

    if (!participant) {
      throw Object.assign(new Error('Not authorized to delete this conversation'), { statusCode: 403 });
    }

    // Delete participant record (soft delete for user)
    await prisma.conversationParticipant.delete({
      where: { id: participant.id }
    });

    // Check if any participants remain
    const remainingParticipants = await prisma.conversationParticipant.count({
      where: { conversationId }
    });

    // If no participants left, delete the conversation and messages
    if (remainingParticipants === 0) {
      await prisma.message.deleteMany({ where: { conversationId } });
      await prisma.conversation.delete({ where: { id: conversationId } });
    }

    return { success: true };
  }
};

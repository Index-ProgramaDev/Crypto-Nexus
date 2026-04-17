import { prisma } from '../config/database.js';
import { detectContactInfo } from '../utils/moderation.js';
import { logger } from '../config/logger.js';

export class CommentService {
  /**
   * Get comments for a post
   * @param {string} postId - Post ID
   * @returns {Array} Comments
   */
  static async getCommentsByPost(postId) {
    const comments = await prisma.comment.findMany({
      where: {
        postId,
        status: 'active'
      },
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            profile: {
              select: {
                fullName: true,
                avatarUrl: true
              }
            }
          }
        }
      }
    });

    // Transform to include authorName and authorAvatar for frontend compatibility
    return comments.map(comment => ({
      ...comment,
      authorName: comment.author?.profile?.fullName || comment.author?.username || 'Usuário',
      authorAvatar: comment.author?.profile?.avatarUrl,
      authorId: comment.author?.id
    }));
  }

  /**
   * Create new comment
   * @param {Object} commentData - Comment data
   * @param {Object} user - Author user
   * @returns {Object} Created comment
   */
  static async createComment(commentData, user) {
    const { postId, parentCommentId, content } = commentData;

    // Check if post exists and is active
    const post = await prisma.post.findUnique({
      where: { id: postId }
    });

    if (!post) {
      throw Object.assign(new Error('Post not found'), { statusCode: 404 });
    }

    if (post.status !== 'active') {
      throw Object.assign(new Error('Cannot comment on deleted post'), { statusCode: 400 });
    }

    // Validate parent comment if provided
    if (parentCommentId) {
      const parentComment = await prisma.comment.findUnique({
        where: { id: parentCommentId }
      });

      if (!parentComment) {
        throw Object.assign(new Error('Parent comment not found'), { statusCode: 404 });
      }

      if (parentComment.postId !== postId) {
        throw Object.assign(new Error('Parent comment does not belong to this post'), { statusCode: 400 });
      }
    }

    // Check content for non-admins (moderation)
    if (user.role !== 'admin') {
      const { hasContact } = detectContactInfo(content);
      if (hasContact) {
        throw Object.assign(
          new Error('Content contains contact information which is not allowed'), 
          { statusCode: 400, code: 'contact_info_detected' }
        );
      }
    }

    // Create comment in transaction
    const [comment] = await prisma.$transaction([
      prisma.comment.create({
        data: {
          postId,
          parentCommentId,
          userId: user.id,
          content,
          status: 'active'
        }
      }),
      prisma.post.update({
        where: { id: postId },
        data: { commentsCount: { increment: 1 } }
      })
    ]);

    logger.info(`Comment created by ${user.email} on post ${postId}`);
    return comment;
  }

  /**
   * Update comment
   * @param {string} id - Comment ID
   * @param {Object} updateData - Data to update
   * @param {Object} user - Current user
   * @returns {Object} Updated comment
   */
  static async updateComment(id, updateData, user) {
    const comment = await prisma.comment.findUnique({
      where: { id }
    });

    if (!comment) {
      throw Object.assign(new Error('Comment not found'), { statusCode: 404 });
    }

    // Check ownership
    if (comment.userId !== user.id) {
      throw Object.assign(new Error('Not authorized to update this comment'), { statusCode: 403 });
    }

    // Check content for non-admins (moderation)
    if (user.role !== 'admin' && updateData.content) {
      const { hasContact } = detectContactInfo(updateData.content);
      if (hasContact) {
        throw Object.assign(
          new Error('Content contains contact information which is not allowed'), 
          { statusCode: 400, code: 'contact_info_detected' }
        );
      }
    }

    const updated = await prisma.comment.update({
      where: { id },
      data: updateData
    });

    logger.info(`Comment updated: ${id} by ${user.email}`);
    return updated;
  }

  /**
   * Delete comment (soft delete)
   * @param {string} id - Comment ID
   * @param {Object} user - Current user
   */
  static async deleteComment(id, user) {
    const comment = await prisma.comment.findUnique({
      where: { id }
    });

    if (!comment) {
      throw Object.assign(new Error('Comment not found'), { statusCode: 404 });
    }

    // Check ownership or admin
    if (comment.userId !== user.id && user.role !== 'admin') {
      throw Object.assign(new Error('Not authorized to delete this comment'), { statusCode: 403 });
    }

    await prisma.$transaction([
      prisma.comment.update({
        where: { id },
        data: { status: 'deleted' }
      }),
      prisma.post.update({
        where: { id: comment.postId },
        data: { commentsCount: { decrement: 1 } }
      })
    ]);

    logger.info(`Comment deleted: ${id} by ${user.email}`);
  }
}

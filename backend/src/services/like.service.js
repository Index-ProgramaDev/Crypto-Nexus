import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';

export class LikeService {
  /**
   * Get likes for current user
   * @param {string} userEmail - User email
   * @returns {Array} User's likes
   */
  static async getUserLikes(userEmail) {
    const likes = await prisma.like.findMany({
      where: { userEmail },
      orderBy: { createdAt: 'desc' }
    });

    return likes;
  }

  /**
   * Toggle like on a post
   * @param {string} postId - Post ID
   * @param {string} userEmail - User email
   * @returns {Object} Result with liked status
   */
  static async toggleLike(postId, userEmail) {
    // Check if post exists
    const post = await prisma.post.findUnique({
      where: { id: postId }
    });

    if (!post) {
      throw Object.assign(new Error('Post not found'), { statusCode: 404 });
    }

    if (post.status !== 'active') {
      throw Object.assign(new Error('Cannot like deleted post'), { statusCode: 400 });
    }

    // Check if already liked
    const existingLike = await prisma.like.findUnique({
      where: {
        postId_userEmail: {
          postId,
          userEmail
        }
      }
    });

    if (existingLike) {
      // Unlike (delete)
      await prisma.$transaction([
        prisma.like.delete({
          where: { id: existingLike.id }
        }),
        prisma.post.update({
          where: { id: postId },
          data: { likesCount: { decrement: 1 } }
        })
      ]);

      logger.info(`Post unliked: ${postId} by ${userEmail}`);
      return { liked: false };
    } else {
      // Like (create)
      await prisma.$transaction([
        prisma.like.create({
          data: {
            postId,
            userEmail
          }
        }),
        prisma.post.update({
          where: { id: postId },
          data: { likesCount: { increment: 1 } }
        })
      ]);

      logger.info(`Post liked: ${postId} by ${userEmail}`);
      return { liked: true };
    }
  }
}

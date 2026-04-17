import { prisma } from '../config/database.js';
import { canViewContent, detectContactInfo } from '../utils/moderation.js';
import { logger } from '../config/logger.js';

export class PostService {
  /**
   * Get posts with filtering and pagination
   * @param {Object} filters - Query filters
   * @param {Object} user - Current user
   * @returns {Object} Posts and pagination info
   */
  static async getPosts(filters, user) {
    const { accessLevel, status = 'active', authorEmail, isSignal, page = 1, limit = 20, sort = '-created_at' } = filters;

    // Build where clause
    const where = { status };

    // Filter by access level if specified
    if (accessLevel) {
      where.accessLevel = accessLevel;
    }

    // Enforce access level permissions based on user's role/vip status
    // If no specific accessLevel requested, filter to what user can see
    if (!accessLevel && user) {
      const accessibleLevels = ['public'];
      if (user.role !== 'user') accessibleLevels.push('mentored');
      if (user.role === 'advanced' || user.role === 'admin') accessibleLevels.push('advanced');
      if (user.vipAccess || user.role === 'admin') accessibleLevels.push('vip');
      where.accessLevel = { in: accessibleLevels };
    } else if (!accessLevel && !user) {
      // Non-authenticated users only see public
      where.accessLevel = 'public';
    }

    // Filter by author email (find user first, then filter by userId)
    if (authorEmail) {
      const author = await prisma.user.findUnique({
        where: { email: authorEmail },
        select: { id: true }
      });
      if (author) {
        where.userId = author.id;
      }
    }

    // Filter by signal posts
    if (isSignal) {
      where.isSignal = true;
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Parse sort order - map API snake_case to Prisma camelCase
    const orderBy = {};
    const rawSortField = sort.startsWith('-') ? sort.substring(1) : sort;
    const sortOrder = sort.startsWith('-') ? 'desc' : 'asc';
    // Map common field names from API format to Prisma schema format
    const fieldMap = {
      'created_at': 'createdAt',
      'updated_at': 'updatedAt',
      'likes_count': 'likesCount',
      'comments_count': 'commentsCount'
    };
    const sortField = fieldMap[rawSortField] || rawSortField;
    orderBy[sortField] = sortOrder;

    // Get posts
    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        orderBy: [
          { isPinned: 'desc' }, // Pinned posts first
          orderBy
        ],
        skip,
        take: limit,
        include: {
          author: {
            select: { id: true, username: true, profile: { select: { avatarUrl: true, fullName: true } } }
          },
          _count: {
            select: { comments: true, likes: true }
          }
        }
      }),
      prisma.post.count({ where })
    ]);

    // Public feed (everyone sees everything active)
    const accessiblePosts = posts;

    return {
      posts: accessiblePosts.map(post => ({
        ...post,
        likesCount: post._count.likes,
        commentsCount: post._count.comments,
        _count: undefined
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + accessiblePosts.length < total
      }
    };
  }

  /**
   * Get single post by ID
   * @param {string} id - Post ID
   * @param {Object} user - Current user
   * @returns {Object} Post
   */
  static async getPostById(id, user) {
    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        _count: {
          select: { comments: true, likes: true }
        }
      }
    });

    if (!post) {
      throw Object.assign(new Error('Post not found'), { statusCode: 404 });
    }

    // Removed role access checking as logic is transitioning to Graph

    return {
      ...post,
      likesCount: post._count.likes,
      commentsCount: post._count.comments,
      _count: undefined
    };
  }

  /**
   * Get Feed for User (Posts from users they follow + their own)
   */
  static async getFeed(user, { page = 1, limit = 20 } = {}) {
    // 1. Get all users the current user is following
    const following = await prisma.follow.findMany({
      where: { followerId: user.id },
      select: { followingId: true }
    });
    
    // Create an array of IDs representing the feed context (followed + self)
    const feedUserIds = [...following.map(f => f.followingId), user.id];
    
    const skip = (page - 1) * limit;
    const where = {
      userId: { in: feedUserIds },
      status: 'active'
    };

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          author: {
            select: { id: true, username: true, profile: { select: { avatarUrl: true, fullName: true } } }
          },
          _count: { select: { comments: true, likes: true } }
        }
      }),
      prisma.post.count({ where })
    ]);

    return {
      posts: posts.map(post => ({
        ...post,
        likesCount: post._count.likes,
        commentsCount: post._count.comments,
        _count: undefined
      })),
      pagination: {
        page, limit, total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + posts.length < total
      }
    };
  }

  /**
   * Create new post
   * @param {Object} postData - Post data
   * @param {Object} user - Author user
   * @returns {Object} Created post
   */
  static async createPost(postData, user) {
    const { content, mediaUrls, accessLevel, isSignal, signalType } = postData;

    // Check content for non-admins (moderation)
    if (user.role !== 'admin' && content) {
      const { hasContact } = detectContactInfo(content);
      if (hasContact) {
        throw Object.assign(
          new Error('Content contains contact information which is not allowed'),
          { statusCode: 400, code: 'contact_info_detected' }
        );
      }
    }

    const post = await prisma.post.create({
      data: {
        content,
        mediaUrls: mediaUrls || [],
        userId: user.id,
        accessLevel: accessLevel || 'public',
        status: 'active',
        isSignal: isSignal || false,
        signalType: signalType || null
      }
    });

    logger.info(`Post created by user ${user.id}: ${post.id}${isSignal ? ' (signal: ' + signalType + ')' : ''}`);
    return post;
  }

  /**
   * Update post
   * @param {string} id - Post ID
   * @param {Object} updateData - Data to update
   * @param {Object} user - Current user
   * @returns {Object} Updated post
   */
  static async updatePost(id, updateData, user) {
    const post = await prisma.post.findUnique({
      where: { id }
    });

    if (!post) {
      throw Object.assign(new Error('Post not found'), { statusCode: 404 });
    }

    // Check ownership or admin
    if (post.userId !== user.id && user.role !== 'admin') {
      throw Object.assign(new Error('Not authorized to update this post'), { statusCode: 403 });
    }

    // Only admin can pin/unpin
    if (updateData.isPinned !== undefined && user.role !== 'admin') {
      throw Object.assign(new Error('Only admins can pin posts'), { statusCode: 403 });
    }

    const updated = await prisma.post.update({
      where: { id },
      data: updateData
    });

    logger.info(`Post updated: ${id} by ${user.email}`);
    return updated;
  }

  /**
   * Delete post (soft delete)
   * @param {string} id - Post ID
   * @param {Object} user - Current user
   */
  static async deletePost(id, user) {
    const post = await prisma.post.findUnique({
      where: { id }
    });

    if (!post) {
      throw Object.assign(new Error('Post not found'), { statusCode: 404 });
    }

    // Check ownership or admin
    if (post.userId !== user.id && user.role !== 'admin') {
      throw Object.assign(new Error('Not authorized to delete this post'), { statusCode: 403 });
    }

    await prisma.post.update({
      where: { id },
      data: { status: 'deleted' }
    });

    logger.info(`Post deleted: ${id} by ${user.email}`);
  }

  /**
   * Toggle pin status (admin only)
   * @param {string} id - Post ID
   * @returns {Object} Updated post
   */
  static async togglePin(id) {
    const post = await prisma.post.findUnique({
      where: { id }
    });

    if (!post) {
      throw Object.assign(new Error('Post not found'), { statusCode: 404 });
    }

    const updated = await prisma.post.update({
      where: { id },
      data: { isPinned: !post.isPinned }
    });

    logger.info(`Post pin toggled: ${id}, isPinned: ${updated.isPinned}`);
    return updated;
  }
}

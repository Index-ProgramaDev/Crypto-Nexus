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

    // Filter by author
    if (authorEmail) {
      where.authorEmail = authorEmail;
    }

    // Filter by signal
    if (isSignal !== undefined) {
      where.isSignal = isSignal;
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Parse sort order
    const orderBy = {};
    const sortField = sort.startsWith('-') ? sort.substring(1) : sort;
    const sortOrder = sort.startsWith('-') ? 'desc' : 'asc';
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
          _count: {
            select: { comments: true, likes: true }
          }
        }
      }),
      prisma.post.count({ where })
    ]);

    // Filter posts based on user access level
    const accessiblePosts = user 
      ? posts.filter(post => canViewContent(user.role, user.vipAccess, post.accessLevel))
      : posts.filter(post => post.accessLevel === 'public');

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

    // Check access
    if (!canViewContent(user?.role, user?.vipAccess, post.accessLevel)) {
      throw Object.assign(new Error('Access denied'), { statusCode: 403 });
    }

    return {
      ...post,
      likesCount: post._count.likes,
      commentsCount: post._count.comments,
      _count: undefined
    };
  }

  /**
   * Create new post
   * @param {Object} postData - Post data
   * @param {Object} user - Author user
   * @returns {Object} Created post
   */
  static async createPost(postData, user) {
    const { content, imageUrl, accessLevel, isSignal, signalType } = postData;

    // Non-admins can only create public posts
    if (user.role !== 'admin' && accessLevel !== 'public') {
      throw Object.assign(new Error('Only admins can create restricted posts'), { statusCode: 403 });
    }

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
        imageUrl,
        authorEmail: user.email,
        authorName: user.fullName,
        authorAvatar: user.avatarUrl,
        accessLevel,
        isSignal: isSignal || false,
        signalType,
        status: 'active'
      }
    });

    logger.info(`Post created by ${user.email}: ${post.id}`);
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
    if (post.authorEmail !== user.email && user.role !== 'admin') {
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
    if (post.authorEmail !== user.email && user.role !== 'admin') {
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

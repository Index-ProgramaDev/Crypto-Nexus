import { z } from 'zod';

// User Role Enum
export const UserRole = z.enum(['user', 'mentored', 'advanced', 'admin']);

// Access Level Enum
export const AccessLevel = z.enum(['public', 'mentored', 'advanced', 'vip']);

// Signal Type Enum
export const SignalType = z.enum(['buy', 'sell', 'hold', 'alert']);

// Alert Type Enum
export const AlertType = z.enum(['info', 'warning', 'urgent', 'signal']);

// Pagination Schema
export const paginationSchema = z.object({
  page: z.string().optional().transform(val => parseInt(val) || 1),
  limit: z.string().optional().transform(val => {
    const parsed = parseInt(val) || 20;
    return Math.min(parsed, 100); // Max 100 items per page
  }),
  sort: z.string().optional().default('-created_at')
});

// Login Schema
export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

// Register Schema
export const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  fullName: z.string().min(2, 'Full name is required').max(255),
  role: UserRole.optional().default('user')
});

// Update Profile Schema
export const updateProfileSchema = z.object({
  fullName: z.string().min(2).max(255).optional(),
  bio: z.string().max(500).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  avatarUrl: z.string().url().optional().nullable()
});

// Update User Schema (Admin)
export const updateUserSchema = z.object({
  role: UserRole.optional(),
  vipAccess: z.boolean().optional(),
  isBlocked: z.boolean().optional(),
  blockedUntil: z.string().datetime().optional().nullable()
});

// Create Post Schema
export const createPostSchema = z.object({
  content: z.string().max(5000).optional(),
  imageUrl: z.string().url().optional().nullable(),
  accessLevel: AccessLevel.default('public'),
  isSignal: z.boolean().default(false),
  signalType: SignalType.optional()
}).refine(data => {
  // Either content or imageUrl must be provided
  return data.content || data.imageUrl;
}, {
  message: 'Either content or image is required',
  path: ['content']
}).refine(data => {
  // If isSignal is true, signalType is required
  if (data.isSignal && !data.signalType) {
    return false;
  }
  return true;
}, {
  message: 'Signal type is required when post is marked as signal',
  path: ['signalType']
});

// Update Post Schema
export const updatePostSchema = z.object({
  content: z.string().max(5000).optional(),
  imageUrl: z.string().url().optional().nullable(),
  status: z.enum(['active', 'deleted', 'suspended']).optional(),
  isPinned: z.boolean().optional()
});

// Post Query Schema
export const postQuerySchema = z.object({
  accessLevel: AccessLevel.optional(),
  status: z.enum(['active', 'deleted', 'suspended']).optional().default('active'),
  authorEmail: z.string().email().optional(),
  isSignal: z.string().transform(val => val === 'true').optional(),
  ...paginationSchema.shape
});

// Create Comment Schema
export const createCommentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty').max(2000),
  parentCommentId: z.string().uuid().optional().nullable()
});

// Update Comment Schema
export const updateCommentSchema = z.object({
  content: z.string().min(1).max(2000).optional()
});

// Create Alert Schema
export const createAlertSchema = z.object({
  title: z.string().min(1).max(255),
  message: z.string().min(1).max(5000),
  type: AlertType.default('info'),
  targetLevel: AccessLevel.default('public'),
  targetEmail: z.string().email().optional().nullable()
});

// Alert Query Schema (for users)
export const alertQuerySchema = z.object({
  isRead: z.string().transform(val => val === 'true').optional()
});

// Invite User Schema
export const inviteUserSchema = z.object({
  email: z.string().email(),
  role: UserRole.default('user')
});

// UUID Param Schema
export const uuidParamSchema = z.object({
  id: z.string().uuid('Invalid ID format')
});

// File Upload Schema (for validation)
export const fileUploadSchema = z.object({
  mimetype: z.string().refine(val => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    return allowedTypes.test(val);
  }, 'Only image files are allowed'),
  size: z.number().max(5 * 1024 * 1024, 'File size must be less than 5MB')
});

import { prisma } from '../config/database.js';

export const FollowService = {
  async toggleFollow(targetUserId, currentUser) {
    if (targetUserId === currentUser.id) {
      throw Object.assign(new Error('You cannot follow yourself'), { statusCode: 400 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId }
    });

    if (!targetUser) {
      throw Object.assign(new Error('User not found'), { statusCode: 404 });
    }

    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: currentUser.id,
          followingId: targetUserId
        }
      }
    });

    if (existingFollow) {
      // Unfollow
      await prisma.$transaction([
        prisma.follow.delete({
          where: { id: existingFollow.id }
        }),
        prisma.profile.update({
          where: { userId: currentUser.id },
          data: { followingCount: { decrement: 1 } }
        }),
        prisma.profile.update({
          where: { userId: targetUserId },
          data: { followersCount: { decrement: 1 } }
        })
      ]);
      return { following: false };
    } else {
      // Follow
      await prisma.$transaction([
        prisma.follow.create({
          data: {
            followerId: currentUser.id,
            followingId: targetUserId
          }
        }),
        prisma.profile.update({
          where: { userId: currentUser.id },
          data: { followingCount: { increment: 1 } }
        }),
        prisma.profile.update({
          where: { userId: targetUserId },
          data: { followersCount: { increment: 1 } }
        }),
        prisma.notification.create({
          data: {
            userId: targetUserId,
            actorId: currentUser.id,
            type: 'follow',
            content: `${currentUser.username || currentUser.email} started following you`
          }
        })
      ]);
      return { following: true };
    }
  },

  async getFollowers(userId) {
    const follows = await prisma.follow.findMany({
      where: { followingId: userId },
      include: {
        follower: {
          select: {
            id: true,
            username: true,
            profile: {
              select: { avatarUrl: true, fullName: true }
            }
          }
        }
      }
    });
    return follows.map(f => f.follower);
  },

  async getFollowing(userId) {
    const follows = await prisma.follow.findMany({
      where: { followerId: userId },
      include: {
        following: {
          select: {
            id: true,
            username: true,
            profile: {
              select: { avatarUrl: true, fullName: true }
            }
          }
        }
      }
    });
    return follows.map(f => f.following);
  }
};

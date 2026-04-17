import React from 'react';
import { Loader2 } from 'lucide-react';
import PostCard from './PostCard';

export default function PostList({ posts, user, userLikes, isLoading, onRefresh }) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!posts || posts.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground text-sm">Nenhuma publicação ainda.</p>
        <p className="text-muted-foreground/60 text-xs mt-1">Seja o primeiro a compartilhar!</p>
      </div>
    );
  }

  const sorted = [...posts].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    const dateA = new Date(a.createdAt || 0).getTime();
    const dateB = new Date(b.createdAt || 0).getTime();
    return dateB - dateA;
  });

  return (
    <div className="space-y-4">
      {sorted.map(post => (
        <PostCard key={post.id} post={post} user={user} userLikes={userLikes} onRefresh={onRefresh} />
      ))}
    </div>
  );
}
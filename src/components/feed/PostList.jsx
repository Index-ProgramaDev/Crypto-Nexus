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
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    return new Date(b.created_date) - new Date(a.created_date);
  });

  return (
    <div className="space-y-4">
      {sorted.map(post => (
        <PostCard key={post.id} post={post} user={user} userLikes={userLikes} onRefresh={onRefresh} />
      ))}
    </div>
  );
}
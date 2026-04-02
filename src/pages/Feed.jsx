import React from 'react';
import { api } from '@/api/apiClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import CreatePost from '@/components/feed/CreatePost';
import PostList from '@/components/feed/PostList';

export default function Feed() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: postsData, isLoading } = useQuery({
    queryKey: ['posts', 'public'],
    queryFn: () => api.getPosts({ accessLevel: 'public', status: 'active', limit: 50 }),
  });

  const { data: likesData } = useQuery({
    queryKey: ['likes', user?.email],
    queryFn: () => api.getUserLikes(),
    enabled: !!user?.email,
  });

  const posts = postsData?.data?.posts || [];
  const userLikes = likesData?.data?.likes || [];

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['posts'] });
    queryClient.invalidateQueries({ queryKey: ['likes'] });
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">Feed</h1>
        <p className="text-sm text-muted-foreground">Acompanhe as novidades da comunidade</p>
      </div>
      <CreatePost user={user} accessLevel="public" onPostCreated={refresh} />
      <PostList posts={posts} user={user} userLikes={userLikes} isLoading={isLoading} onRefresh={refresh} />
    </div>
  );
}
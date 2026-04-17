import React from 'react';
import { api } from '@/api/apiClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import CreatePost from '@/components/feed/CreatePost';
import PostList from '@/components/feed/PostList';
import { Lock, GraduationCap } from 'lucide-react';
import AccessDeniedDialog from '@/components/auth/AccessDeniedDialog';

export default function MentoredArea() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const hasAccess = ['mentored', 'advanced', 'admin'].includes(user?.role);

  const { data: postsData, isLoading } = useQuery({
    queryKey: ['posts', 'mentored'],
    queryFn: () => api.getPosts({ accessLevel: 'mentored', status: 'active' }),
    enabled: hasAccess,
  });

  const posts = postsData?.data?.posts || [];

  const { data: likesData } = useQuery({
    queryKey: ['likes', user?.id],
    queryFn: () => api.getUserLikes(),
    enabled: !!user?.id,
  });

  const userLikes = likesData?.data?.likes || [];

  if (!hasAccess) {
    return <AccessDeniedDialog area="mentored" onClose={() => window.history.back()} />;
  }

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['posts', 'mentored'] });
    queryClient.invalidateQueries({ queryKey: ['likes'] });
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <GraduationCap className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Área dos Mentorados</h1>
          <p className="text-sm text-muted-foreground">Conteúdo exclusivo para mentorados</p>
        </div>
      </div>
      {user?.role === 'admin' && (
        <CreatePost user={user} accessLevel="mentored" onPostCreated={refresh} />
      )}
      <PostList posts={posts} user={user} userLikes={userLikes} isLoading={isLoading} onRefresh={refresh} />
    </div>
  );
}
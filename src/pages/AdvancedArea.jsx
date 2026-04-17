import React from 'react';
import { api } from '@/api/apiClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import CreatePost from '@/components/feed/CreatePost';
import PostList from '@/components/feed/PostList';
import { Lock, TrendingUp } from 'lucide-react';
import AccessDeniedDialog from '@/components/auth/AccessDeniedDialog';

export default function AdvancedArea() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const hasAccess = ['advanced', 'admin'].includes(user?.role);

  const { data: postsData, isLoading } = useQuery({
    queryKey: ['posts', 'advanced'],
    queryFn: () => api.getPosts({ accessLevel: 'advanced', status: 'active' }),
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
    return <AccessDeniedDialog area="advanced" onClose={() => window.history.back()} />;
  }

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['posts', 'advanced'] });
    queryClient.invalidateQueries({ queryKey: ['likes'] });
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-neon-blue/10 flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-neon-blue" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Área Avançada</h1>
          <p className="text-sm text-muted-foreground">Conteúdo premium e análises aprofundadas</p>
        </div>
      </div>
      {user?.role === 'admin' && (
        <CreatePost user={user} accessLevel="advanced" onPostCreated={refresh} />
      )}
      <PostList posts={posts} user={user} userLikes={userLikes} isLoading={isLoading} onRefresh={refresh} />
    </div>
  );
}
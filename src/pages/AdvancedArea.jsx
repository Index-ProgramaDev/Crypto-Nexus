import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import CreatePost from '@/components/feed/CreatePost';
import PostList from '@/components/feed/PostList';
import { Lock, TrendingUp } from 'lucide-react';

export default function AdvancedArea() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const hasAccess = ['advanced', 'admin'].includes(user?.role);

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['posts', 'advanced'],
    queryFn: () => base44.entities.Post.filter({ access_level: 'advanced', status: 'active' }, '-created_date', 50),
    enabled: hasAccess,
  });

  const { data: userLikes = [] } = useQuery({
    queryKey: ['likes', user?.email],
    queryFn: () => base44.entities.Like.filter({ user_email: user?.email }),
    enabled: !!user?.email,
  });

  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-neon-blue/10 flex items-center justify-center mb-4">
          <Lock className="w-8 h-8 text-neon-blue" />
        </div>
        <h2 className="text-xl font-bold mb-2">Área Avançada</h2>
        <p className="text-muted-foreground text-sm max-w-md">
          Conteúdo premium exclusivo para mentorados avançados. Fale com a administração para upgrade.
        </p>
      </div>
    );
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
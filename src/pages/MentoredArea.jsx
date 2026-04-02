import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import CreatePost from '@/components/feed/CreatePost';
import PostList from '@/components/feed/PostList';
import { Lock, GraduationCap } from 'lucide-react';

export default function MentoredArea() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const hasAccess = ['mentored', 'advanced', 'admin'].includes(user?.role);

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['posts', 'mentored'],
    queryFn: () => base44.entities.Post.filter({ access_level: 'mentored', status: 'active' }, '-created_date', 50),
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
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <Lock className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-xl font-bold mb-2">Área Exclusiva</h2>
        <p className="text-muted-foreground text-sm max-w-md">
          Esta área é exclusiva para mentorados. Entre em contato com a administração para obter acesso.
        </p>
      </div>
    );
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
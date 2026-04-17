import React, { useState } from 'react';
import { api } from '@/api/apiClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import PostList from '@/components/feed/PostList';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Crown, Lock, Send, Loader2, TrendingUp, TrendingDown, AlertTriangle, Pause, BarChart3 } from 'lucide-react';
import AccessDeniedDialog from '@/components/auth/AccessDeniedDialog';

export default function VipRoom() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const hasAccess = user?.vipAccess || user?.role === 'admin';
  const isAdmin = user?.role === 'admin';

  const [content, setContent] = useState('');
  const [signalType, setSignalType] = useState('buy');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: postsData, isLoading } = useQuery({
    queryKey: ['posts', 'vip'],
    queryFn: () => api.getPosts({ accessLevel: 'vip', status: 'active' }),
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
    return <AccessDeniedDialog area="vip" onClose={() => window.history.back()} />;
  }

  const handleSignalPost = async () => {
    if (!content.trim()) return;
    setIsSubmitting(true);
    await api.createPost({
      content: content.trim(),
      accessLevel: 'vip',
      isSignal: true,
      signalType: signalType,
    });
    setContent('');
    setIsSubmitting(false);
    queryClient.invalidateQueries({ queryKey: ['posts', 'vip'] });
  };

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['posts', 'vip'] });
    queryClient.invalidateQueries({ queryKey: ['likes'] });
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-neon-purple/10 flex items-center justify-center">
          <Crown className="w-5 h-5 text-neon-purple" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Sala VIP</h1>
          <p className="text-sm text-muted-foreground">Sinais de operações cripto em tempo real</p>
        </div>
      </div>

      {isAdmin && (
        <div className="bg-card rounded-xl border border-neon-purple/20 p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'buy', icon: TrendingUp, label: 'Compra', color: 'text-primary', bg: 'bg-primary/10 border-primary/20' },
                { value: 'sell', icon: TrendingDown, label: 'Venda', color: 'text-destructive', bg: 'bg-destructive/10 border-destructive/20' },
                { value: 'hold', icon: Pause, label: 'Hold', color: 'text-neon-blue', bg: 'bg-neon-blue/10 border-neon-blue/20' },
                { value: 'alert', icon: AlertTriangle, label: 'Alerta', color: 'text-neon-purple', bg: 'bg-neon-purple/10 border-neon-purple/20' },
              ].map((signal) => {
                const Icon = signal.icon;
                const isSelected = signalType === signal.value;
                return (
                  <button
                    key={signal.value}
                    onClick={() => setSignalType(signal.value)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                      isSelected
                        ? `${signal.bg} ${signal.color} ring-2 ring-offset-1 ring-offset-background`
                        : 'bg-secondary/50 text-muted-foreground border-border hover:bg-secondary'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${signal.color}`} />
                    {signal.label}
                  </button>
                );
              })}
            </div>
          </div>
          <Textarea
            placeholder="Descreva o sinal de operação..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="bg-secondary/50 border-0"
          />
          <Button onClick={handleSignalPost} disabled={!content.trim() || isSubmitting} className="bg-neon-purple hover:bg-neon-purple/90 text-white">
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4 mr-1.5" /> Enviar Sinal</>}
          </Button>
        </div>
      )}

      <PostList posts={posts} user={user} userLikes={userLikes} isLoading={isLoading} onRefresh={refresh} />
    </div>
  );
}
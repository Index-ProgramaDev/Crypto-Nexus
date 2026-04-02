import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import PostList from '@/components/feed/PostList';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Crown, Lock, Send, Loader2, TrendingUp, TrendingDown, AlertTriangle, Pause } from 'lucide-react';

export default function VipRoom() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const hasAccess = user?.vip_access || user?.role === 'admin';
  const isAdmin = user?.role === 'admin';

  const [content, setContent] = useState('');
  const [signalType, setSignalType] = useState('buy');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['posts', 'vip'],
    queryFn: () => base44.entities.Post.filter({ access_level: 'vip', status: 'active' }, '-created_date', 50),
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
        <div className="w-20 h-20 rounded-2xl bg-neon-purple/10 flex items-center justify-center mb-4 animate-glow">
          <Crown className="w-10 h-10 text-neon-purple" />
        </div>
        <h2 className="text-xl font-bold mb-2">Sala VIP</h2>
        <p className="text-muted-foreground text-sm max-w-md">
          Acesso exclusivo com sinais de operações cripto em tempo real. Liberação manual pelos administradores.
        </p>
        <Lock className="w-5 h-5 text-muted-foreground mt-4" />
      </div>
    );
  }

  const handleSignalPost = async () => {
    if (!content.trim()) return;
    setIsSubmitting(true);
    await base44.entities.Post.create({
      content: content.trim(),
      author_name: user.full_name,
      author_email: user.email,
      author_avatar: user.avatar_url,
      access_level: 'vip',
      is_signal: true,
      signal_type: signalType,
      likes_count: 0,
      comments_count: 0,
      status: 'active',
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
            <Select value={signalType} onValueChange={setSignalType}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="buy"><span className="flex items-center gap-2"><TrendingUp className="w-3 h-3 text-primary" /> Compra</span></SelectItem>
                <SelectItem value="sell"><span className="flex items-center gap-2"><TrendingDown className="w-3 h-3 text-destructive" /> Venda</span></SelectItem>
                <SelectItem value="hold"><span className="flex items-center gap-2"><Pause className="w-3 h-3 text-neon-blue" /> Hold</span></SelectItem>
                <SelectItem value="alert"><span className="flex items-center gap-2"><AlertTriangle className="w-3 h-3 text-neon-purple" /> Alerta</span></SelectItem>
              </SelectContent>
            </Select>
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
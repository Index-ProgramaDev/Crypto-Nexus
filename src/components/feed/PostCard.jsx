import React, { useState } from 'react';
import { api } from '@/api/apiClient';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Heart, MessageCircle, Pin, Trash2, MoreHorizontal, TrendingUp, TrendingDown, AlertTriangle, Pause, MessageSquare, Eye } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { getRoleBadge } from '@/lib/moderation';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import CommentSection from './CommentSection';

const signalIcons = {
  buy: { icon: TrendingUp, color: 'text-primary', bg: 'bg-primary/10', label: 'COMPRA' },
  sell: { icon: TrendingDown, color: 'text-destructive', bg: 'bg-destructive/10', label: 'VENDA' },
  hold: { icon: Pause, color: 'text-neon-blue', bg: 'bg-neon-blue/10', label: 'HOLD' },
  alert: { icon: AlertTriangle, color: 'text-neon-purple', bg: 'bg-neon-purple/10', label: 'ALERTA' },
};

export default function PostCard({ post, user, userLikes, onRefresh }) {
  const [showComments, setShowComments] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [optimisticLiked, setOptimisticLiked] = useState(null);
  const [optimisticLikesCount, setOptimisticLikesCount] = useState(null);
  const isAdmin = user?.role === 'admin';
  const isOwner = post.author?.email === user?.email || post.userId === user?.id;
  const isLiked = optimisticLiked !== null ? optimisticLiked : userLikes?.some(l => l.postId === post.id);
  const likesCount = optimisticLikesCount !== null ? optimisticLikesCount : (post.likesCount || 0);
  
  const timeAgo = post.createdAt 
    ? formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: ptBR }) 
    : '';

  const handleLike = async () => {
    if (isLiking) return;
    setIsLiking(true);

    // Optimistic update - update UI immediately
    const newLiked = !isLiked;
    const newCount = newLiked ? likesCount + 1 : likesCount - 1;
    setOptimisticLiked(newLiked);
    setOptimisticLikesCount(newCount);

    try {
      await api.toggleLike(post.id);
      onRefresh?.();
    } catch (error) {
      // Revert on error
      setOptimisticLiked(null);
      setOptimisticLikesCount(null);
      console.error('Like failed:', error);
    } finally {
      setIsLiking(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.deletePost(post.id);
      onRefresh?.();
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const handlePin = async () => {
    try {
      await api.togglePinPost(post.id);
      onRefresh?.();
    } catch (error) {
      console.error('Pin failed:', error);
    }
  };

  const signal = post.isSignal && post.signalType ? signalIcons[post.signalType] : null;
  const SignalIcon = signal?.icon;

  return (
    <Card className="border-border bg-card overflow-hidden transition-all hover:border-border/80">
      {post.isPinned && (
        <div className="px-4 py-1.5 bg-primary/5 border-b border-border flex items-center gap-1.5 text-xs text-primary font-medium">
          <Pin className="w-3 h-3" /> Fixado
        </div>
      )}
      
      {signal && (
        <div className={`px-4 py-2 ${signal.bg} border-b border-border flex items-center gap-2`}>
          <SignalIcon className={`w-4 h-4 ${signal.color}`} />
          <span className={`text-xs font-bold ${signal.color}`}>SINAL: {signal.label}</span>
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div 
                className="flex items-center gap-3 cursor-pointer hover:bg-secondary/50 p-1.5 rounded-lg transition-colors"
                title="Clique para opções"
              >
                <Avatar className="w-10 h-10 border border-border">
                  <AvatarImage src={post.author?.profile?.avatarUrl} />
                  <AvatarFallback className="bg-secondary text-sm">
                    {post.author?.profile?.fullName?.charAt(0)?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm hover:underline">{post.author?.profile?.fullName || post.author?.username || 'Usuário'}</span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-border">
                      {post.accessLevel === 'vip' ? '👑 VIP' : post.accessLevel}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{timeAgo}</p>
                </div>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => window.location.href = `/profile?userId=${post.author?.id}`}>
                <Eye className="w-4 h-4 mr-2" />
                Ver perfil
              </DropdownMenuItem>
              {isAdmin && post.author?.id !== user?.id && (
                <DropdownMenuItem 
                  onClick={async (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    try {
                      console.log('Starting conversation with user:', post.author?.id);
                      const response = await api.adminStartConversation(post.author?.id);
                      console.log('Response:', response);
                      const conversationId = response.data?.conversation?.id || response.data?.data?.conversation?.id;
                      console.log('Conversation ID:', conversationId);
                      if (conversationId) {
                        console.log('Dispatching openChat event');
                        window.dispatchEvent(new CustomEvent('openChat', { detail: { conversationId } }));
                        console.log('Event dispatched');
                      } else {
                        console.error('No conversation ID in response:', response);
                        alert('Erro: ID da conversa não encontrado na resposta');
                      }
                    } catch (error) {
                      console.error('Error starting conversation:', error);
                      alert('Erro ao iniciar conversa: ' + error.message);
                    }
                  }}
                  className="text-neon-purple"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Conversar
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {(isAdmin || isOwner) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {isAdmin && (
                  <DropdownMenuItem onClick={handlePin}>
                    <Pin className="w-4 h-4 mr-2" />
                    {post.isPinned ? 'Desafixar' : 'Fixar'}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <p className="text-sm leading-relaxed whitespace-pre-wrap mb-3">{post.content}</p>

        {(post.mediaUrls && post.mediaUrls.length > 0) && (
          <div className="mb-3 rounded-lg overflow-hidden border border-border">
            <img src={post.mediaUrls[0]} alt="" className="w-full max-h-96 object-cover" />
          </div>
        )}

        <div className="flex items-center gap-1 pt-2 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLike}
            className={`gap-1.5 ${isLiked ? 'text-destructive' : 'text-muted-foreground'}`}
          >
            <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
            <span className="text-xs">{likesCount}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowComments(!showComments)}
            className="gap-1.5 text-muted-foreground"
          >
            <MessageCircle className="w-4 h-4" />
            <span className="text-xs">{post.commentsCount || 0}</span>
          </Button>
        </div>
      </div>

      {showComments && (
        <CommentSection post={post} user={user} onRefresh={onRefresh} />
      )}
    </Card>
  );
}
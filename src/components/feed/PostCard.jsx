import React, { useState } from 'react';
import { api } from '@/api/apiClient';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Heart, MessageCircle, Pin, Trash2, MoreHorizontal, TrendingUp, TrendingDown, AlertTriangle, Pause } from 'lucide-react';
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
  const isAdmin = user?.role === 'admin';
  const isOwner = post.authorEmail === user?.email;
  const isLiked = userLikes?.some(l => l.postId === post.id);
  
  const timeAgo = post.createdAt 
    ? formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: ptBR }) 
    : '';

  const handleLike = async () => {
    if (isLiking) return;
    setIsLiking(true);
    try {
      await api.toggleLike(post.id);
      onRefresh?.();
    } catch (error) {
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
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10 border border-border">
              <AvatarImage src={post.authorAvatar} />
              <AvatarFallback className="bg-secondary text-sm">
                {post.authorName?.charAt(0)?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">{post.authorName}</span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-border">
                  {post.accessLevel === 'vip' ? '👑 VIP' : post.accessLevel}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{timeAgo}</p>
            </div>
          </div>

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
                    {post.is_pinned ? 'Desafixar' : 'Fixar'}
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

        {post.imageUrl && (
          <div className="mb-3 rounded-lg overflow-hidden border border-border">
            <img src={post.imageUrl} alt="" className="w-full max-h-96 object-cover" />
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
            <span className="text-xs">{post.likesCount || 0}</span>
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
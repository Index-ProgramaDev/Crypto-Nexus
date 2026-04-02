import React, { useState } from 'react';
import { api } from '@/api/apiClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, Loader2 } from 'lucide-react';
import { detectContactInfo, getWarningMessage } from '@/lib/moderation';
import { useToast } from '@/components/ui/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function CommentSection({ post, user, onRefresh }) {
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === 'admin';

  const { data: commentsData, isLoading } = useQuery({
    queryKey: ['comments', post.id],
    queryFn: () => api.getComments(post.id),
  });

  const comments = commentsData?.data?.comments || [];
  const topComments = comments.filter(c => !c.parentCommentId);
  const replies = comments.filter(c => c.parentCommentId);

  const submitComment = async () => {
    if (!newComment.trim()) return;

    if (!isAdmin) {
      const check = detectContactInfo(newComment);
      if (check.hasContact) {
        toast({ title: '⚠️ Conteúdo bloqueado', description: 'Contato pessoal não é permitido.', variant: 'destructive' });
        setNewComment('');
        return;
      }
    }

    try {
      await api.createComment(post.id, {
        content: newComment.trim(),
        parentCommentId: replyTo
      });

      setNewComment('');
      setReplyTo(null);
      queryClient.invalidateQueries({ queryKey: ['comments', post.id] });
      onRefresh?.();
    } catch (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <div className="border-t border-border px-4 py-3 space-y-3 bg-secondary/30">
      {isLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {topComments.map(comment => (
            <div key={comment.id}>
              <CommentItem comment={comment} onReply={() => { setReplyTo(comment.id); }} />
              {replies.filter(r => r.parent_comment_id === comment.id).map(reply => (
                <div key={reply.id} className="ml-10 mt-2">
                  <CommentItem comment={reply} isReply />
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <Avatar className="w-7 h-7 border border-border shrink-0">
          <AvatarImage src={user?.avatarUrl} />
          <AvatarFallback className="text-[10px] bg-secondary">
            {user?.fullName?.charAt(0)?.toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 flex gap-2">
          <Input
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={replyTo ? 'Responder...' : 'Comentar...'}
            className="h-8 text-sm bg-secondary/50 border-0"
            onKeyDown={(e) => e.key === 'Enter' && submitComment()}
          />
          <Button size="sm" variant="ghost" onClick={submitComment} disabled={!newComment.trim()} className="h-8 w-8 p-0">
            <Send className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
      {replyTo && (
        <button onClick={() => setReplyTo(null)} className="text-xs text-muted-foreground hover:text-foreground">
          ✕ Cancelar resposta
        </button>
      )}
    </div>
  );
}

function CommentItem({ comment, isReply, onReply }) {
  const timeAgo = comment.createdAt
    ? formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: ptBR })
    : '';

  return (
    <div className="flex gap-2">
      <Avatar className={`border border-border shrink-0 ${isReply ? 'w-6 h-6' : 'w-7 h-7'}`}>
        <AvatarImage src={comment.authorAvatar} />
        <AvatarFallback className="text-[10px] bg-secondary">
          {comment.authorName?.charAt(0)?.toUpperCase() || '?'}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <div className="bg-secondary/60 rounded-lg px-3 py-2">
          <span className="font-medium text-xs">{comment.authorName}</span>
          <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{comment.content}</p>
        </div>
        <div className="flex items-center gap-3 mt-1 px-1">
          <span className="text-[10px] text-muted-foreground">{timeAgo}</span>
          {onReply && (
            <button onClick={onReply} className="text-[10px] text-muted-foreground hover:text-primary font-medium">
              Responder
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
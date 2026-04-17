import React, { useState, useEffect, useRef } from 'react';
import { api } from '@/api/apiClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Send, X, MessageSquare, Loader2, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/components/ui/use-toast';

export default function ChatDialog({ conversationId, onClose, currentUser }) {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: conversationData, isLoading } = useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: () => api.getConversation(conversationId),
    refetchInterval: 3000 // Poll every 3 seconds for new messages
  });

  const conversation = conversationData?.data?.conversation;
  const messages = conversation?.messages || [];
  const otherParticipant = conversation?.participants?.find(
    p => p.user.id !== currentUser?.id
  )?.user;

  useEffect(() => {
    // Scroll to bottom on new messages
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!message.trim()) return;
    
    setIsSending(true);
    try {
      await api.sendMessage(conversationId, message.trim());
      setMessage('');
      queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
    } catch (error) {
      toast({ 
        title: 'Erro ao enviar', 
        description: error.message, 
        variant: 'destructive' 
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-card p-6 rounded-lg flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Carregando...</span>
        </div>
      </div>
    );
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent hideClose className="w-full max-w-2xl h-[700px] p-0 flex flex-col">
        <DialogTitle className="sr-only">Bate-papo com {otherParticipant?.profile?.fullName || otherParticipant?.username || 'Usuário'}</DialogTitle>
        <DialogDescription className="sr-only">Conversa privada iniciada pelo administrador</DialogDescription>
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div 
            className="flex items-center gap-3 cursor-pointer hover:bg-secondary/50 p-2 rounded-lg transition-colors"
            onClick={() => {
              window.location.href = `/profile?userId=${otherParticipant?.id}`;
            }}
            title="Clique para ver perfil"
          >
            <Avatar className="w-10 h-10">
              <AvatarImage src={otherParticipant?.profile?.avatarUrl} />
              <AvatarFallback>
                {otherParticipant?.profile?.fullName?.charAt(0) || otherParticipant?.username?.charAt(0) || '?'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-sm hover:underline">
                {otherParticipant?.profile?.fullName || otherParticipant?.username || 'Usuário'}
              </h3>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <MessageSquare className="w-3 h-3" /> Bate-papo
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={async () => {
                if (confirm('Deseja apagar esta conversa? Ela será removida da sua lista.')) {
                  try {
                    await api.deleteConversation(conversationId);
                    toast({ title: 'Conversa apagada com sucesso' });
                    queryClient.invalidateQueries({ queryKey: ['conversations'] });
                    onClose();
                  } catch (error) {
                    toast({ title: 'Erro ao apagar conversa', description: error.message, variant: 'destructive' });
                  }
                }
              }}
              title="Apagar conversa"
            >
              <Trash2 className="w-5 h-5 text-red-500" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Nenhuma mensagem ainda. Comece a conversa!
              </div>
            ) : (
              messages.slice().reverse().map((msg) => {
                const isMe = msg.senderId === currentUser?.id;
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-3 shadow-sm ${
                        isMe
                          ? 'bg-neon-purple text-white border border-neon-purple/50'
                          : 'bg-pink-100 dark:bg-pink-900/30 text-foreground border-2 border-pink-300 dark:border-pink-600 shadow-md'
                      }`}
                    >
                      <p className="text-sm font-medium leading-relaxed">{msg.content}</p>
                      <span className={`text-[10px] mt-1.5 block ${isMe ? 'text-white/80' : 'text-muted-foreground'}`}>
                        {msg.createdAt
                          ? formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true, locale: ptBR })
                          : ''}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="p-4 border-t border-border">
          <div className="flex gap-2">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Digite sua mensagem..."
              className="flex-1"
              disabled={isSending}
            />
            <Button 
              onClick={handleSend} 
              disabled={isSending || !message.trim()}
              size="icon"
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

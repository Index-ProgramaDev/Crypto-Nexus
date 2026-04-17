import React, { useState } from 'react';
import { api } from '@/api/apiClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Loader2, AlertTriangle, ShieldAlert, Ban, MessageSquare, 
  CheckCircle, XCircle, FileText, Search, User 
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/components/ui/use-toast';

const actionConfig = {
  warning: { icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-500/10', label: 'Aviso' },
  messageSent: { icon: MessageSquare, color: 'text-neon-blue', bg: 'bg-neon-blue/10', label: 'Mensagem' },
  blocked_30_days: { icon: ShieldAlert, color: 'text-destructive', bg: 'bg-destructive/10', label: 'Bloqueado 30d' },
  permanent_ban: { icon: Ban, color: 'text-destructive', bg: 'bg-destructive/10', label: 'Banido' },
  manual_block: { icon: Ban, color: 'text-destructive', bg: 'bg-destructive/10', label: 'Bloqueado' },
};

export default function ModerationPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('logs');
  const [searchUser, setSearchUser] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ['moderation-logs'],
    queryFn: () => api.getModerationLogs(),
  });

  const { data: postsData, isLoading: postsLoading } = useQuery({
    queryKey: ['moderation-posts', statusFilter],
    queryFn: () => api.getPosts({ status: statusFilter === 'all' ? undefined : statusFilter, limit: 50 }),
    enabled: activeTab === 'posts',
  });

  const logs = logsData?.data?.logs || [];
  const posts = postsData?.data?.posts || [];

  const filteredPosts = posts.filter(post => {
    if (!searchUser) return true;
    const searchLower = searchUser.toLowerCase();
    return (
      post.author?.profile?.fullName?.toLowerCase().includes(searchLower) ||
      post.author?.email?.toLowerCase().includes(searchLower) ||
      post.author?.username?.toLowerCase().includes(searchLower)
    );
  });

  const handleApprovePost = async (postId) => {
    try {
      await api.updatePost(postId, { status: 'active' });
      queryClient.invalidateQueries({ queryKey: ['moderation-posts'] });
      toast({ title: 'Post aprovado!' });
    } catch (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  const handleRejectPost = async (postId) => {
    try {
      await api.deletePost(postId);
      queryClient.invalidateQueries({ queryKey: ['moderation-posts'] });
      toast({ title: 'Post removido!' });
    } catch (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  const isLoading = logsLoading || postsLoading;

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-secondary w-full">
          <TabsTrigger value="logs" className="gap-1.5 text-xs">
            <ShieldAlert className="w-3.5 h-3.5" /> Logs de Moderação
          </TabsTrigger>
          <TabsTrigger value="posts" className="gap-1.5 text-xs">
            <FileText className="w-3.5 h-3.5" /> Revisão de Conteúdo
          </TabsTrigger>
        </TabsList>

        <TabsContent value="logs" className="mt-4">
          {logsLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-sm">Nenhum registro de moderação.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map(log => {
                const config = actionConfig[log.actionTaken] || actionConfig.warning;
                const Icon = config.icon;
                const timeAgo = log.createdAt
                  ? formatDistanceToNow(new Date(log.createdAt), { addSuffix: true, locale: ptBR })
                  : '';
                return (
                  <Card key={log.id} className="p-4 border-border">
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-lg ${config.bg} flex items-center justify-center shrink-0`}>
                        <Icon className={`w-4 h-4 ${config.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{log.userName || log.userEmail}</span>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">{config.label}</Badge>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">{log.violationType}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{log.contentBlocked}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-muted-foreground/60">{timeAgo}</span>
                          <span className="text-[10px] text-muted-foreground/60">• Tentativa #{log.attemptNumber}</span>
                          <span className="text-[10px] text-muted-foreground/60">• {log.context}</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="posts" className="mt-4 space-y-4">
          {/* Filters */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                value={searchUser} 
                onChange={(e) => setSearchUser(e.target.value)} 
                placeholder="Buscar por usuário..." 
                className="pl-9" 
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            >
              <option value="all">Todos</option>
              <option value="active">Aprovados</option>
              <option value="suspended">Suspensos</option>
              <option value="deleted">Removidos</option>
            </select>
          </div>

          {postsLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
          ) : filteredPosts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-sm">Nenhum post encontrado.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredPosts.map(post => {
                const timeAgo = post.createdAt
                  ? formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: ptBR })
                  : '';
                const statusConfig = {
                  active: { color: 'bg-primary/10 text-primary', label: 'Ativo' },
                  suspended: { color: 'bg-yellow-500/10 text-yellow-500', label: 'Suspenso' },
                  deleted: { color: 'bg-destructive/10 text-destructive', label: 'Removido' },
                };
                const status = statusConfig[post.status] || statusConfig.active;

                return (
                  <Card key={post.id} className="p-4 border-border">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{post.author?.profile?.fullName || post.author?.username}</span>
                          <Badge className={`text-[10px] px-1.5 py-0 h-4 ${status.color}`}>{status.label}</Badge>
                          {post.isSignal && <Badge className="bg-neon-purple/10 text-neon-purple text-[10px] px-1.5 py-0 h-4">Sinal</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-3">{post.content}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[10px] text-muted-foreground/60">{timeAgo}</span>
                          <span className="text-[10px] text-muted-foreground/60">• {post.likesCount || 0} curtidas</span>
                          <span className="text-[10px] text-muted-foreground/60">• {post.commentsCount || 0} comentários</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {post.status !== 'active' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-primary"
                            onClick={() => handleApprovePost(post.id)}
                            title="Aprovar"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                        )}
                        {post.status !== 'deleted' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => handleRejectPost(post.id)}
                            title="Remover"
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
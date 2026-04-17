import React, { useState } from 'react';
import { api } from '@/api/apiClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  User, Mail, Calendar, Shield, Crown, Ban, MapPin, Globe, 
  FileText, Heart, MessageSquare, Loader2, X, Save, Lock 
} from 'lucide-react';
import { getRoleBadge } from '@/lib/moderation';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/lib/AuthContext';
import ChatDialog from '@/components/chat/ChatDialog';

export default function UserDetailDialog({ userId, open, onClose }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editedUser, setEditedUser] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [conversationId, setConversationId] = useState(null);

  const isAdmin = currentUser?.role === 'admin';

  const { data: userData, isLoading } = useQuery({
    queryKey: ['admin-user-detail', userId],
    queryFn: () => api.getUser(userId),
    enabled: !!userId && open,
  });

  const { data: userPosts } = useQuery({
    queryKey: ['admin-user-posts', userId],
    queryFn: () => api.getPosts({ authorEmail: userData?.data?.user?.email, limit: 10 }),
    enabled: !!userData?.data?.user?.email && open,
  });

  const user = userData?.data?.user;
  const posts = userPosts?.data?.posts || [];

  React.useEffect(() => {
    if (user) {
      setEditedUser({
        role: user.role,
        vipAccess: user.vipAccess,
        isBlocked: user.isBlocked,
        violationCount: user.violationCount || 0,
      });
    }
  }, [user]);

  const handleUpdateUser = async () => {
    try {
      await api.updateUser(userId, editedUser);
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-user-detail', userId] });
      toast({ title: 'Usuário atualizado!' });
      setIsEditing(false);
    } catch (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  const handleStartChat = async () => {
    try {
      const response = await api.adminStartConversation(userId);
      setConversationId(response.data.conversation.id);
      setChatOpen(true);
    } catch (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  if (isLoading || !user) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const badge = getRoleBadge(user.role, user.vipAccess);
  const timeAgo = user.createdAt
    ? formatDistanceToNow(new Date(user.createdAt), { addSuffix: true, locale: ptBR })
    : '';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Detalhes do Usuário</span>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-start gap-4">
            <Avatar className="w-20 h-20 border-2 border-border">
              <AvatarImage src={user.profile?.avatarUrl} />
              <AvatarFallback className="bg-secondary text-2xl font-bold">
                {user.profile?.fullName?.charAt(0)?.toUpperCase() || user.username?.charAt(0)?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold">{user.profile?.fullName || user.username || 'Sem nome'}</h2>
                <Badge variant="outline" className="text-xs">{badge.label}</Badge>
                {user.isBlocked && <Badge variant="destructive" className="text-xs">Bloqueado</Badge>}
                {user.vipAccess && <Badge className="bg-neon-purple/10 text-neon-purple text-xs">👑 VIP</Badge>}
                {user.profile?.isPrivate && <Badge className="text-xs"><Lock className="w-3 h-3 mr-1" /> Privado</Badge>}
              </div>
              <p className="text-sm text-muted-foreground mt-1">@{user.username}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <p className="text-xs text-muted-foreground mt-1">Membro {timeAgo}</p>
            </div>
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleStartChat}
                className="shrink-0"
              >
                <MessageSquare className="w-4 h-4 mr-1.5" /> Conversar
              </Button>
            )}
          </div>

          <Tabs defaultValue="info">
            <TabsList className="bg-secondary w-full">
              <TabsTrigger value="info" className="gap-1.5 text-xs">
                <User className="w-3.5 h-3.5" /> Informações
              </TabsTrigger>
              <TabsTrigger value="posts" className="gap-1.5 text-xs">
                <FileText className="w-3.5 h-3.5" /> Posts ({posts.length})
              </TabsTrigger>
              <TabsTrigger value="admin" className="gap-1.5 text-xs">
                <Shield className="w-3.5 h-3.5" /> Admin
              </TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card className="p-4 border-border">
                  <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" /> Perfil
                  </h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-muted-foreground">Nome:</span> {user.profile?.fullName || '-'}</p>
                    <p><span className="text-muted-foreground">Bio:</span> {user.profile?.bio || '-'}</p>
                    <p className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                      {user.profile?.location || 'Não informado'}
                    </p>
                    <p className="flex items-center gap-1">
                      <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                      {user.profile?.website ? (
                        <a href={user.profile.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          {user.profile.website}
                        </a>
                      ) : 'Não informado'}
                    </p>
                    {user.profile?.birthDate && (
                      <p className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                        {new Date(user.profile.birthDate).toLocaleDateString('pt-BR')}
                      </p>
                    )}
                  </div>
                </Card>

                <Card className="p-4 border-border">
                  <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-muted-foreground" /> Conta
                  </h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-muted-foreground">ID:</span> <span className="font-mono text-xs">{user.id}</span></p>
                    <p><span className="text-muted-foreground">Email:</span> {user.email}</p>
                    <p><span className="text-muted-foreground">Username:</span> @{user.username}</p>
                    <p><span className="text-muted-foreground">Função:</span> {user.role}</p>
                    <p><span className="text-muted-foreground">Email verificado:</span> {user.emailVerified ? 'Sim' : 'Não'}</p>
                    <p><span className="text-muted-foreground">Criado em:</span> {new Date(user.createdAt).toLocaleString('pt-BR')}</p>
                    {user.blockedUntil && (
                      <p className="text-destructive">
                        <span className="text-muted-foreground">Bloqueado até:</span> {new Date(user.blockedUntil).toLocaleString('pt-BR')}
                      </p>
                    )}
                  </div>
                </Card>
              </div>

              <Card className="p-4 border-border">
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground" /> Estatísticas
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold">{user.profile?.postsCount || 0}</p>
                    <p className="text-xs text-muted-foreground">Posts</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">{user.profile?.followersCount || 0}</p>
                    <p className="text-xs text-muted-foreground">Seguidores</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">{user.profile?.followingCount || 0}</p>
                    <p className="text-xs text-muted-foreground">Seguindo</p>
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="posts" className="mt-4">
              {posts.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Nenhum post encontrado</p>
              ) : (
                <div className="space-y-3">
                  {posts.map(post => (
                    <Card key={post.id} className="p-3 border-border">
                      <p className="text-sm line-clamp-2">{post.content}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5" /> {post.likesCount || 0}</span>
                        <span className="flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" /> {post.commentsCount || 0}</span>
                        <span>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: ptBR })}</span>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="admin" className="space-y-4 mt-4">
              <Card className="p-4 border-border">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Shield className="w-4 h-4" /> Gerenciamento
                  </h3>
                  <Button
                    variant={isEditing ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => setIsEditing(!isEditing)}
                  >
                    {isEditing ? 'Cancelar' : 'Editar'}
                  </Button>
                </div>

                {isEditing ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-1 block">Função</label>
                        <Select 
                          value={editedUser?.role} 
                          onValueChange={(val) => setEditedUser({ ...editedUser, role: val })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">Público</SelectItem>
                            <SelectItem value="mentored">Mentorado</SelectItem>
                            <SelectItem value="advanced">Avançado</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">Violações</label>
                        <Input 
                          type="number" 
                          value={editedUser?.violationCount} 
                          onChange={(e) => setEditedUser({ ...editedUser, violationCount: parseInt(e.target.value) || 0 })}
                          min={0}
                        />
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2">
                        <input 
                          type="checkbox" 
                          checked={editedUser?.vipAccess} 
                          onChange={(e) => setEditedUser({ ...editedUser, vipAccess: e.target.checked })}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">Acesso VIP</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input 
                          type="checkbox" 
                          checked={editedUser?.isBlocked} 
                          onChange={(e) => setEditedUser({ ...editedUser, isBlocked: e.target.checked })}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">Bloqueado</span>
                      </label>
                    </div>
                    <Button onClick={handleUpdateUser} className="w-full">
                      <Save className="w-4 h-4 mr-1.5" /> Salvar Alterações
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2 text-sm">
                    <p><span className="text-muted-foreground">Função:</span> <Badge variant="outline">{user.role}</Badge></p>
                    <p><span className="text-muted-foreground">VIP:</span> {user.vipAccess ? <Badge className="bg-neon-purple/10 text-neon-purple">Sim</Badge> : 'Não'}</p>
                    <p><span className="text-muted-foreground">Bloqueado:</span> {user.isBlocked ? <Badge variant="destructive">Sim</Badge> : 'Não'}</p>
                    <p><span className="text-muted-foreground">Violações:</span> {user.violationCount || 0}</p>
                  </div>
                )}
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>

      {/* Chat Dialog */}
      {chatOpen && conversationId && (
        <ChatDialog
          conversationId={conversationId}
          currentUser={currentUser}
          onClose={() => setChatOpen(false)}
        />
      )}
    </Dialog>
  );
}

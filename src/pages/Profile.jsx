import React, { useState, useEffect } from 'react';
import { api } from '@/api/apiClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Camera, Save, Loader2 } from 'lucide-react';
import { getRoleBadge, detectContactInfo } from '@/lib/moderation';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/lib/AuthContext';
import PostList from '@/components/feed/PostList';

export default function Profile() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user: authUser, updateUser } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [bio, setBio] = useState('');
  const [phone, setPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const badge = getRoleBadge(authUser?.role, authUser?.vipAccess);

  useEffect(() => {
    if (authUser) {
      setBio(authUser.bio || '');
      setPhone(authUser.phone || '');
    }
  }, [authUser]);

  const { data: postsData, isLoading } = useQuery({
    queryKey: ['posts', 'user', authUser?.email],
    queryFn: () => api.getPosts({ authorEmail: authUser?.email, status: 'active', limit: 20 }),
    enabled: !!authUser?.email,
  });

  const { data: likesData } = useQuery({
    queryKey: ['likes', authUser?.email],
    queryFn: () => api.getUserLikes(),
    enabled: !!authUser?.email,
  });

  const userPosts = postsData?.data?.posts || [];
  const userLikes = likesData?.data?.likes || [];

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    // TODO: Implement file upload
    toast({ title: 'Upload de imagem não implementado ainda' });
  };

  const handleSave = async () => {
    if (authUser?.role !== 'admin') {
      const check = detectContactInfo(bio);
      if (check.hasContact) {
        toast({ title: '⚠️ Bio bloqueada', description: 'Não é permitido incluir informações de contato na bio.', variant: 'destructive' });
        return;
      }
    }
    setIsSaving(true);
    try {
      await updateUser({ bio, phone });
      setIsEditing(false);
      toast({ title: 'Perfil atualizado!' });
    } catch (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['posts', 'user'] });
    queryClient.invalidateQueries({ queryKey: ['likes'] });
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <Card className="p-6 border-border">
        <div className="flex flex-col sm:flex-row items-center gap-5">
          <div className="relative">
            <Avatar className="w-20 h-20 border-2 border-border">
              <AvatarImage src={authUser?.avatarUrl} />
              <AvatarFallback className="bg-secondary text-2xl font-bold">
                {authUser?.fullName?.charAt(0)?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
            <label className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-primary flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors">
              <Camera className="w-3.5 h-3.5 text-primary-foreground" />
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            </label>
          </div>

          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-xl font-bold">{authUser?.fullName}</h1>
            <p className="text-sm text-muted-foreground">{authUser?.email}</p>
            <div className="flex items-center gap-2 mt-2 justify-center sm:justify-start">
              <Badge className={`${badge.color} bg-secondary border-border`}>{badge.label}</Badge>
              {authUser?.vipAccess && <Badge className="bg-neon-purple/10 text-neon-purple border-neon-purple/20">👑 VIP</Badge>}
            </div>
          </div>

          <Button variant="outline" onClick={() => setIsEditing(!isEditing)} size="sm">
            {isEditing ? 'Cancelar' : 'Editar'}
          </Button>
        </div>

        {isEditing && (
          <div className="mt-6 space-y-4 pt-4 border-t border-border">
            <div>
              <label className="text-sm font-medium mb-1 block">Telefone</label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Seu telefone" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Bio</label>
              <Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Conte sobre você..." className="h-24" />
            </div>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Save className="w-4 h-4 mr-1.5" />}
              Salvar
            </Button>
          </div>
        )}

        {!isEditing && authUser?.bio && (
          <p className="mt-4 pt-4 border-t border-border text-sm text-muted-foreground">{authUser.bio}</p>
        )}
      </Card>

      <div>
        <h2 className="text-lg font-semibold mb-4">Suas Publicações</h2>
        <PostList posts={userPosts} user={authUser} userLikes={userLikes} isLoading={isLoading} onRefresh={refresh} />
      </div>
    </div>
  );
}
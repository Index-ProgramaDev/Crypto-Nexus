import React, { useState } from 'react';
import { api } from '@/api/apiClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Shield, Crown, Ban, Unlock, Loader2, UserPlus } from 'lucide-react';
import { getRoleBadge } from '@/lib/moderation';
import { useToast } from '@/components/ui/use-toast';

export default function UserManagement() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('user');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.getUsers({ limit: 200 }),
  });

  const users = usersData?.data?.users || [];

  const filtered = users.filter(u => {
    const matchSearch = !search || u.fullName?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const updateUser = async (userId, data) => {
    try {
      await api.updateUser(userId, data);
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast({ title: 'Usuário atualizado!' });
    } catch (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail) return;
    try {
      await api.inviteUser({ email: inviteEmail, role: inviteRole });
      toast({ title: 'Convite enviado!', description: `Convite enviado para ${inviteEmail}` });
      setInviteEmail('');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    } catch (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 border-border">
        <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
          <UserPlus className="w-4 h-4" /> Convidar Usuário
        </h3>
        <div className="flex gap-2">
          <Input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="Email do usuário" className="flex-1" />
          <Select value={inviteRole} onValueChange={setInviteRole}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="user">Usuário</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleInvite} size="sm">Convidar</Button>
        </div>
      </Card>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar usuários..." className="pl-9" />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Nível" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="user">Público</SelectItem>
            <SelectItem value="mentored">Mentorado</SelectItem>
            <SelectItem value="advanced">Avançado</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
      ) : (
        <div className="space-y-2">
          {filtered.map(u => {
            const badge = getRoleBadge(u.role, u.vipAccess);
            return (
              <Card key={u.id} className="p-4 border-border">
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10 border border-border">
                    <AvatarImage src={u.avatarUrl} />
                    <AvatarFallback className="bg-secondary text-sm">{u.fullName?.charAt(0)?.toUpperCase() || '?'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{u.fullName || 'Sem nome'}</span>
                      <Badge variant="outline" className="text-[10px] shrink-0">{badge.label}</Badge>
                      {u.isBlocked && <Badge variant="destructive" className="text-[10px]">Bloqueado</Badge>}
                      {u.vipAccess && <Badge className="bg-neon-purple/10 text-neon-purple text-[10px]">VIP</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    {u.violationCount > 0 && <p className="text-[10px] text-destructive">Violações: {u.violationCount}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Select value={u.role || 'user'} onValueChange={(val) => updateUser(u.id, { role: val })}>
                      <SelectTrigger className="w-28 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">Público</SelectItem>
                        <SelectItem value="mentored">Mentorado</SelectItem>
                        <SelectItem value="advanced">Avançado</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => updateUser(u.id, { vipAccess: !u.vipAccess })}
                      title="Toggle VIP"
                    >
                      <Crown className={`w-4 h-4 ${u.vipAccess ? 'text-neon-purple' : 'text-muted-foreground'}`} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => updateUser(u.id, { isBlocked: !u.isBlocked })}
                      title={u.isBlocked ? 'Desbloquear' : 'Bloquear'}
                    >
                      {u.isBlocked ? <Unlock className="w-4 h-4 text-primary" /> : <Ban className="w-4 h-4 text-destructive" />}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
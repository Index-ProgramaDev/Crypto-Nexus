import React, { useState } from 'react';
import { Menu, Bell, X, Info, AlertTriangle, Signal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getRoleBadge } from '@/lib/moderation';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const typeConfig = {
  info: { icon: Info, color: 'text-neon-blue', bg: 'bg-neon-blue/10', label: 'Info' },
  warning: { icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-500/10', label: 'Aviso' },
  urgent: { icon: Bell, color: 'text-destructive', bg: 'bg-destructive/10', label: 'Urgente' },
  signal: { icon: Signal, color: 'text-neon-purple', bg: 'bg-neon-purple/10', label: 'Sinal' },
};

export default function TopBar({ user, onMenuToggle, unreadAlerts }) {
  const badge = getRoleBadge(user?.role, user?.vip_access);
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: alertsData } = useQuery({
    queryKey: ['alerts', 'topbar'],
    queryFn: () => api.getAlerts(),
    enabled: !!user && open,
  });

  const alerts = alertsData?.data?.alerts?.slice(0, 5) || [];

  const handleMarkAllRead = async () => {
    await api.markAllAlertsRead();
    queryClient.invalidateQueries({ queryKey: ['alerts'] });
    queryClient.invalidateQueries({ queryKey: ['unread-alerts-count'] });
  };

  return (
    <header className="sticky top-0 z-30 h-14 border-b border-border bg-card/80 backdrop-blur-xl flex items-center px-4 gap-3">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuToggle}>
        <Menu className="w-5 h-5" />
      </Button>

      <div className="flex-1" />

      <div className="flex items-center gap-3">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <div className="relative">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className={`w-4 h-4 ${unreadAlerts > 0 ? 'text-yellow-500 fill-yellow-500' : ''}`} />
                {unreadAlerts > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-destructive text-[10px] font-bold flex items-center justify-center text-destructive-foreground">
                    {unreadAlerts > 9 ? '9+' : unreadAlerts}
                  </span>
                )}
              </Button>
            </div>
          </SheetTrigger>
          <SheetContent side="right" className="w-80 sm:w-96">
            <SheetHeader>
              <SheetTitle className="flex items-center justify-between">
                <span>Notificações</span>
                {unreadAlerts > 0 && (
                  <Button variant="ghost" size="sm" onClick={handleMarkAllRead}>
                    Marcar todas como lidas
                  </Button>
                )}
              </SheetTitle>
            </SheetHeader>
            <div className="mt-4 space-y-3">
              {alerts.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-8">Nenhuma notificação</p>
              ) : (
                alerts.map(alert => {
                  const config = typeConfig[alert.type] || typeConfig.info;
                  const Icon = config.icon;
                  const timeAgo = alert.createdAt
                    ? formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true, locale: ptBR })
                    : '';
                  return (
                    <Card key={alert.id} className={`p-3 border-border ${alert.isRead ? 'opacity-60' : ''}`}>
                      <div className="flex gap-3">
                        <div className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center shrink-0`}>
                          <Icon className={`w-4 h-4 ${config.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-sm">{alert.title}</h4>
                            <Badge variant="outline" className="text-[10px] px-1 py-0 h-3">{config.label}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">{alert.message}</p>
                          <p className="text-[10px] text-muted-foreground/60 mt-1">{timeAgo}</p>
                        </div>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          </SheetContent>
        </Sheet>

        <div className="flex items-center gap-2">
          <Avatar className="w-8 h-8 border border-border">
            <AvatarImage src={user?.avatarUrl} />
            <AvatarFallback className="bg-secondary text-xs font-semibold">
              {user?.fullName?.charAt(0)?.toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>
          <div className="hidden sm:block">
            <p className="text-sm font-medium leading-none">{user?.fullName || user?.username || 'Usuário'}</p>
            <p className={`text-[10px] font-semibold ${badge.color}`}>{badge.label}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
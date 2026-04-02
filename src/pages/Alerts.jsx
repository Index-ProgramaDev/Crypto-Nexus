import React from 'react';
import { api } from '@/api/apiClient';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, AlertTriangle, Info, Signal, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const typeConfig = {
  info: { icon: Info, color: 'text-neon-blue', bg: 'bg-neon-blue/10', label: 'Info' },
  warning: { icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-500/10', label: 'Aviso' },
  urgent: { icon: Bell, color: 'text-destructive', bg: 'bg-destructive/10', label: 'Urgente' },
  signal: { icon: Signal, color: 'text-neon-purple', bg: 'bg-neon-purple/10', label: 'Sinal' },
};

export default function Alerts() {
  const { user } = useAuth();

  const { data: alertsData, isLoading } = useQuery({
    queryKey: ['alerts', user?.email],
    queryFn: () => api.getAlerts(),
    enabled: !!user,
  });

  const alerts = alertsData?.data?.alerts || [];

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-neon-blue/10 flex items-center justify-center">
          <Bell className="w-5 h-5 text-neon-blue" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Central de Alertas</h1>
          <p className="text-sm text-muted-foreground">Avisos importantes e notificações</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : alerts.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground text-sm">Nenhum alerta no momento.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map(alert => {
            const config = typeConfig[alert.type] || typeConfig.info;
            const Icon = config.icon;
            const timeAgo = alert.createdAt
              ? formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true, locale: ptBR })
              : '';
            return (
              <Card key={alert.id} className="p-4 border-border hover:border-border/80 transition-colors">
                <div className="flex gap-3">
                  <div className={`w-10 h-10 rounded-lg ${config.bg} flex items-center justify-center shrink-0`}>
                    <Icon className={`w-5 h-5 ${config.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-sm">{alert.title}</h3>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">{config.label}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{alert.message}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-2">{timeAgo}</p>
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
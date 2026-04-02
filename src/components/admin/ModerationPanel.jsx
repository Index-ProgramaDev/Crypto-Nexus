import React from 'react';
import { api } from '@/api/apiClient';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle, ShieldAlert, Ban, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const actionConfig = {
  warning: { icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-500/10', label: 'Aviso' },
  messageSent: { icon: MessageSquare, color: 'text-neon-blue', bg: 'bg-neon-blue/10', label: 'Mensagem' },
  blocked30Days: { icon: ShieldAlert, color: 'text-destructive', bg: 'bg-destructive/10', label: 'Bloqueado 30d' },
  permanentBan: { icon: Ban, color: 'text-destructive', bg: 'bg-destructive/10', label: 'Banido' },
};

export default function ModerationPanel() {
  const { data: logsData, isLoading } = useQuery({
    queryKey: ['moderation-logs'],
    queryFn: () => api.getModerationLogs(),
  });

  const logs = logsData?.data?.logs || [];

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground text-sm">Nenhum registro de moderação.</p>
      </div>
    );
  }

  return (
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
  );
}
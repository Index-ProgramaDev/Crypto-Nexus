import React from 'react';
import { api } from '@/api/apiClient';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Users, MessageSquare, Shield, Crown, Loader2 } from 'lucide-react';

export default function StatsOverview() {
  const { data: statsData } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => api.getStats(),
  });

  const stats = statsData?.data || {};

  const statCards = [
    {
      label: 'Usuários',
      value: stats.totalUsers || 0,
      icon: Users,
      color: 'text-primary',
      bg: 'bg-primary/10',
      sub: `${stats.usersByRole?.mentored || 0} mentorados`,
    },
    {
      label: 'Publicações',
      value: stats.totalPosts || 0,
      icon: MessageSquare,
      color: 'text-neon-blue',
      bg: 'bg-neon-blue/10',
      sub: `${stats.totalSignals || 0} sinais`,
    },
    {
      label: 'VIP',
      value: stats.totalVipUsers || 0,
      icon: Crown,
      color: 'text-neon-purple',
      bg: 'bg-neon-purple/10',
      sub: 'membros ativos',
    },
    {
      label: 'Moderação',
      value: stats.totalModerationLogs || 0,
      icon: Shield,
      color: 'text-destructive',
      bg: 'bg-destructive/10',
      sub: `${stats.blockedUsers || 0} bloqueados`,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {statCards.map(stat => (
        <Card key={stat.label} className="p-4 border-border">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center shrink-0`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="text-[10px] text-muted-foreground/60">{stat.sub}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
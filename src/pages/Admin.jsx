import React from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Users, AlertTriangle, Bell, BarChart3 } from 'lucide-react';
import StatsOverview from '@/components/admin/StatsOverview';
import UserManagement from '@/components/admin/UserManagement';
import ModerationPanel from '@/components/admin/ModerationPanel';
import SendAlert from '@/components/admin/SendAlert';

export default function Admin() {
  const { user } = useAuth();

  if (user?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <Shield className="w-12 h-12 text-destructive mb-4" />
        <h2 className="text-xl font-bold mb-2">Acesso Restrito</h2>
        <p className="text-muted-foreground text-sm">Apenas administradores podem acessar esta área.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
          <Shield className="w-5 h-5 text-destructive" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Painel Administrativo</h1>
          <p className="text-sm text-muted-foreground">Gerencie usuários, conteúdo e alertas</p>
        </div>
      </div>

      <StatsOverview />

      <Tabs defaultValue="users">
        <TabsList className="bg-secondary">
          <TabsTrigger value="users" className="gap-1.5 text-xs">
            <Users className="w-3.5 h-3.5" /> Usuários
          </TabsTrigger>
          <TabsTrigger value="moderation" className="gap-1.5 text-xs">
            <AlertTriangle className="w-3.5 h-3.5" /> Moderação
          </TabsTrigger>
          <TabsTrigger value="alerts" className="gap-1.5 text-xs">
            <Bell className="w-3.5 h-3.5" /> Alertas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-4">
          <UserManagement />
        </TabsContent>

        <TabsContent value="moderation" className="mt-4">
          <ModerationPanel />
        </TabsContent>

        <TabsContent value="alerts" className="mt-4">
          <SendAlert />
        </TabsContent>
      </Tabs>
    </div>
  );
}
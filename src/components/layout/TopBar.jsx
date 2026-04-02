import React from 'react';
import { Menu, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getRoleBadge } from '@/lib/moderation';

export default function TopBar({ user, onMenuToggle, unreadAlerts }) {
  const badge = getRoleBadge(user?.role, user?.vip_access);

  return (
    <header className="sticky top-0 z-30 h-14 border-b border-border bg-card/80 backdrop-blur-xl flex items-center px-4 gap-3">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuToggle}>
        <Menu className="w-5 h-5" />
      </Button>

      <div className="flex-1" />

      <div className="flex items-center gap-3">
        <div className="relative">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="w-4 h-4" />
            {unreadAlerts > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-destructive text-[10px] font-bold flex items-center justify-center text-destructive-foreground">
                {unreadAlerts > 9 ? '9+' : unreadAlerts}
              </span>
            )}
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Avatar className="w-8 h-8 border border-border">
            <AvatarImage src={user?.avatar_url} />
            <AvatarFallback className="bg-secondary text-xs font-semibold">
              {user?.full_name?.charAt(0)?.toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>
          <div className="hidden sm:block">
            <p className="text-sm font-medium leading-none">{user?.full_name || 'Usuário'}</p>
            <p className={`text-[10px] font-semibold ${badge.color}`}>{badge.label}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
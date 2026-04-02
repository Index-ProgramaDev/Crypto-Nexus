import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home, MessageSquare, Signal, User, Shield, Bell,
  HelpCircle, LogOut, Crown, X, TrendingUp, Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/AuthContext';

const navItems = [
  { path: '/', label: 'Feed', icon: Home, level: 'all' },
  { path: '/mentored', label: 'Mentorados', icon: Users, level: 'mentored' },
  { path: '/advanced', label: 'Avançado', icon: TrendingUp, level: 'advanced' },
  { path: '/vip', label: 'Sala VIP', icon: Crown, level: 'vip' },
  { path: '/alerts', label: 'Alertas', icon: Bell, level: 'all' },
  { path: '/profile', label: 'Perfil', icon: User, level: 'all' },
  { path: '/support', label: 'Suporte', icon: HelpCircle, level: 'all' },
];

const adminItems = [
  { path: '/admin', label: 'Painel Admin', icon: Shield },
];

export default function Sidebar({ user, isOpen, onClose }) {
  const location = useLocation();
  const { logout } = useAuth();
  const isAdmin = user?.role === 'admin';

  const canAccess = (level) => {
    if (level === 'all') return true;
    if (isAdmin) return true;
    if (level === 'vip') return user?.vip_access;
    const roleOrder = { user: 0, mentored: 1, advanced: 2, admin: 3 };
    const levelOrder = { mentored: 1, advanced: 2, vip: 3 };
    return (roleOrder[user?.role] || 0) >= (levelOrder[level] || 0);
  };

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={onClose} />
      )}
      <aside className={`
        fixed top-0 left-0 h-full w-64 bg-card border-r border-border z-50
        transform transition-transform duration-300 ease-out
        lg:translate-x-0 lg:static lg:z-auto
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-5 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                <Signal className="w-4 h-4 text-primary" />
              </div>
              <span className="font-bold text-lg tracking-tight">CryptoHub</span>
            </div>
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {navItems.map(item => {
              const accessible = canAccess(item.level);
              const active = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={accessible ? item.path : '#'}
                  onClick={onClose}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                    transition-all duration-200
                    ${active
                      ? 'bg-primary/10 text-primary'
                      : accessible
                        ? 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                        : 'text-muted-foreground/40 cursor-not-allowed'
                    }
                  `}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                  {item.level === 'vip' && (
                    <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded bg-neon-purple/20 text-neon-purple">
                      VIP
                    </span>
                  )}
                  {!accessible && (
                    <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                      🔒
                    </span>
                  )}
                </Link>
              );
            })}

            {isAdmin && (
              <>
                <div className="pt-4 pb-2 px-3">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Administração
                  </p>
                </div>
                {adminItems.map(item => {
                  const active = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={onClose}
                      className={`
                        flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                        transition-all duration-200
                        ${active
                          ? 'bg-destructive/10 text-destructive'
                          : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                        }
                      `}
                    >
                      <item.icon className="w-4 h-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </>
            )}
          </nav>

          <div className="p-3 border-t border-border">
            <button
              onClick={() => useAuth().logout()}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all w-full"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
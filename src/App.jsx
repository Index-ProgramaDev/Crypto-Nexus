import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import BlockedAccount from '@/components/auth/BlockedAccount';

import AppLayout from '@/components/layout/AppLayout';
import Feed from '@/pages/Feed';
import MentoredArea from '@/pages/MentoredArea';
import AdvancedArea from '@/pages/AdvancedArea';
import VipRoom from '@/pages/VipRoom';
import Alerts from '@/pages/Alerts';
import Profile from '@/pages/Profile';
import Support from '@/pages/Support';
import Admin from '@/pages/Admin';
import Login from '@/pages/Login';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isAuthenticated, user, isBlocked, blockedInfo } = useAuth();

  const { data: unreadAlertsData } = useQuery({
    queryKey: ['unread-alerts-count', user?.email],
    queryFn: () => api.getUnreadCount(),
    enabled: !!user,
  });

  const unreadCount = unreadAlertsData?.data?.count || 0;

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm text-muted-foreground">Carregando...</span>
        </div>
      </div>
    );
  }

  // Show blocked account dialog when user is blocked
  if (isBlocked) {
    return <BlockedAccount blockedInfo={blockedInfo} onClose={() => window.location.href = '/login'} />;
  }

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route element={<AppLayout user={user} unreadAlerts={unreadCount} />}>
        <Route path="/" element={<Feed />} />
        <Route path="/mentored" element={<MentoredArea />} />
        <Route path="/advanced" element={<AdvancedArea />} />
        <Route path="/vip" element={<VipRoom />} />
        <Route path="/alerts" element={<Alerts />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/support" element={<Support />} />
        <Route path="/admin" element={<Admin />} />
      </Route>
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
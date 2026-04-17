import React, { createContext, useState, useContext, useEffect } from 'react';
import { api } from '@/api/apiClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockedInfo, setBlockedInfo] = useState(null);

  useEffect(() => {
    checkUserAuth();
  }, []);

  const checkUserAuth = async () => {
    try {
      setIsLoadingAuth(true);
      setAuthError(null);

      const token = api.getToken();
      if (!token) {
        setIsLoadingAuth(false);
        setIsAuthenticated(false);
        return;
      }

      const response = await api.getMe();
      if (response.data?.user) {
        const userData = response.data.user;
        
        // Check if user is blocked
        if (userData.isBlocked) {
          setIsBlocked(true);
          setBlockedInfo({
            blockedUntil: userData.blockedUntil,
            reason: userData.blockReason || 'Violação dos termos de uso'
          });
          setUser(null);
          setIsAuthenticated(false);
          api.setToken(null);
          setIsLoadingAuth(false);
          return;
        }
        
        setUser(userData);
        setIsAuthenticated(true);
        setIsBlocked(false);
        setBlockedInfo(null);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      
      if (error.statusCode === 401 || error.code === 'user_not_registered') {
        api.setToken(null);
        setAuthError({
          type: error.code || 'auth_required',
          message: error.message || 'Authentication required'
        });
      }
      
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const login = async (email, password) => {
    try {
      setAuthError(null);
      const response = await api.login(email, password);
      
      if (response.data?.user) {
        const userData = response.data.user;
        
        // Check if user is blocked on login
        if (userData.isBlocked) {
          setIsBlocked(true);
          setBlockedInfo({
            blockedUntil: userData.blockedUntil,
            reason: userData.blockReason || 'Violação dos termos de uso'
          });
          api.setToken(null);
          return { 
            success: false, 
            blocked: true, 
            error: 'Conta bloqueada',
            blockedInfo: {
              blockedUntil: userData.blockedUntil,
              reason: userData.blockReason || 'Violação dos termos de uso'
            }
          };
        }
        
        setUser(userData);
        setIsAuthenticated(true);
        setIsBlocked(false);
        setBlockedInfo(null);
        return { success: true, user: userData };
      }
    } catch (error) {
      console.error('Login failed:', error);
      setAuthError({
        type: 'login_failed',
        message: error.message || 'Login failed'
      });
      return { success: false, error: error.message };
    }
  };

  const register = async (userData) => {
    try {
      setAuthError(null);
      const response = await api.register(userData);
      
      if (response.data?.user) {
        setUser(response.data.user);
        setIsAuthenticated(true);
        return { success: true, user: response.data.user };
      }
    } catch (error) {
      console.error('Registration failed:', error);
      setAuthError({
        type: 'register_failed',
        message: error.message || 'Registration failed'
      });
      return { success: false, error: error.message };
    }
  };

  const logout = (shouldRedirect = true) => {
    api.logout();
    setUser(null);
    setIsAuthenticated(false);
    setAuthError(null);
    
    if (shouldRedirect) {
      window.location.href = '/login';
    }
  };

  const navigateToLogin = () => {
    window.location.href = '/login';
  };

  const checkAppState = async () => {
    await checkUserAuth();
  };

  const updateUser = async (userData) => {
    try {
      const response = await api.updateProfile(userData);
      if (response.data?.user) {
        setUser(response.data.user);
        return { success: true, user: response.data.user };
      }
    } catch (error) {
      console.error('Profile update failed:', error);
      return { success: false, error: error.message };
    }
  };

  const clearAuthError = () => {
    setAuthError(null);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      isBlocked,
      blockedInfo,
      login,
      register,
      logout,
      updateUser,
      checkUserAuth,
      checkAppState,
      navigateToLogin,
      clearAuthError
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

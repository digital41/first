import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User } from '@/types';
import { authApi, getAccessToken, clearTokens } from '@/services/api';
import { socketService } from '@/services/socket';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  mustChangePassword: boolean;
  login: (customerCode: string) => Promise<void>; // Login par code client SAGE
  loginWithEmail: (email: string, password: string) => Promise<{ mustChangePassword: boolean }>;
  loginWithGoogle: (idToken: string) => Promise<{ mustChangePassword: boolean }>;
  changePassword: (newPassword: string, currentPassword?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mustChangePassword, setMustChangePassword] = useState(false);

  const isAuthenticated = !!user;

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      const token = getAccessToken();
      if (token) {
        try {
          const currentUser = await authApi.getCurrentUser();
          setUser(currentUser);
          // Check if user needs to change password
          setMustChangePassword(currentUser.mustChangePassword || false);
          socketService.connect();
          socketService.subscribeToNotifications();
        } catch {
          clearTokens();
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    initAuth();

    return () => {
      socketService.disconnect();
    };
  }, []);

  // Login with customer code (SAGE)
  const login = useCallback(async (customerCode: string) => {
    setIsLoading(true);
    try {
      const response = await authApi.loginByCustomerCode(customerCode);
      setUser(response.user);
      setMustChangePassword(false); // Code client login doesn't have password change
      socketService.connect();
      socketService.subscribeToNotifications();
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Login with email and password
  const loginWithEmail = useCallback(async (email: string, password: string): Promise<{ mustChangePassword: boolean }> => {
    setIsLoading(true);
    try {
      const response = await authApi.loginWithEmail(email, password);
      setUser(response.user);
      setMustChangePassword(response.mustChangePassword);
      socketService.connect();
      socketService.subscribeToNotifications();
      return { mustChangePassword: response.mustChangePassword };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Login with Google OAuth
  // NOTE: Don't use setIsLoading here - LoginPage has its own googleLoading state
  // Using isLoading would cause PublicRoute to unmount LoginPage during the flow
  const loginWithGoogle = useCallback(async (idToken: string): Promise<{ mustChangePassword: boolean }> => {
    const response = await authApi.loginWithGoogle(idToken);
    setUser(response.user);
    setMustChangePassword(response.mustChangePassword);
    socketService.connect();
    socketService.subscribeToNotifications();
    return { mustChangePassword: response.mustChangePassword };
  }, []);

  // Change password
  const changePassword = useCallback(async (newPassword: string, currentPassword?: string) => {
    setIsLoading(true);
    try {
      const updatedUser = await authApi.changePassword(newPassword, currentPassword);
      setUser(updatedUser);
      setMustChangePassword(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
      setMustChangePassword(false);
      socketService.disconnect();
    }
  }, []);

  const refreshUser = useCallback(async () => {
    if (getAccessToken()) {
      try {
        const currentUser = await authApi.getCurrentUser();
        setUser(currentUser);
        setMustChangePassword(currentUser.mustChangePassword || false);
      } catch {
        clearTokens();
        setUser(null);
      }
    }
  }, []);

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    mustChangePassword,
    login,
    loginWithEmail,
    loginWithGoogle,
    changePassword,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;

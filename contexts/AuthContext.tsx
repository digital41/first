import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User, UserRole, Notification } from '../types';
import { ApiService, TokenStorage, ApiError } from '../services/api';
import { socketService } from '../services/socket';

// ============================================
// TYPES
// ============================================

interface AuthContextType {
  // État
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  isAgent: boolean;
  isSupervisor: boolean;
  notifications: Notification[];
  unreadCount: number;

  // Actions
  loginAdmin: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  markNotificationAsRead: (notificationId: string) => Promise<void>;
}

// ============================================
// CONTEXTE
// ============================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================
// PROVIDER
// ============================================

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Calculs dérivés
  const isAuthenticated = !!user;
  const isAdmin = user?.role === UserRole.ADMIN;
  const isAgent = user?.role === UserRole.AGENT || isAdmin;
  const isSupervisor = user?.role === UserRole.SUPERVISOR || isAdmin;
  // Protection: s'assurer que notifications est un tableau
  const safeNotifications = Array.isArray(notifications) ? notifications : [];
  const unreadCount = safeNotifications.filter((n) => !n.isRead).length;

  /**
   * Charge l'utilisateur depuis le token stocké
   */
  const loadUser = useCallback(async () => {
    if (!TokenStorage.isAuthenticated()) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const currentUser = await ApiService.getCurrentUser();
      setUser(currentUser);

      // Charger les notifications
      const notifs = await ApiService.getNotifications();
      setNotifications(Array.isArray(notifs) ? notifs : []);
    } catch (error) {
      console.error('Erreur chargement utilisateur:', error);
      // Token invalide, on déconnecte
      TokenStorage.clear();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Connexion admin
   */
  const loginAdmin = useCallback(async (email: string, password: string) => {
    const response = await ApiService.loginAdmin(email, password);
    setUser(response.user);

    // Charger les notifications après connexion
    try {
      const notifs = await ApiService.getNotifications();
      setNotifications(Array.isArray(notifs) ? notifs : []);
    } catch {
      // Ignore les erreurs de notification
      setNotifications([]);
    }

    // Connecter le WebSocket
    socketService.connect({
      onNotification: (notification) => {
        setNotifications((prev) => [notification, ...(Array.isArray(prev) ? prev : [])]);
      },
    });
  }, []);

  /**
   * Déconnexion
   */
  const logout = useCallback(async () => {
    await ApiService.logout();
    socketService.disconnect();
    setUser(null);
    setNotifications([]);
  }, []);

  /**
   * Rafraîchit les données utilisateur
   */
  const refreshUser = useCallback(async () => {
    if (!TokenStorage.isAuthenticated()) return;

    try {
      const currentUser = await ApiService.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 401) {
        await logout();
      }
    }
  }, [logout]);

  /**
   * Marque une notification comme lue
   */
  const markNotificationAsRead = useCallback(async (notificationId: string) => {
    await ApiService.markNotificationAsRead(notificationId);
    setNotifications((prev) => {
      const safePrev = Array.isArray(prev) ? prev : [];
      return safePrev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n));
    });
  }, []);

  // Chargement initial
  useEffect(() => {
    loadUser();
  }, [loadUser]);

  // Connexion WebSocket quand l'utilisateur est connecté
  useEffect(() => {
    if (user && !socketService.isConnected()) {
      socketService.connect({
        onNotification: (notification) => {
          setNotifications((prev) => [notification, ...(Array.isArray(prev) ? prev : [])]);
        },
        onDisconnect: () => {
          console.log('WebSocket déconnecté');
        },
      });
    }

    return () => {
      // Ne pas déconnecter ici car le composant peut se remonter
    };
  }, [user]);

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    isAdmin,
    isAgent,
    isSupervisor,
    notifications: safeNotifications,
    unreadCount,
    loginAdmin,
    logout,
    refreshUser,
    markNotificationAsRead,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// ============================================
// HOOK
// ============================================

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// ============================================
// HOC PROTECTION ROUTES
// ============================================

interface RequireAuthProps {
  children: ReactNode;
  fallback?: ReactNode;
  requiredRole?: UserRole;
}

export const RequireAuth: React.FC<RequireAuthProps> = ({
  children,
  fallback = null,
  requiredRole,
}) => {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <>{fallback}</>;
  }

  if (requiredRole && user?.role !== requiredRole) {
    // Vérifier la hiérarchie des rôles
    const roleHierarchy: Record<UserRole, number> = {
      [UserRole.CUSTOMER]: 0,
      [UserRole.AGENT]: 1,
      [UserRole.SUPERVISOR]: 2,
      [UserRole.ADMIN]: 3,
    };

    if (roleHierarchy[user!.role] < roleHierarchy[requiredRole]) {
      return <>{fallback}</>;
    }
  }

  return <>{children}</>;
};

export default AuthContext;

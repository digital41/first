import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { User, UserRole, Notification } from '../types';
import { AdminApi, TokenStorage, ApiError } from '../services/api';

// ============================================
// TYPES
// ============================================

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  isSupervisor: boolean;
  notifications: Notification[];
  unreadCount: number;

  login: (email: string, password: string) => Promise<void>;
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
  const isSupervisor = user?.role === UserRole.SUPERVISOR || isAdmin;
  const safeNotifications = Array.isArray(notifications) ? notifications : [];
  const unreadCount = safeNotifications.filter((n) => !n.isRead).length;

  // Vérifier que l'utilisateur est bien staff
  const isStaff = (role: UserRole | string): boolean => {
    const staffRoles = ['ADMIN', 'SUPERVISOR', 'AGENT'];
    return staffRoles.includes(String(role));
  };

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
      const currentUser = await AdminApi.getCurrentUser();
      console.log('Current user loaded:', currentUser?.displayName, 'Role:', currentUser?.role);

      // Vérifier que c'est bien un staff
      if (!isStaff(currentUser.role)) {
        console.warn('Accès refusé: utilisateur non-staff, role:', currentUser.role);
        TokenStorage.clear();
        setUser(null);
        setIsLoading(false);
        return;
      }

      setUser(currentUser);

      // Charger les notifications
      try {
        const notifs = await AdminApi.getNotifications();
        setNotifications(Array.isArray(notifs) ? notifs : []);
      } catch {
        setNotifications([]);
      }
    } catch (error) {
      console.error('Erreur chargement utilisateur:', error);
      TokenStorage.clear();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Connexion admin
   */
  const login = useCallback(async (email: string, password: string) => {
    const response = await AdminApi.login(email, password);

    // Vérifier que c'est bien un staff
    if (!isStaff(response.user.role)) {
      TokenStorage.clear();
      throw new ApiError(
        'Accès réservé au personnel autorisé.',
        403,
        'ACCESS_DENIED'
      );
    }

    setUser(response.user);

    // Charger les notifications
    try {
      const notifs = await AdminApi.getNotifications();
      setNotifications(Array.isArray(notifs) ? notifs : []);
    } catch {
      setNotifications([]);
    }
  }, []);

  /**
   * Déconnexion
   */
  const logout = useCallback(async () => {
    await AdminApi.logout();
    setUser(null);
    setNotifications([]);
  }, []);

  /**
   * Rafraîchit les données utilisateur
   */
  const refreshUser = useCallback(async () => {
    if (!TokenStorage.isAuthenticated()) return;

    try {
      const currentUser = await AdminApi.getCurrentUser();
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
    await AdminApi.markNotificationAsRead(notificationId);
    setNotifications((prev) => {
      const safePrev = Array.isArray(prev) ? prev : [];
      return safePrev.map((n) =>
        n.id === notificationId ? { ...n, isRead: true } : n
      );
    });
  }, []);

  // Chargement initial
  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    isAdmin,
    isSupervisor,
    notifications: safeNotifications,
    unreadCount,
    login,
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

export default AuthContext;

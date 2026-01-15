import { useState, useEffect, useCallback, useMemo } from 'react';
import { AdminApi } from '../services/api';
import { User } from '../types';
import {
  ManagedUser,
  CreateUserData,
  UpdateUserData,
  UserRole,
  UserStatus,
  ValidationError,
  validateUserData,
  createDefaultStats,
  createDefaultOperatorProfile,
} from '../lib/userManagementTypes';

// ============================================
// USE USER MANAGEMENT HOOK
// ============================================
// Hook pour gérer les utilisateurs via l'API backend

interface UseUserManagementOptions {
  currentUserRole?: UserRole;
  autoLoad?: boolean;
}

interface UseUserManagementReturn {
  // Data
  users: ManagedUser[];
  filteredUsers: ManagedUser[];
  loading: boolean;
  error: string | null;

  // Filters
  filters: UserFilters;
  setFilters: (filters: Partial<UserFilters>) => void;
  resetFilters: () => void;

  // CRUD Operations
  createUser: (data: CreateUserData) => Promise<{ success: boolean; user?: ManagedUser; errors?: ValidationError[] }>;
  updateUser: (userId: string, data: UpdateUserData) => Promise<{ success: boolean; user?: ManagedUser; errors?: ValidationError[] }>;
  deleteUser: (userId: string) => Promise<boolean>;
  activateUser: (userId: string) => Promise<boolean>;
  deactivateUser: (userId: string) => Promise<boolean>;
  suspendUser: (userId: string) => Promise<boolean>;

  // Bulk Operations
  bulkUpdateStatus: (userIds: string[], status: UserStatus) => Promise<boolean>;
  bulkDelete: (userIds: string[]) => Promise<boolean>;

  // Utilities
  getUserById: (userId: string) => ManagedUser | undefined;
  refreshUsers: () => void;
  isAdmin: boolean;

  // Stats
  stats: UserManagementStats;
}

interface UserFilters {
  role?: UserRole;
  status?: UserStatus;
  search?: string;
}

interface UserManagementStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  suspendedUsers: number;
  adminCount: number;
  supervisorCount: number;
  agentCount: number;
}

const DEFAULT_FILTERS: UserFilters = {};

// ============================================
// HELPER: Convert API User to ManagedUser
// ============================================

const mapUserToManagedUser = (user: User): ManagedUser => {
  // Get real stats from backend
  // activeTicketsCount = tickets non fermés/résolus (en cours)
  // _count.assignedTickets = total des tickets assignés (historique)
  const currentActiveTickets = user.activeTicketsCount ?? 0;
  const totalTicketsHandled = user._count?.assignedTickets ?? 0;

  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: (user.role as UserRole) || UserRole.AGENT,
    status: user.isActive !== false ? UserStatus.ACTIVE : UserStatus.INACTIVE,
    avatarUrl: user.avatarUrl,
    phone: user.phone,
    profile: createDefaultOperatorProfile(),
    stats: {
      ...createDefaultStats(),
      currentActiveTickets,
      totalTicketsHandled,
    },
    createdAt: user.createdAt || new Date().toISOString(),
    updatedAt: user.updatedAt || new Date().toISOString(),
    lastLoginAt: user.lastLoginAt,
  };
};

// ============================================
// HOOK
// ============================================

const useUserManagement = ({
  currentUserRole,
  autoLoad = true,
}: UseUserManagementOptions = {}): UseUserManagementReturn => {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<UserFilters>(DEFAULT_FILTERS);

  // Check if current user is admin
  const isAdmin = currentUserRole === UserRole.ADMIN;

  // Load users from API
  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const apiUsers = await AdminApi.getUsers();
      const mappedUsers = apiUsers.map(mapUserToManagedUser);
      setUsers(mappedUsers);
    } catch (err) {
      setError('Erreur lors du chargement des utilisateurs');
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load users on mount
  useEffect(() => {
    if (autoLoad) {
      loadUsers();
    }
  }, [autoLoad, loadUsers]);

  // Filter users based on current filters
  const filteredUsers = useMemo(() => {
    let result = [...users];

    if (filters.role) {
      result = result.filter((u) => u.role === filters.role);
    }

    if (filters.status) {
      result = result.filter((u) => u.status === filters.status);
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(
        (u) =>
          u.displayName.toLowerCase().includes(searchLower) ||
          u.email.toLowerCase().includes(searchLower)
      );
    }

    // Sort by creation date (newest first)
    result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return result;
  }, [users, filters]);

  // Calculate stats
  const stats = useMemo((): UserManagementStats => {
    return {
      totalUsers: users.length,
      activeUsers: users.filter((u) => u.status === UserStatus.ACTIVE).length,
      inactiveUsers: users.filter((u) => u.status === UserStatus.INACTIVE).length,
      suspendedUsers: users.filter((u) => u.status === UserStatus.SUSPENDED).length,
      adminCount: users.filter((u) => u.role === UserRole.ADMIN).length,
      supervisorCount: users.filter((u) => u.role === UserRole.SUPERVISOR).length,
      agentCount: users.filter((u) => u.role === UserRole.AGENT).length,
    };
  }, [users]);

  // Set filters
  const setFilters = useCallback((newFilters: Partial<UserFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...newFilters }));
  }, []);

  const resetFilters = useCallback(() => {
    setFiltersState(DEFAULT_FILTERS);
  }, []);

  // Create user via API
  const createUser = useCallback(
    async (data: CreateUserData): Promise<{ success: boolean; user?: ManagedUser; errors?: ValidationError[] }> => {
      // Validate locally first
      const errors = validateUserData(data, users);
      if (errors.length > 0) {
        return { success: false, errors };
      }

      try {
        const apiUser = await AdminApi.createUser({
          email: data.email.trim().toLowerCase(),
          displayName: data.displayName.trim(),
          role: data.role,
          phone: data.phone,
          password: 'TempPassword123!', // Le backend devrait générer un mot de passe ou envoyer un email
        });

        const newUser = mapUserToManagedUser(apiUser);
        setUsers((prev) => [...prev, newUser]);

        return { success: true, user: newUser };
      } catch (err) {
        console.error('Failed to create user:', err);
        return {
          success: false,
          errors: [{ field: 'general', message: err instanceof Error ? err.message : 'Erreur lors de la création' }],
        };
      }
    },
    [users]
  );

  // Update user via API
  const updateUser = useCallback(
    async (
      userId: string,
      data: UpdateUserData
    ): Promise<{ success: boolean; user?: ManagedUser; errors?: ValidationError[] }> => {
      const existingUser = users.find((u) => u.id === userId);
      if (!existingUser) {
        return { success: false, errors: [{ field: 'id', message: 'Utilisateur non trouvé' }] };
      }

      try {
        const apiUser = await AdminApi.updateUser(userId, {
          displayName: data.displayName?.trim(),
          role: data.role,
          isActive: data.status === UserStatus.ACTIVE,
          phone: data.phone,
          password: data.password,
        });

        const updatedUser = mapUserToManagedUser(apiUser);
        // Conserver le statut local si spécifié
        if (data.status) {
          updatedUser.status = data.status;
        }

        setUsers((prev) => prev.map((u) => (u.id === userId ? updatedUser : u)));

        return { success: true, user: updatedUser };
      } catch (err) {
        console.error('Failed to update user:', err);
        return {
          success: false,
          errors: [{ field: 'general', message: err instanceof Error ? err.message : 'Erreur lors de la mise à jour' }],
        };
      }
    },
    [users]
  );

  // Delete user via API
  const deleteUser = useCallback(
    async (userId: string): Promise<boolean> => {
      try {
        await AdminApi.deleteUser(userId);
        setUsers((prev) => prev.filter((u) => u.id !== userId));
        return true;
      } catch (err) {
        console.error('Failed to delete user:', err);
        return false;
      }
    },
    []
  );

  // Status change helpers
  const changeUserStatus = useCallback(
    async (userId: string, status: UserStatus): Promise<boolean> => {
      const result = await updateUser(userId, { status });
      return result.success;
    },
    [updateUser]
  );

  const activateUser = useCallback(
    (userId: string) => changeUserStatus(userId, UserStatus.ACTIVE),
    [changeUserStatus]
  );

  const deactivateUser = useCallback(
    (userId: string) => changeUserStatus(userId, UserStatus.INACTIVE),
    [changeUserStatus]
  );

  const suspendUser = useCallback(
    (userId: string) => changeUserStatus(userId, UserStatus.SUSPENDED),
    [changeUserStatus]
  );

  // Bulk operations
  const bulkUpdateStatus = useCallback(
    async (userIds: string[], status: UserStatus): Promise<boolean> => {
      try {
        // Update each user via API
        const results = await Promise.all(
          userIds.map((id) => updateUser(id, { status }))
        );
        return results.every((r) => r.success);
      } catch (err) {
        console.error('Bulk update failed:', err);
        return false;
      }
    },
    [updateUser]
  );

  const bulkDelete = useCallback(
    async (userIds: string[]): Promise<boolean> => {
      try {
        const results = await Promise.all(
          userIds.map((id) => deleteUser(id))
        );
        return results.every((r) => r);
      } catch (err) {
        console.error('Bulk delete failed:', err);
        return false;
      }
    },
    [deleteUser]
  );

  // Get user by ID
  const getUserById = useCallback(
    (userId: string): ManagedUser | undefined => {
      return users.find((u) => u.id === userId);
    },
    [users]
  );

  return {
    users,
    filteredUsers,
    loading,
    error,
    filters,
    setFilters,
    resetFilters,
    createUser,
    updateUser,
    deleteUser,
    activateUser,
    deactivateUser,
    suspendUser,
    bulkUpdateStatus,
    bulkDelete,
    getUserById,
    refreshUsers: loadUsers,
    isAdmin,
    stats,
  };
};

export default useUserManagement;

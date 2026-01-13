import React, { useState } from 'react';
import {
  Users,
  Plus,
  Search,
  Filter,
  MoreVertical,
  UserPlus,
  UserMinus,
  UserX,
  Edit,
  Trash2,
  Shield,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  ChevronDown,
  RefreshCw,
  BarChart3,
  Mail,
  Phone,
} from 'lucide-react';
import useUserManagement from '../../hooks/useUserManagement';
import UserFormModal from './UserFormModal';
import {
  ManagedUser,
  UserRole,
  UserStatus,
  getRoleLabel,
  getRoleColor,
  getStatusLabel,
  getStatusColor,
  CreateUserData,
  UpdateUserData,
} from '../../lib/userManagementTypes';

// ============================================
// USERS ADMIN PAGE COMPONENT
// ============================================
// Page d'administration des utilisateurs (ADMIN only)

interface UsersAdminPageProps {
  currentUserRole?: UserRole;
}

const UsersAdminPage: React.FC<UsersAdminPageProps> = ({
  currentUserRole = UserRole.ADMIN,
}) => {
  const {
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
    refreshUsers,
    stats,
  } = useUserManagement({ currentUserRole });

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);

  // UI states
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  // Access control
  const isAdmin = currentUserRole === UserRole.ADMIN;

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-slate-800 mb-2">Accès refusé</h1>
          <p className="text-slate-600">
            Vous n'avez pas les permissions nécessaires pour accéder à cette page.
          </p>
        </div>
      </div>
    );
  }

  const handleCreateUser = async (data: CreateUserData | UpdateUserData) => {
    return createUser(data as CreateUserData);
  };

  const handleUpdateUser = async (data: CreateUserData | UpdateUserData) => {
    if (!editingUser) return { success: false };
    return updateUser(editingUser.id, data as UpdateUserData);
  };

  const handleDeleteUser = async (userId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
      await deleteUser(userId);
    }
  };

  const handleStatusChange = async (userId: string, action: 'activate' | 'deactivate' | 'suspend') => {
    setOpenDropdownId(null);
    switch (action) {
      case 'activate':
        await activateUser(userId);
        break;
      case 'deactivate':
        await deactivateUser(userId);
        break;
      case 'suspend':
        await suspendUser(userId);
        break;
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const toggleAllSelection = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map((u) => u.id));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Gestion des utilisateurs</h1>
                <p className="text-slate-500">Gérez les opérateurs et leurs permissions</p>
              </div>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center space-x-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <Plus className="w-5 h-5" />
              <span>Créer un opérateur</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <StatCard
            label="Total"
            value={stats.totalUsers}
            icon={Users}
            color="slate"
          />
          <StatCard
            label="Actifs"
            value={stats.activeUsers}
            icon={CheckCircle}
            color="green"
          />
          <StatCard
            label="Inactifs"
            value={stats.inactiveUsers}
            icon={Clock}
            color="slate"
          />
          <StatCard
            label="Suspendus"
            value={stats.suspendedUsers}
            icon={XCircle}
            color="red"
          />
          <StatCard
            label="Admins"
            value={stats.adminCount}
            icon={Shield}
            color="purple"
          />
          <StatCard
            label="Superviseurs"
            value={stats.supervisorCount}
            icon={Shield}
            color="blue"
          />
          <StatCard
            label="Agents"
            value={stats.agentCount}
            icon={Shield}
            color="green"
          />
        </div>
      </div>

      {/* Filters & Actions */}
      <div className="max-w-7xl mx-auto px-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={filters.search || ''}
                onChange={(e) => setFilters({ search: e.target.value })}
                placeholder="Rechercher par nom ou email..."
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Role Filter */}
            <select
              value={filters.role || ''}
              onChange={(e) => setFilters({ role: e.target.value as UserRole || undefined })}
              className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="">Tous les rôles</option>
              <option value={UserRole.ADMIN}>Administrateurs</option>
              <option value={UserRole.SUPERVISOR}>Superviseurs</option>
              <option value={UserRole.AGENT}>Agents</option>
            </select>

            {/* Status Filter */}
            <select
              value={filters.status || ''}
              onChange={(e) => setFilters({ status: e.target.value as UserStatus || undefined })}
              className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="">Tous les statuts</option>
              <option value={UserStatus.ACTIVE}>Actifs</option>
              <option value={UserStatus.INACTIVE}>Inactifs</option>
              <option value={UserStatus.SUSPENDED}>Suspendus</option>
            </select>

            {/* Reset Filters */}
            {(filters.search || filters.role || filters.status) && (
              <button
                onClick={resetFilters}
                className="px-3 py-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Effacer
              </button>
            )}

            {/* Refresh */}
            <button
              onClick={refreshUsers}
              className="p-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
              title="Actualiser"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="max-w-7xl mx-auto px-6 pb-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="py-12 text-center">
              <RefreshCw className="w-8 h-8 text-slate-400 animate-spin mx-auto mb-3" />
              <p className="text-slate-500">Chargement...</p>
            </div>
          ) : error ? (
            <div className="py-12 text-center">
              <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-3" />
              <p className="text-red-600">{error}</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600 font-medium">Aucun utilisateur trouvé</p>
              <p className="text-slate-400 text-sm mt-1">
                {filters.search || filters.role || filters.status
                  ? 'Essayez de modifier vos filtres'
                  : 'Créez votre premier opérateur'}
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                      onChange={toggleAllSelection}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Utilisateur
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Rôle
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Statut
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Statistiques
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Compétences
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((user) => (
                  <UserRow
                    key={user.id}
                    user={user}
                    isSelected={selectedUsers.includes(user.id)}
                    onToggleSelect={() => toggleUserSelection(user.id)}
                    onEdit={() => setEditingUser(user)}
                    onDelete={() => handleDeleteUser(user.id)}
                    onStatusChange={(action) => handleStatusChange(user.id, action)}
                    isDropdownOpen={openDropdownId === user.id}
                    onToggleDropdown={() =>
                      setOpenDropdownId(openDropdownId === user.id ? null : user.id)
                    }
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Create Modal */}
      <UserFormModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateUser}
      />

      {/* Edit Modal */}
      <UserFormModal
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        onSubmit={handleUpdateUser}
        editingUser={editingUser}
        title="Modifier l'utilisateur"
      />
    </div>
  );
};

// ============================================
// SUB-COMPONENTS
// ============================================

interface StatCardProps {
  label: string;
  value: number;
  icon: React.FC<{ className?: string }>;
  color: 'slate' | 'green' | 'red' | 'purple' | 'blue';
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon: Icon, color }) => {
  const colors = {
    slate: 'bg-slate-100 text-slate-600',
    green: 'bg-green-100 text-green-600',
    red: 'bg-red-100 text-red-600',
    purple: 'bg-purple-100 text-purple-600',
    blue: 'bg-blue-100 text-blue-600',
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center space-x-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-800">{value}</p>
          <p className="text-xs text-slate-500">{label}</p>
        </div>
      </div>
    </div>
  );
};

interface UserRowProps {
  user: ManagedUser;
  isSelected: boolean;
  onToggleSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (action: 'activate' | 'deactivate' | 'suspend') => void;
  isDropdownOpen: boolean;
  onToggleDropdown: () => void;
}

const UserRow: React.FC<UserRowProps> = ({
  user,
  isSelected,
  onToggleSelect,
  onEdit,
  onDelete,
  onStatusChange,
  isDropdownOpen,
  onToggleDropdown,
}) => {
  return (
    <tr className={`hover:bg-slate-50 ${isSelected ? 'bg-indigo-50' : ''}`}>
      {/* Checkbox */}
      <td className="px-4 py-3">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
        />
      </td>

      {/* User Info */}
      <td className="px-4 py-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
            {user.displayName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-medium text-slate-800">{user.displayName}</p>
            <div className="flex items-center space-x-2 text-xs text-slate-500">
              <Mail className="w-3 h-3" />
              <span>{user.email}</span>
            </div>
            {user.phone && (
              <div className="flex items-center space-x-2 text-xs text-slate-500">
                <Phone className="w-3 h-3" />
                <span>{user.phone}</span>
              </div>
            )}
          </div>
        </div>
      </td>

      {/* Role */}
      <td className="px-4 py-3">
        <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${getRoleColor(user.role)}`}>
          {getRoleLabel(user.role)}
        </span>
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${getStatusColor(user.status)}`}>
          {getStatusLabel(user.status)}
        </span>
      </td>

      {/* Stats */}
      <td className="px-4 py-3">
        <div className="text-xs text-slate-600 space-y-1">
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-3 h-3 text-slate-400" />
            <span>{user.stats.totalTicketsHandled} tickets traités</span>
          </div>
          <div className="flex items-center space-x-2">
            <Clock className="w-3 h-3 text-slate-400" />
            <span>{user.stats.currentActiveTickets} en cours</span>
          </div>
          {user.stats.slaComplianceRate > 0 && (
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-3 h-3 text-green-500" />
              <span>{user.stats.slaComplianceRate}% SLA</span>
            </div>
          )}
        </div>
      </td>

      {/* Skills */}
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1 max-w-xs">
          {user.profile?.skills.categories.slice(0, 2).map((cat, i) => (
            <span
              key={i}
              className="px-2 py-0.5 text-xs bg-slate-100 text-slate-600 rounded"
            >
              {cat}
            </span>
          ))}
          {(user.profile?.skills.categories.length || 0) > 2 && (
            <span className="px-2 py-0.5 text-xs bg-slate-100 text-slate-500 rounded">
              +{(user.profile?.skills.categories.length || 0) - 2}
            </span>
          )}
          {!user.profile?.skills.categories.length && (
            <span className="text-xs text-slate-400">Non défini</span>
          )}
        </div>
      </td>

      {/* Actions */}
      <td className="px-4 py-3 text-right">
        <div className="relative inline-block">
          <button
            onClick={onToggleDropdown}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          {isDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={onToggleDropdown}
              />
              <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-slate-200 z-20 py-1">
                <button
                  onClick={onEdit}
                  className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <Edit className="w-4 h-4" />
                  <span>Modifier</span>
                </button>

                {user.status !== UserStatus.ACTIVE && (
                  <button
                    onClick={() => onStatusChange('activate')}
                    className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-green-700 hover:bg-green-50"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Activer</span>
                  </button>
                )}

                {user.status === UserStatus.ACTIVE && (
                  <button
                    onClick={() => onStatusChange('deactivate')}
                    className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <UserMinus className="w-4 h-4" />
                    <span>Désactiver</span>
                  </button>
                )}

                {user.status !== UserStatus.SUSPENDED && (
                  <button
                    onClick={() => onStatusChange('suspend')}
                    className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-orange-700 hover:bg-orange-50"
                  >
                    <UserX className="w-4 h-4" />
                    <span>Suspendre</span>
                  </button>
                )}

                <div className="border-t border-slate-100 my-1" />

                <button
                  onClick={onDelete}
                  className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Supprimer</span>
                </button>
              </div>
            </>
          )}
        </div>
      </td>
    </tr>
  );
};

export default UsersAdminPage;

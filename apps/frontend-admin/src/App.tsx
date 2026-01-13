import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';
import UsersAdminPage from './components/users/UsersAdminPage';
import { LogOut, Bell, User, Shield, Users, ArrowLeft } from 'lucide-react';
import { UserRole } from './lib/userManagementTypes';

// ============================================
// COMPOSANT PRINCIPAL ADMIN
// ============================================

// Types de pages disponibles
type PageType = 'dashboard' | 'users';

const AdminContent: React.FC = () => {
  const { user, isAuthenticated, isLoading, logout, notifications, unreadCount } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [currentPage, setCurrentPage] = useState<PageType>('dashboard');

  // Vérifie si l'utilisateur est admin
  const isAdmin = user?.role === 'ADMIN' || user?.role === UserRole.ADMIN;

  // Loading
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4" />
          <p className="text-slate-400">Chargement...</p>
        </div>
      </div>
    );
  }

  // Non authentifié -> Login
  if (!isAuthenticated) {
    return <AdminLogin />;
  }

  // Authentifié -> Dashboard
  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header Admin */}
      <header className="bg-slate-900 text-white sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo + Navigation */}
          <div className="flex items-center space-x-4">
            {/* Back button when on users page */}
            {currentPage === 'users' && (
              <button
                onClick={() => setCurrentPage('dashboard')}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                title="Retour au dashboard"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}

            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <span className="text-lg font-bold">KLY Admin</span>
                <span className="text-xs text-slate-400 block">
                  {currentPage === 'dashboard' ? 'Gestion SAV' : 'Gestion des Agents'}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-4">
            {/* Bouton Agents - ADMIN ONLY */}
            {isAdmin && currentPage === 'dashboard' && (
              <button
                onClick={() => setCurrentPage('users')}
                className="flex items-center space-x-2 px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                title="Gérer les agents"
              >
                <Users className="w-5 h-5" />
                <span className="hidden md:inline text-sm">Agents</span>
              </button>
            )}

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Dropdown Notifications */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-slate-200 z-50">
                  <div className="p-3 border-b border-slate-100">
                    <h3 className="font-semibold text-slate-800">Notifications</h3>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="p-4 text-center text-slate-500 text-sm">
                        Aucune notification
                      </p>
                    ) : (
                      notifications.slice(0, 5).map((notif) => (
                        <div
                          key={notif.id}
                          className={`p-3 border-b border-slate-50 hover:bg-slate-50 cursor-pointer ${
                            !notif.isRead ? 'bg-indigo-50' : ''
                          }`}
                        >
                          <p className="text-sm text-slate-700">{notif.type}</p>
                          <p className="text-xs text-slate-400 mt-1">
                            {new Date(notif.createdAt).toLocaleString('fr-FR')}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User */}
            <div className="flex items-center space-x-3 pl-4 border-l border-slate-700">
              <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-medium">{user?.displayName}</p>
                <p className="text-xs text-slate-400">{user?.role}</p>
              </div>
            </div>

            {/* Logout */}
            <button
              onClick={logout}
              className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
              title="Déconnexion"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Page Content */}
      {currentPage === 'dashboard' && (
        <AdminDashboard
          onNavigateToUsers={isAdmin ? () => setCurrentPage('users') : undefined}
        />
      )}
      {currentPage === 'users' && isAdmin && (
        <UsersAdminPage currentUserRole={user?.role as UserRole} />
      )}
    </div>
  );
};

// ============================================
// APP WRAPPER
// ============================================

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AdminContent />
    </AuthProvider>
  );
};

export default App;

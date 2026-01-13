import React, { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import {
  Bell,
  LogOut,
  Menu,
  X,
  ChevronDown,
} from 'lucide-react';
import AdminSidebar from './AdminSidebar';
import { useAuth } from '../../contexts/AuthContext';

// ============================================
// ADMIN LAYOUT COMPONENT
// ============================================
// Layout principal avec sidebar + header + contenu
// Gère le responsive avec sidebar collapsible sur mobile

const AdminLayout: React.FC = () => {
  const { user, logout, notifications, unreadCount, markNotificationAsRead } = useAuth();
  const navigate = useNavigate();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  };

  const handleNotificationClick = async (notificationId: string) => {
    await markNotificationAsRead(notificationId);
    setIsNotificationsOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Sidebar - Desktop */}
      <div className="hidden lg:block">
        <AdminSidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-40 w-64 transform transition-transform duration-300 lg:hidden ${
          isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <AdminSidebar />
      </div>

      {/* Main content area */}
      <div className="lg:ml-64 transition-all duration-300">
        {/* Top header */}
        <header className="sticky top-0 z-20 h-16 bg-white border-b border-slate-200 shadow-sm">
          <div className="h-full px-4 flex items-center justify-between">
            {/* Left section */}
            <div className="flex items-center space-x-4">
              {/* Mobile menu button */}
              <button
                onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
                className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                {isMobileSidebarOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </button>

              {/* Page title - could be dynamic */}
              <h1 className="text-lg font-semibold text-slate-800 hidden sm:block">
                Espace Administration
              </h1>
            </div>

            {/* Right section */}
            <div className="flex items-center space-x-3">
              {/* Notifications dropdown */}
              <div className="relative">
                <button
                  onClick={() => {
                    setIsNotificationsOpen(!isNotificationsOpen);
                    setIsUserMenuOpen(false);
                  }}
                  className="relative p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {/* Notifications panel */}
                {isNotificationsOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-slate-200 overflow-hidden">
                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                      <h3 className="font-semibold text-slate-800">Notifications</h3>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="px-4 py-8 text-center text-slate-500">
                          Aucune notification
                        </div>
                      ) : (
                        notifications.slice(0, 5).map((notif) => (
                          <button
                            key={notif.id}
                            onClick={() => handleNotificationClick(notif.id)}
                            className={`w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0 ${
                              !notif.isRead ? 'bg-indigo-50' : ''
                            }`}
                          >
                            <p className="text-sm text-slate-800 font-medium">
                              {String(notif.payload?.title || 'Notification')}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                              {String(notif.payload?.message || '')}
                            </p>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User menu dropdown */}
              <div className="relative">
                <button
                  onClick={() => {
                    setIsUserMenuOpen(!isUserMenuOpen);
                    setIsNotificationsOpen(false);
                  }}
                  className="flex items-center space-x-2 p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                    {user?.displayName?.charAt(0) || '?'}
                  </div>
                  <span className="hidden sm:block text-sm font-medium text-slate-700">
                    {user?.displayName}
                  </span>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </button>

                {/* User menu panel */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-slate-200 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100">
                      <p className="text-sm font-medium text-slate-800">
                        {user?.displayName}
                      </p>
                      <p className="text-xs text-slate-500">{user?.email}</p>
                      <span className="mt-1 inline-block px-2 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-700 rounded">
                        {user?.role}
                      </span>
                    </div>
                    <div className="py-1">
                      <button
                        onClick={handleLogout}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Déconnexion</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main content - Outlet */}
        <main className="p-6">
          <Outlet />
        </main>
      </div>

      {/* Click outside to close dropdowns */}
      {(isNotificationsOpen || isUserMenuOpen) && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => {
            setIsNotificationsOpen(false);
            setIsUserMenuOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default AdminLayout;

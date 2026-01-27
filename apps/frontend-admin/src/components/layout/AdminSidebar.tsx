import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Ticket,
  FolderOpen,
  FolderCheck,
  Plus,
  Search,
  History,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  Shield,
  UserCircle,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

// ============================================
// ADMIN SIDEBAR COMPONENT
// ============================================
// Navigation latérale fixe pour l'espace admin
// Gère les sections: Dashboard, Tickets, Orders, Customers, Administration

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  badge?: number;
  highlight?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
  adminOnly?: boolean;
  managerOnly?: boolean; // Visible uniquement pour ADMIN/SUPERVISOR (pas pour AGENT)
}

const AdminSidebar: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { user, isAdmin, isSupervisor } = useAuth();

  const isManagerRole = isAdmin || isSupervisor;

  // Configuration des sections de navigation
  const navSections: NavSection[] = [
    {
      title: 'Dashboard',
      items: [
        {
          label: 'Vue d\'ensemble',
          path: '/admin',
          icon: <LayoutDashboard className="w-5 h-5" />,
        },
      ],
    },
    {
      title: 'Tickets',
      items: [
        {
          label: 'Tous les tickets',
          path: '/admin/tickets',
          icon: <Ticket className="w-5 h-5" />,
        },
        {
          label: 'Tickets ouverts',
          path: '/admin/tickets/open',
          icon: <FolderOpen className="w-5 h-5" />,
        },
        {
          label: 'Tickets fermés',
          path: '/admin/tickets/closed',
          icon: <FolderCheck className="w-5 h-5" />,
        },
        {
          label: 'Créer un ticket',
          path: '/admin/tickets/new',
          icon: <Plus className="w-5 h-5" />,
          highlight: true,
        },
      ],
    },
    {
      title: 'Commandes',
      managerOnly: true,
      items: [
        {
          label: 'Rechercher',
          path: '/admin/orders/search',
          icon: <Search className="w-5 h-5" />,
        },
        {
          label: 'Historique',
          path: '/admin/orders/history',
          icon: <History className="w-5 h-5" />,
        },
      ],
    },
    {
      title: 'Clients',
      managerOnly: true,
      items: [
        {
          label: 'Liste des clients',
          path: '/admin/customers',
          icon: <UserCircle className="w-5 h-5" />,
        },
      ],
    },
    {
      title: 'Administration',
      adminOnly: true,
      items: [
        {
          label: 'Utilisateurs',
          path: '/admin/users',
          icon: <Users className="w-5 h-5" />,
        },
        {
          label: 'Paramètres',
          path: '/admin/settings',
          icon: <Settings className="w-5 h-5" />,
        },
      ],
    },
  ];

  // Filtrer les sections selon le rôle
  const filteredSections = navSections.filter(
    (section) => {
      // Les sections adminOnly ne sont visibles que pour les managers
      if (section.adminOnly && !isManagerRole) return false;
      // Les sections managerOnly ne sont visibles que pour les managers (ADMIN/SUPERVISOR)
      if (section.managerOnly && !isManagerRole) return false;
      return true;
    }
  );

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-slate-900 text-white flex flex-col transition-all duration-300 z-40 ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Header avec logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-700 bg-gradient-to-r from-slate-900 to-slate-800">
        {!isCollapsed && (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-lg text-white">SAV Pro</span>
              <span className="px-1.5 py-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-[10px] font-bold text-white rounded">V2</span>
            </div>
          </div>
        )}
        {isCollapsed && (
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center mx-auto">
            <Shield className="w-5 h-5 text-white" />
          </div>
        )}
      </div>

      {/* Navigation principale - Scrollable */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        {filteredSections.map((section, sectionIndex) => (
          <div key={section.title} className={sectionIndex > 0 ? 'mt-6' : ''}>
            {/* Titre de section */}
            {!isCollapsed && (
              <h3 className="px-3 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {section.title}
              </h3>
            )}

            {/* Items de navigation */}
            <ul className="space-y-1">
              {section.items.map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    end={item.path === '/admin'}
                    className={({ isActive }) =>
                      `flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                        isActive
                          ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/30'
                          : item.highlight
                          ? 'bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 hover:text-white'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      } ${isCollapsed ? 'justify-center' : ''}`
                    }
                  >
                    <span
                      className={`flex-shrink-0 ${
                        item.highlight ? 'text-indigo-400' : ''
                      }`}
                    >
                      {item.icon}
                    </span>
                    {!isCollapsed && (
                      <>
                        <span className="ml-3 text-sm font-medium">
                          {item.label}
                        </span>
                        {item.badge !== undefined && item.badge > 0 && (
                          <span className="ml-auto px-2 py-0.5 text-xs font-semibold bg-red-500 text-white rounded-full">
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>

                  {/* Tooltip en mode collapsed */}
                  {isCollapsed && (
                    <div className="fixed left-16 ml-2 px-2 py-1 bg-slate-800 text-white text-sm rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50">
                      {item.label}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* User info en bas */}
      {!isCollapsed && user && (
        <div className="p-4 border-t border-slate-700">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-sm font-semibold shadow-lg">
              {user.displayName?.charAt(0) || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user.displayName}
              </p>
              <p className="text-xs text-slate-400 truncate capitalize">{user.role?.toLowerCase()}</p>
            </div>
          </div>
        </div>
      )}

      {/* Toggle collapse button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-20 w-6 h-6 bg-slate-700 border border-slate-600 rounded-full flex items-center justify-center text-slate-300 hover:bg-slate-600 hover:text-white transition-colors"
      >
        {isCollapsed ? (
          <ChevronRight className="w-4 h-4" />
        ) : (
          <ChevronLeft className="w-4 h-4" />
        )}
      </button>
    </aside>
  );
};

export default AdminSidebar;

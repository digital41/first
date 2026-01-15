import React from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
  Link,
} from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Layout
import { AdminLayout } from './components/layout';

// Pages
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';
import { UsersAdminPage } from './components/users';
import { CreateTicket } from './components/tickets';
import { SettingsPage } from './components/settings';
import { UserRole } from './lib/userManagementTypes';
import { TicketStatus } from './types';

// V2 - Nouvelle version indépendante
import AdminV2 from './AdminV2';

// ============================================
// PROTECTED ROUTE WRAPPER
// ============================================
// Protège les routes nécessitant une authentification

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  adminOnly = false,
}) => {
  const { isAuthenticated, isLoading, isAdmin, isSupervisor } = useAuth();
  const location = useLocation();

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4" />
          <p className="text-slate-500">Chargement...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check admin access
  if (adminOnly && !isAdmin && !isSupervisor) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="text-center bg-white p-8 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-xl font-semibold text-slate-800 mb-2">
            Accès refusé
          </h2>
          <p className="text-slate-500">
            Vous n'avez pas les permissions nécessaires pour accéder à cette page.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

// ============================================
// PUBLIC ROUTE WRAPPER
// ============================================
// Redirige vers le dashboard si déjà authentifié

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

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

  if (isAuthenticated) {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
};

// ============================================
// PLACEHOLDER PAGES
// ============================================
// Pages temporaires pour les routes non encore implémentées

const PlaceholderPage: React.FC<{ title: string; description?: string }> = ({
  title,
  description,
}) => (
  <div className="flex flex-col items-center justify-center min-h-[60vh]">
    <div className="text-center bg-white p-8 rounded-xl shadow-sm border border-slate-200 max-w-md">
      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <span className="text-2xl">🚧</span>
      </div>
      <h2 className="text-xl font-semibold text-slate-800 mb-2">{title}</h2>
      <p className="text-slate-500">
        {description || 'Cette fonctionnalité sera bientôt disponible.'}
      </p>
    </div>
  </div>
);

// Wrapper pour AdminDashboard
const DashboardPage: React.FC = () => {
  return <AdminDashboard />;
};

// Wrapper pour Tickets ouverts
const OpenTicketsPage: React.FC = () => {
  return <AdminDashboard initialFilters={{ status: TicketStatus.OPEN }} pageTitle="Tickets ouverts" />;
};

// Wrapper pour Tickets fermés
const ClosedTicketsPage: React.FC = () => {
  return <AdminDashboard initialFilters={{ status: TicketStatus.CLOSED }} pageTitle="Tickets fermés" />;
};

// Wrapper pour UsersAdminPage
const UsersPage: React.FC = () => {
  const { user } = useAuth();
  return <UsersAdminPage currentUserRole={user?.role as UserRole} />;
};

// ============================================
// VERSION SELECTOR
// ============================================
// Page d'accueil pour choisir entre V1 et V2

const VersionSelector: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">KLY GROUPE - SAV Admin</h1>
          <p className="text-slate-300 text-lg">Choisissez la version de l'interface</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Version 1 - Originale */}
          <Link
            to="/admin"
            className="group bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8 hover:bg-white/20 transition-all duration-300 hover:scale-105"
          >
            <div className="w-16 h-16 bg-indigo-500 rounded-xl flex items-center justify-center mb-6 group-hover:bg-indigo-400 transition-colors">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-white mb-3">Version 1 - Standard</h2>
            <p className="text-slate-300 mb-4">Interface originale avec gestion de tickets et utilisateurs.</p>
            <ul className="text-sm text-slate-400 space-y-2">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full"></span>
                Dashboard tickets
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full"></span>
                Gestion utilisateurs
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full"></span>
                Messagerie tickets
              </li>
            </ul>
            <div className="mt-6 flex items-center text-indigo-400 font-medium">
              Accéder à V1
              <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </div>
          </Link>

          {/* Version 2 - SAV Industriel */}
          <Link
            to="/v2"
            className="group bg-gradient-to-br from-indigo-500/20 to-purple-500/20 backdrop-blur-sm border border-indigo-400/30 rounded-2xl p-8 hover:from-indigo-500/30 hover:to-purple-500/30 transition-all duration-300 hover:scale-105"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center group-hover:from-indigo-400 group-hover:to-purple-400 transition-colors">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <span className="px-3 py-1 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-semibold rounded-full">NOUVEAU</span>
            </div>
            <h2 className="text-2xl font-semibold text-white mb-3">Version 2 - SAV Industriel</h2>
            <p className="text-slate-300 mb-4">Interface complète pour la gestion SAV industrielle professionnelle.</p>
            <ul className="text-sm text-slate-400 space-y-2">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-purple-400 rounded-full"></span>
                Gestion équipements & machines
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-purple-400 rounded-full"></span>
                Interventions terrain & planning
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-purple-400 rounded-full"></span>
                Stock pièces détachées
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-purple-400 rounded-full"></span>
                Contrats de maintenance
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-purple-400 rounded-full"></span>
                Analytics & Satisfaction client
              </li>
            </ul>
            <div className="mt-6 flex items-center text-purple-400 font-medium">
              Découvrir V2
              <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </div>
          </Link>
        </div>

        <p className="text-center text-slate-500 mt-8 text-sm">
          Les deux versions fonctionnent indépendamment avec le même backend.
        </p>
      </div>
    </div>
  );
};

// ============================================
// APP ROUTES
// ============================================

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <AdminLogin />
          </PublicRoute>
        }
      />

      {/* Protected routes with AdminLayout */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        {/* Dashboard - Default route */}
        <Route index element={<DashboardPage />} />

        {/* Tickets routes */}
        <Route path="tickets" element={<DashboardPage />} />
        <Route path="tickets/open" element={<OpenTicketsPage />} />
        <Route path="tickets/closed" element={<ClosedTicketsPage />} />
        <Route path="tickets/new" element={<CreateTicket />} />

        {/* Orders routes */}
        <Route
          path="orders/search"
          element={<PlaceholderPage title="Rechercher une commande" />}
        />
        <Route
          path="orders/history"
          element={<PlaceholderPage title="Historique des commandes" />}
        />

        {/* Customers routes */}
        <Route
          path="customers"
          element={<PlaceholderPage title="Liste des clients" />}
        />

        {/* Admin-only routes */}
        <Route
          path="users"
          element={
            <ProtectedRoute adminOnly>
              <UsersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="settings"
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* V2 - Nouvelle version indépendante SAV Industriel */}
      <Route path="/v2/*" element={<AdminV2 />} />

      {/* Redirect root to version selector */}
      <Route path="/" element={<VersionSelector />} />

      {/* 404 fallback */}
      <Route
        path="*"
        element={
          <div className="min-h-screen flex items-center justify-center bg-slate-100">
            <div className="text-center">
              <h1 className="text-6xl font-bold text-slate-300 mb-4">404</h1>
              <p className="text-slate-500 mb-4">Page non trouvée</p>
              <a
                href="/admin"
                className="text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Retour au dashboard
              </a>
            </div>
          </div>
        }
      />
    </Routes>
  );
};

// ============================================
// APP COMPONENT
// ============================================

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;

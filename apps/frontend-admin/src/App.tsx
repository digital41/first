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
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="max-w-4xl w-full relative">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div className="text-left">
              <h1 className="text-4xl font-bold text-white flex items-center gap-2">
                SAV Pro
                <span className="px-2 py-1 bg-gradient-to-r from-indigo-500 to-purple-500 text-sm font-bold rounded-full">V2</span>
              </h1>
              <p className="text-slate-400 text-sm">KLY Groupe - Administration</p>
            </div>
          </div>
          <p className="text-slate-300 text-lg">Choisissez votre espace de travail</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* SAV Pro V2 - Principal (recommandé) */}
          <Link
            to="/admin"
            className="group relative bg-gradient-to-br from-indigo-500/20 to-purple-500/20 backdrop-blur-sm border-2 border-indigo-400/40 rounded-2xl p-8 hover:from-indigo-500/30 hover:to-purple-500/30 transition-all duration-300 hover:scale-[1.02] hover:border-indigo-400/60 shadow-xl"
          >
            <div className="absolute top-4 right-4">
              <span className="px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-bold rounded-full shadow-lg">RECOMMANDÉ</span>
            </div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-indigo-500/30">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">SAV Pro V2</h2>
            <p className="text-slate-300 mb-4">Interface moderne pour la gestion complète du SAV.</p>
            <ul className="text-sm text-slate-400 space-y-2">
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Dashboard tickets optimisé
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Assistant IA intégré
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Gestion utilisateurs avancée
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Intégration SAGE 100
              </li>
            </ul>
            <div className="mt-6 flex items-center text-white font-medium bg-gradient-to-r from-indigo-500 to-purple-500 px-4 py-2 rounded-lg w-fit group-hover:shadow-lg group-hover:shadow-indigo-500/30 transition-all">
              Accéder à SAV Pro V2
              <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </div>
          </Link>

          {/* Version SAV Industriel */}
          <Link
            to="/v2"
            className="group bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all duration-300 hover:scale-[1.02]"
          >
            <div className="w-16 h-16 bg-slate-700 rounded-xl flex items-center justify-center mb-6 group-hover:bg-slate-600 transition-colors">
              <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-white mb-3">SAV Industriel</h2>
            <p className="text-slate-400 mb-4">Version spécialisée pour la maintenance industrielle.</p>
            <ul className="text-sm text-slate-500 space-y-2">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-slate-500 rounded-full"></span>
                Gestion équipements & machines
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-slate-500 rounded-full"></span>
                Interventions terrain & planning
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-slate-500 rounded-full"></span>
                Stock pièces détachées
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-slate-500 rounded-full"></span>
                Contrats de maintenance
              </li>
            </ul>
            <div className="mt-6 flex items-center text-slate-400 font-medium">
              Accéder au SAV Industriel
              <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </div>
          </Link>
        </div>

        <div className="text-center mt-10">
          <p className="text-slate-500 text-sm">
            Version 2.0.0 • KLY Groupe © 2024
          </p>
        </div>
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

import React from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Layout
import { AdminLayout } from './components/layout';

// Pages
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';
import { UsersAdminPage } from './components/users';
import { CreateTicket } from './components/tickets';
import { UserRole } from './lib/userManagementTypes';
import { TicketStatus } from './types';

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
            <ProtectedRoute adminOnly>
              <PlaceholderPage title="Paramètres" />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Redirect root to admin */}
      <Route path="/" element={<Navigate to="/admin" replace />} />

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

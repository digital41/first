import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { MainLayout } from '@/components/layout';
import { PageLoading } from '@/components/common';
import {
  LoginPage,
  DashboardPage,
  SmartHomePage,
  TicketsListPage,
  CreateTicketPage,
  TicketDetailPage,
  OrdersListPage,
  OrderDetailPage,
  OrderTicketPage,
  FAQPage,
  KnowledgeBasePage,
  ContactPage,
  ProfilePage,
  NotificationsPage
} from '@/pages';

// Protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <PageLoading />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

// Public route - redirect to dashboard if already authenticated
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <PageLoading />;
  }

  if (isAuthenticated) {
    const from = (location.state as { from?: Location })?.from?.pathname || '/';
    return <Navigate to={from} replace />;
  }

  return <>{children}</>;
}

// App routes
function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />

      {/* Public FAQ and Knowledge base (accessible without login) */}
      <Route path="/faq" element={<MainLayout><FAQPage /></MainLayout>} />
      <Route path="/knowledge" element={<MainLayout><KnowledgeBasePage /></MainLayout>} />
      <Route path="/contact" element={<MainLayout><ContactPage /></MainLayout>} />
      <Route path="/help" element={<Navigate to="/faq" replace />} />

      {/* Protected routes - Dashboard as default */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout>
              <DashboardPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />

      {/* Assistant intelligent (accessible via /assistant) */}
      <Route
        path="/assistant"
        element={
          <ProtectedRoute>
            <MainLayout>
              <SmartHomePage />
            </MainLayout>
          </ProtectedRoute>
        }
      />

      {/* Tickets */}
      <Route
        path="/tickets"
        element={
          <ProtectedRoute>
            <MainLayout>
              <TicketsListPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/tickets/new"
        element={
          <ProtectedRoute>
            <MainLayout>
              <CreateTicketPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/tickets/:id"
        element={
          <ProtectedRoute>
            <MainLayout>
              <TicketDetailPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />

      {/* Orders */}
      <Route
        path="/orders"
        element={
          <ProtectedRoute>
            <MainLayout>
              <OrdersListPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/orders/:id"
        element={
          <ProtectedRoute>
            <MainLayout>
              <OrderDetailPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/orders/:orderNumber/ticket"
        element={
          <ProtectedRoute>
            <MainLayout>
              <OrderTicketPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />

      {/* Notifications */}
      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <MainLayout>
              <NotificationsPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />

      {/* Profile */}
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <MainLayout>
              <ProfilePage />
            </MainLayout>
          </ProtectedRoute>
        }
      />

      {/* Catch all - redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

// Main App component
function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <AppRoutes />
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

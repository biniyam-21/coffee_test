import React, { useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Coffee } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { CartProvider } from './context/CartContext';
import { AdminSidebarProvider, useAdminSidebar } from './context/AdminSidebarContext';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { AdminSidebar } from './components/layout/AdminSidebar';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { CartDrawer } from './features/orders/CartDrawer';
import { MenuPage } from './features/menu/MenuPage';
import { LoginPage } from './features/auth/LoginPage';
import { RegisterPage } from './features/auth/RegisterPage';
import { CheckoutPage } from './features/orders/CheckoutPage';
import { OrderHistoryPage } from './features/orders/OrderHistoryPage';
import { OrderTrackPage } from './features/orders/OrderTrackPage';
import { KitchenQueuePage } from './features/staff/KitchenQueuePage';
import { AdminDashboardPage } from './features/admin/AdminDashboardPage';
import { AdminUsersPage } from './features/admin/AdminUsersPage';
import { PaymentReturnPage } from './features/orders/PaymentReturnPage';
import { RoleType } from './types/api';
import { Button } from './components/ui/Button';

const NotFoundPage: React.FC = () => (
  <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
    <Coffee className="h-12 w-12 text-[#7138E8] mb-4" />
    <h1 className="text-3xl font-extrabold text-slate-900 mb-2">404 - Page Not Found</h1>
    <p className="text-sm text-slate-500 max-w-sm mb-6">
      The page you were looking for doesn&apos;t exist or has been relocated.
    </p>
    <Link to="/">
      <Button variant="primary">Return to Menu</Button>
    </Link>
  </div>
);

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { hasRole } = useAuth();
  const { isOpen, isCollapsed, expandSidebar, openSidebar } = useAdminSidebar();
  const location = useLocation();
  const hasAccess = hasRole(RoleType.ADMIN) || hasRole(RoleType.STAFF);

  // Default sidebar to open & expanded only when a user transitions into admin/staff role (e.g. logs in)
  const prevHasAccessRef = useRef(hasAccess);
  useEffect(() => {
    if (!prevHasAccessRef.current && hasAccess) {
      openSidebar();
      expandSidebar();
    }
    prevHasAccessRef.current = hasAccess;
  }, [hasAccess, openSidebar, expandSidebar]);

  const sidebarMarginClass = hasAccess && isOpen ? (isCollapsed ? 'lg:pl-20' : 'lg:pl-[280px]') : '';

  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  return (
    <div className="flex min-h-screen flex-col bg-[#F8F7FC] text-[#19152A] font-sans antialiased selection:bg-[#7138E8]/20 selection:text-[#21113F]">
      <Navbar />
      <AdminSidebar />
      <main className={`flex-1 transition-all duration-300 ${sidebarMarginClass}`}>{children}</main>
      {!isAuthPage && (
        <div className={`transition-all duration-300 ${sidebarMarginClass}`}>
          <Footer />
        </div>
      )}
      <CartDrawer />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <ToastProvider>
          <AdminSidebarProvider>
            <CartProvider>
              <AppLayout>
              <Routes>
                {/* Public Browsing & Auth Routes */}
                <Route path="/" element={<MenuPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />

                {/* Customer Checkout & Order Tracking (Protected) */}
                <Route
                  path="/checkout"
                  element={
                    <ProtectedRoute>
                      <CheckoutPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/orders"
                  element={
                    <ProtectedRoute>
                      <OrderHistoryPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/payment/return"
                  element={
                    <ProtectedRoute>
                      <PaymentReturnPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/orders/:id/track"
                  element={
                    <ProtectedRoute>
                      <OrderTrackPage />
                    </ProtectedRoute>
                  }
                />

                {/* Staff Kitchen Queue (Staff & Admin) */}
                <Route
                  path="/staff/queue"
                  element={
                    <ProtectedRoute allowedRoles={[RoleType.STAFF, RoleType.ADMIN]}>
                      <KitchenQueuePage />
                    </ProtectedRoute>
                  }
                />

                {/* Administrative Portal (Admin Only) */}
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute allowedRoles={[RoleType.ADMIN]}>
                      <AdminDashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/users"
                  element={
                    <ProtectedRoute allowedRoles={[RoleType.ADMIN]}>
                      <AdminUsersPage />
                    </ProtectedRoute>
                  }
                />

                {/* Catch-all 404 */}
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </AppLayout>
          </CartProvider>
        </AdminSidebarProvider>
      </ToastProvider>
    </AuthProvider>
  </BrowserRouter>
);
};

export default App;

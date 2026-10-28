import React from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { RoleType } from '../../types/api';
import { Button } from '../ui/Button';
import { CoffeeLoadingOverlay } from '../ui/CoffeeLoadingOverlay';

export interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: RoleType[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <CoffeeLoadingOverlay
        fullScreen={false}
        message="Verifying session..."
        subtext="Preparing your artisanal space..."
      />
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const hasPermission = user?.roles.some((role) => allowedRoles.includes(role));
    if (!hasPermission) {
      return (
        <div className="mx-auto max-w-md py-16 px-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 mb-4">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Access Restricted</h2>
          <p className="text-sm text-slate-600 mb-6">
            Your authenticated account ({user?.email}) does not hold the permissions required to
            view this operational portal.
          </p>
          <div className="flex justify-center gap-3">
            <Link to="/">
              <Button variant="primary">Return to Menu</Button>
            </Link>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
};

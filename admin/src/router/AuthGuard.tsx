import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { AppLayout } from '@/components/layout/AppLayout';
import { hasRoleAccess } from './routeConfig';

interface AuthGuardProps {
  children: ReactNode;
  requiresAuth?: boolean;
  allowedRoles?: string[];
  useLayout?: boolean;
}

/**
 * AuthGuard component that handles authentication and role-based access
 * Wraps routes with layout if needed
 */
export const AuthGuard = ({ 
  children, 
  requiresAuth = true,
  allowedRoles,
  useLayout = true 
}: AuthGuardProps) => {
  const { isAuthenticated, user } = useAuthStore();
  const userRole = user?.role;

  // If auth is required but user is not authenticated
  if (requiresAuth && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If auth is not required, render without layout
  if (!requiresAuth) {
    return <>{children}</>;
  }

  // Check role-based access
  if (!hasRoleAccess(userRole, allowedRoles)) {
    return <Navigate to="/login" replace />;
  }

  // Wrap with layout if needed
  if (useLayout) {
    return <AppLayout>{children}</AppLayout>;
  }

  return <>{children}</>;
};


import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { hasRoleAccess } from './routeConfig';

interface RoleGuardProps {
  children: ReactNode;
  allowedRoles?: string[];
}

/**
 * RoleGuard component that only checks role-based access
 * Used for nested routes where authentication and layout are handled by parent
 */
export const RoleGuard = ({ children, allowedRoles }: RoleGuardProps) => {
  const { user } = useAuthStore();
  const userRole = user?.role;

  if (!hasRoleAccess(userRole, allowedRoles)) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};


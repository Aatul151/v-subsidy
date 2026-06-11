import { ReactNode } from 'react';
import { RouteObject, Outlet, Navigate } from 'react-router-dom';
import { Login } from '@/features/auth/Login';
import { Register } from '@/features/auth/Register';
import { Dashboard } from '@/features/dashboard/Dashboard';
import { FormBuilder } from '@/features/form-builder/FormBuilder';
import { Users } from '@/features/admin/users/Users';
import { Roles } from '@/features/admin/roles/Roles';
import { ModulesList } from '@/features/admin/modules/ModulesList';
import { AccessRulesList } from '@/features/admin/accessRules/AccessRulesList';
import { FormEntries } from '@/features/forms/FormEntries';
import { ManageForms } from '@/features/forms/ManageForms';
import { Settings } from '@/features/settings/Settings';
import { LoadingScreen } from '@/components/loading/LoadingScreen';
import { AuthGuard } from './AuthGuard';
import { RoleGuard } from './RoleGuard';

export type RouteConfigItem = {
  path: string;
  element: ReactNode;
  requiresAuth?: boolean;
  allowedRoles?: string[]; // If undefined, all authenticated users can access
  useLayout?: boolean; // Whether to wrap with AppLayout
  children?: RouteConfigItem[]; // For nested routes
};

/**
 * Role hierarchy: superadmin inherits all admin permissions
 */
const ROLE_HIERARCHY: Record<string, string[]> = {
  superadmin: ['admin'], // superadmin inherits all admin permissions
};

/**
 * Check if user has access based on role hierarchy
 */
export const hasRoleAccess = (userRole: string | undefined, allowedRoles?: string[]): boolean => {
  if (!allowedRoles || allowedRoles.length === 0) {
    return true; // No role restriction
  }

  if (!userRole) {
    return false;
  }

  // Check direct role match
  if (allowedRoles.includes(userRole)) {
    return true;
  }

  // Check inherited roles (role hierarchy)
  const inheritedRoles = ROLE_HIERARCHY[userRole] || [];
  return inheritedRoles.some(inheritedRole => allowedRoles.includes(inheritedRole));
};

/**
 * Convert route config to React Router RouteObject
 * @param config - Route configuration
 * @param isNested - Whether this route is nested under a parent AuthGuard
 */
const createRouteElement = (config: RouteConfigItem, isNested = false): RouteObject => {
  const { path, element, requiresAuth, allowedRoles, useLayout, children } = config;

  // If route has children, it's a parent route
  if (children && children.length > 0) {
    return {
      path,
      element: <Outlet />,
      children: children.map(child => createRouteElement(child, isNested)),
    };
  }

  // If nested under parent AuthGuard, only check role and don't wrap with layout again
  if (isNested) {
    // For nested routes, we only need role checking, layout is handled by parent
    return {
      path,
      element: <RoleGuard allowedRoles={allowedRoles}>{element}</RoleGuard>,
    };
  }

  // For standalone routes, wrap with full AuthGuard
  const guardedElement = (
    <AuthGuard
      requiresAuth={requiresAuth}
      allowedRoles={allowedRoles}
      useLayout={useLayout}
    >
      {element}
    </AuthGuard>
  );

  return {
    path,
    element: guardedElement,
  };
};

/**
 * Route configuration array
 * Define all routes here with their authentication and role requirements
 */
export const routesConfig: RouteConfigItem[] = [
  // Public routes (no auth required)
  {
    path: '/login',
    element: <Login />,
    requiresAuth: false,
    useLayout: false,
  },
  {
    path: '/register',
    element: <Register />,
    requiresAuth: false,
    useLayout: false,
  },
  {
    path: '/loading',
    element: <LoadingScreen />,
    requiresAuth: false,
    useLayout: false,
  },
];

/**
 * Protected routes configuration (will be nested under AuthGuard with Layout)
 */
export const protectedRoutesConfig: RouteConfigItem[] = [
  {
    path: '/dashboard',
    element: <Dashboard />,
    requiresAuth: true,
    useLayout: true,
  },
  {
    path: '/form-builder/:formName?',
    element: <FormBuilder />,
    requiresAuth: true,
    useLayout: true,
  },
  {
    path: '/forms/:formName',
    element: <FormEntries />,
    requiresAuth: true,
    useLayout: true,
  },
  {
    path: '/manage-forms',
    element: <ManageForms />,
    requiresAuth: true,
    useLayout: true,
  },
  {
    path: '/admin/settings',
    element: <Settings />,
    requiresAuth: true,
    allowedRoles: ['admin'], // superadmin inherits access via role hierarchy
    useLayout: true,
  },
  // Admin routes (admin and superadmin can access)
  {
    path: '/admin/users',
    element: <Users />,
    requiresAuth: true,
    allowedRoles: ['admin'], // superadmin inherits access via role hierarchy
    useLayout: true,
  },
  {
    path: '/admin/access-rules',
    element: <AccessRulesList />,
    requiresAuth: true,
    allowedRoles: ['admin'], // superadmin inherits access via role hierarchy
    useLayout: true,
  },
  // Super Admin routes (only superadmin can access)
  {
    path: '/admin/roles',
    element: <Roles />,
    requiresAuth: true,
    allowedRoles: ['superadmin'],
    useLayout: true,
  },
  {
    path: '/admin/modules',
    element: <ModulesList />,
    requiresAuth: true,
    allowedRoles: ['superadmin'],
    useLayout: true,
  },
  {
    path: '/admin/:formName',
    element: <FormEntries />,
    requiresAuth: true,
    useLayout: true,
  },
];

/**
 * Build React Router routes from configuration
 */
export const buildRoutes = (): RouteObject[] => {
  const publicRoutes = routesConfig.map(config => createRouteElement(config, false));
  const protectedRoutes = protectedRoutesConfig.map(config => createRouteElement(config, true));

  return [
    ...publicRoutes,
    // Main protected route with layout wrapper
    {
      path: '',
      element: (
        <AuthGuard requiresAuth={true} useLayout={true}>
          <Outlet />
        </AuthGuard>
      ),
      children: protectedRoutes,
    },
    // Catch-all routes
    {
      path: '/',
      element: <Navigate to="/dashboard" replace />,
    },
    {
      path: '*',
      element: <Navigate to="/dashboard" replace />,
    },
  ];
};


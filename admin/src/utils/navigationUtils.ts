/**
 * Determines which sidebar submenus should be open based on the current pathname
 * @param pathname - Current route pathname
 * @returns Object with boolean values for each submenu (admin, 'super admin', forms)
 */
export const getInitialSubmenuState = (pathname: string): Record<string, boolean> => {

  return {
    admin: isAdminPath(pathname),
    'super admin': isSuperAdminPath(pathname),
    forms: isFormsPath(pathname),
  };
};

/**
 * Check if pathname belongs to admin submenu
 * @param pathname - Current route pathname
 * @returns true if pathname is an admin route
 */
const isAdminPath = (pathname: string): boolean => {
  const adminRoutes = [
    '/admin',
    '/manage-forms',
  ];

  return adminRoutes.some(route => pathname.startsWith(route));
};

/**
 * Check if pathname belongs to super admin submenu
 * @param pathname - Current route pathname
 * @param collectionFormPath - Path to collection form
 * @returns true if pathname is a super admin route
 */
const isSuperAdminPath = (pathname: string): boolean => {
  const superAdminRoutes = [
    '/admin/roles',
    '/admin/modules',
    '/admin/collections',
  ];

  return (
    superAdminRoutes.some(route => pathname.startsWith(route))
  );
};

/**
 * Check if pathname belongs to forms submenu
 * @param pathname - Current route pathname
 * @param collectionFormPath - Path to collection form (excluded from forms submenu)
 * @returns true if pathname is a forms route (excluding collection)
 */
const isFormsPath = (pathname: string): boolean => {
  return pathname.startsWith('/forms')
};


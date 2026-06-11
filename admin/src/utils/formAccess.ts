import { FormSchema } from '@/api/forms';
import { FormAccessRule, Role } from '@/api/accessRulesApi';
import { Module } from '@/api/modulesApi';

/** Admin/superadmin bypass for module access (matches backend role hierarchy) */
const hasAdminOrSuperAdminAccess = (userRole: string | undefined): boolean =>
  userRole === 'admin' || userRole === 'superadmin';

/**
 * Check if a user role has read access to a module
 */
export const hasReadAccess = (userRole: string | undefined, accessRule: FormAccessRule | null): boolean => {
  if (!userRole) return false;
  if (!accessRule) return false;
  if (hasAdminOrSuperAdminAccess(userRole)) return true;
  return accessRule.actions.read.includes(userRole as Role);
};

/**
 * Check if a user role has create access to a module
 */
export const hasCreateAccess = (userRole: string | undefined, accessRule: FormAccessRule | null): boolean => {
  if (!userRole) return false;
  if (!accessRule) return false;
  if (hasAdminOrSuperAdminAccess(userRole)) return true;
  return accessRule.actions.create.includes(userRole as Role);
};

/**
 * Check if a user role has update access to a module
 */
export const hasUpdateAccess = (userRole: string | undefined, accessRule: FormAccessRule | null): boolean => {
  if (!userRole) return false;
  if (!accessRule) return false;
  if (hasAdminOrSuperAdminAccess(userRole)) return true;
  return accessRule.actions.update.includes(userRole as Role);
};

/**
 * Check if a user role has delete access to a module
 */
export const hasDeleteAccess = (userRole: string | undefined, accessRule: FormAccessRule | null): boolean => {
  if (!userRole) return false;
  if (!accessRule) return false;
  if (hasAdminOrSuperAdminAccess(userRole)) return true;
  return accessRule.actions.delete.includes(userRole as Role);
};

/**
 * Get module name from module object (can be string or object)
 */
export const getModuleName = (module: string | { _id: string; name: string } | undefined): string => {
  if (!module) return '';
  if (typeof module === 'string') return module;
  return module.name || module._id || '';
};

/**
 * Get module ID from module object (can be string or object)
 */
export const getModuleId = (module: string | { _id: string; name: string } | undefined): string => {
  if (!module) return '';
  if (typeof module === 'string') return module;
  return module._id || module.name || '';
};

/**
 * Filter forms based on user role and access rules
 */
export const filterFormsByAccess = (
  forms: FormSchema[],
  accessRules: FormAccessRule[],
  userRole: string | undefined
): FormSchema[] => {
  if (!userRole) return [];
  if (userRole === 'admin' || userRole === 'superadmin') return forms; // Admin sees all forms

  return forms.filter((form) => {
    if (!form.module) return false;
    
    if (form.settings && form.settings.isPublic === true) {
      return true;
    }

    const moduleId = getModuleId(form.module);
    const moduleName = getModuleName(form.module);
    
    // Find access rule for this module
    const accessRule = accessRules.find((rule) => {
      const ruleModuleId = getModuleId(rule.module);
      const ruleModuleName = getModuleName(rule.module);
      return ruleModuleId === moduleId || ruleModuleName === moduleName || 
             ruleModuleId === moduleName || ruleModuleName === moduleId;
    });

    if (!accessRule) return false;
    
    // Check if user role has read access
    return hasReadAccess(userRole, accessRule);
  });
};

/**
 * Get allowed modules for a user role
 */
export const getAllowedModules = (
  modules: Module[],
  accessRules: FormAccessRule[],
  userRole: string | undefined
): Module[] => {
  if (!userRole) return [];
  if (hasAdminOrSuperAdminAccess(userRole)) return modules; // Admin/superadmin see all modules

  const allowedModuleIds = new Set<string>();
  
  accessRules.forEach((rule) => {
    if (hasReadAccess(userRole, rule)) {
      const moduleId = getModuleId(rule.module);
      const moduleName = getModuleName(rule.module);
      if (moduleId) allowedModuleIds.add(moduleId);
      if (moduleName) allowedModuleIds.add(moduleName);
    }
  });

  return modules.filter((module) => 
    allowedModuleIds.has(module._id) || allowedModuleIds.has(module.name)
  );
};

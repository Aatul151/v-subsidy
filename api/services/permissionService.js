/**
 * Central permission service – all permission-related logic in one place.
 * Use this for role checks, module access, and form-definition access.
 */

import FormAccessRules from '../models/FormAccessRules.js';
import Module from '../models/Module.js';
import logger from '../config/logger.js';
import { ADMIN_ROLES, isAdmin } from '../config/roles.js';

// Re-export role config so callers can import permission helpers from one place
export { ADMIN_ROLES, isAdmin };

/** Valid CRUD actions for module/form access */
export const VALID_ACTIONS = ['create', 'read', 'update', 'delete'];

/**
 * Validate that action is one of VALID_ACTIONS
 * @param {string} action
 * @returns {boolean}
 */
export const isValidAction = (action) => VALID_ACTIONS.includes(action);

/**
 * Get access rule for a module by ID or name
 * @param {string|import('mongoose').Types.ObjectId} moduleIdOrName
 * @returns {Promise<import('../models/FormAccessRules.js').default|null>}
 */
export const getModuleAccessRule = async (moduleIdOrName) => {
  let moduleDoc;
  if (typeof moduleIdOrName === 'string' && moduleIdOrName.length === 24) {
    moduleDoc = await Module.findById(moduleIdOrName);
  } else {
    moduleDoc = await Module.findOne({ name: String(moduleIdOrName).toLowerCase() });
  }
  if (!moduleDoc) return null;
  return FormAccessRules.findOne({ module: moduleDoc._id }).populate('module');
};

/**
 * Check if user role is allowed for the given action according to access rule
 * @param {string} userRole
 * @param {Object} accessRule - FormAccessRules document
 * @param {string} action - one of VALID_ACTIONS
 * @returns {boolean}
 */
export const isRoleAllowedForAction = (userRole, accessRule, action) => {
  if (!accessRule || !userRole) return false;
  if (!accessRule.rolesAllowed.includes(userRole)) return false;
  const allowedRoles = accessRule.actions[action] || [];
  return allowedRoles.includes(userRole);
};

/**
 * Check module access by module name (for middleware / programmatic use).
 * Does not handle public form or guest rules – use validateModuleAccess for form-based checks.
 * @param {string} moduleName
 * @param {string} userRole
 * @param {string} action - one of VALID_ACTIONS
 * @returns {Promise<{allowed: boolean, message?: string}>}
 */
export const checkModuleAccessByModuleName = async (moduleName, userRole, action) => {
  if (!isValidAction(action)) {
    return { allowed: false, message: `Invalid action: ${action}. Must be one of: ${VALID_ACTIONS.join(', ')}` };
  }
  const module = await Module.findOne({ name: moduleName.toLowerCase() });
  if (!module) {
    return { allowed: false, message: `Module "${moduleName}" not found` };
  }
  const accessRule = await FormAccessRules.findOne({ module: module._id }).populate('module');
  if (!accessRule) {
    return { allowed: false, message: `No access rules defined for module "${moduleName}"` };
  }
  if (!accessRule.rolesAllowed.includes(userRole)) {
    return { allowed: false, message: 'You do not have permission to access this module' };
  }
  const allowedRoles = accessRule.actions[action] || [];
  if (!allowedRoles.includes(userRole)) {
    return { allowed: false, message: `You do not have permission to ${action} entries in this module` };
  }
  return { allowed: true };
};

/**
 * Validate module access for a form (used by form entries, file upload, etc.).
 * Handles public forms, guest restrictions, and module access rules.
 *
 * @param {string} userRole - The user's role
 * @param {Object} form - Form definition with module (populated or id), settings, formType
 * @param {string} action - 'create' | 'read' | 'update' | 'delete'
 * @returns {Promise<{allowed: boolean, message?: string}>}
 */
export const validateModuleAccess = async (userRole, form, action) => {
  if (!isValidAction(action)) {
    return { allowed: false, message: `Invalid action: ${action}` };
  }
  if (!form || typeof form !== 'object') {
    return { allowed: false, message: 'Form definition object is required' };
  }

  if (form.settings && form.settings.isPublic === true) {
    return { allowed: true };
  }

  if (userRole === 'guest') {
    if (action !== 'read') {
      return {
        allowed: false,
        message: 'Guest users can only read data. Create, update, and delete operations are not allowed.',
      };
    }
    if (form.formType === 'system') {
      return { allowed: false, message: 'Guest users can only access custom forms, not system forms.' };
    }
    return { allowed: true };
  }

  if (!form.module) {
    return { allowed: false, message: 'Form definition has no associated module' };
  }

  let moduleName;
  if (typeof form.module === 'object' && form.module.name) {
    moduleName = form.module.name;
  } else {
    const moduleDoc = await Module.findById(form.module);
    if (!moduleDoc) {
      return { allowed: false, message: 'Form definition module not found' };
    }
    moduleName = moduleDoc.name;
  }

  const result = await checkModuleAccessByModuleName(moduleName, userRole, action);
  if (!result.allowed) {
    return result;
  }
  return { allowed: true };
};

/**
 * Check if a user can access a form definition (read). Used when listing or fetching form definitions.
 * Non-admin users can access if: form is public, they created it, or they have module/read access.
 *
 * @param {Object} user - { role, _id }
 * @param {Object} formDefinition - Form definition with module, createdBy, settings, formType
 * @returns {Promise<boolean>}
 */
export const canUserAccessFormDefinition = async (user, formDefinition) => {
  if (isAdmin(user.role)) return true;

  if (user.role === 'guest') {
    if (formDefinition.formType === 'system') return false;
    return true;
  }

  if (formDefinition.settings && formDefinition.settings.isPublic === true) return true;

  if (
    formDefinition.createdBy &&
    formDefinition.createdBy.toString() === user._id.toString()
  ) {
    return true;
  }

  if (!formDefinition.module) return false;

  let moduleId;
  if (typeof formDefinition.module === 'object' && formDefinition.module._id) {
    moduleId = formDefinition.module._id;
  } else {
    moduleId = formDefinition.module;
  }

  const accessRule = await FormAccessRules.findOne({ module: moduleId });
  if (!accessRule) return false;

  if (accessRule.rolesAllowed.includes(user.role)) return true;
  if (accessRule.actions.read && accessRule.actions.read.includes(user.role)) return true;

  return false;
};

/**
 * Express middleware: check form/module access by module name.
 * Use when the route is keyed by module name (e.g. /entries/student).
 *
 * @param {string} moduleName - e.g. 'student', 'fees'
 * @param {string} action - 'create' | 'read' | 'update' | 'delete'
 * @returns {Function} Express middleware
 */
export const checkFormAccessMiddleware = (moduleName, action) => {
  return async (req, res, next) => {
    try {
      if (!isValidAction(action)) {
        return res.status(400).json({
          success: false,
          message: `Invalid action: ${action}. Must be one of: ${VALID_ACTIONS.join(', ')}`,
        });
      }
      if (!req.user || !req.user.role) {
        logger.warn('Access check failed: User not authenticated');
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      const result = await checkModuleAccessByModuleName(moduleName, req.user.role, action);
      if (!result.allowed) {
        logger.warn(
          `Access denied: ${req.user.role} for "${action}" on module "${moduleName}" - ${result.message}`
        );
        return res.status(403).json({
          success: false,
          message: result.message,
        });
      }
      logger.debug(`Access granted: ${req.user.role} for "${action}" on module "${moduleName}"`);
      next();
    } catch (error) {
      logger.error('Error checking form access:', {
        error: error.message,
        stack: error.stack,
        module: moduleName,
        action,
      });
      res.status(500).json({
        success: false,
        message: 'Error checking access permissions',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  };
};

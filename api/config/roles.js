import { DEFAULT_ROLES, SYSTEM_ROLES } from "./defaultdata.js";

/**
 * System Roles Configuration
 * 
 * Central definition of all user roles in the system.
 * Used for access control and permission validation.
 */
export const SYSTEM_ROLE_NAMES = SYSTEM_ROLES.map(role => role.name)?.concat(DEFAULT_ROLES.map(role => role.name));

/**
 * Admin Roles Array
 * 
 * Roles that have admin privileges.
 * Update this array to add more admin roles in the future.
 */
export const ADMIN_ROLES = ['admin', 'superadmin'];

/**
 * Check if a role is valid
 * @param {string} role - Role to validate
 * @returns {boolean} - True if role is valid
 */
export const isValidRole = (role) => {
  return SYSTEM_ROLE_NAMES.includes(role);
};

/**
 * Check if user has admin role
 * @param {string} role - User role
 * @returns {boolean} - True if user is admin
 */
export const isAdmin = (role) => {
  return ADMIN_ROLES.includes(role);
};

export default SYSTEM_ROLE_NAMES;


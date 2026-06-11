import FormAccessRules from '../models/FormAccessRules.js';
import Module from '../models/Module.js';
import logger from '../config/logger.js';
import mongoose from 'mongoose';

/**
 * Initialize default access rules for a new module
 * 
 * Creates a default access rule that only allows admin access
 * to all actions for the specified module.
 * 
 * @param {string|ObjectId} moduleIdOrName - The module ID or name to create rules for
 * @returns {Promise<Object>} - The created or existing access rule
 * 
 * @example
 * await initDefaultModuleAccess(moduleId);
 * await initDefaultModuleAccess("student"); // Will find module by name
 */
export const initDefaultModuleAccess = async (moduleIdOrName) => {
  try {
    let module;
    // Check if it's an ObjectId or string
    if (typeof moduleIdOrName === 'string' && moduleIdOrName.length === 24) {
      // Likely an ObjectId
      module = await Module.findById(new mongoose.Types.ObjectId(moduleIdOrName));
    } else {
      // Assume it's a module name
      module = await Module.findOne({ name: moduleIdOrName?.toString()?.toLowerCase() });
    }

    if (!module) {
      throw new Error(`Module not found: ${moduleIdOrName}`);
    }

    // Check if rule already exists
    const existingRule = await FormAccessRules.findOne({ module: module._id });

    if (existingRule) {
      logger.debug(`Access rule already exists for module: ${module.name}`);
      return existingRule;
    }

    // Create default rule with admin-only access
    const defaultRule = await FormAccessRules.create({
      module: module._id,
      rolesAllowed: ['superadmin', 'admin'],
      actions: {
        create: ['superadmin', 'admin'],
        read: ['superadmin', 'admin'],
        update: ['superadmin', 'admin'],
        delete: ['superadmin', 'admin'],
      },
    });

    logger.info(`Default access rule created for module: ${module.name}`);
    return defaultRule;
  } catch (error) {
    console.log(error);
    logger.error(`Error initializing default module access for ${moduleIdOrName}:`, {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

export default initDefaultModuleAccess;


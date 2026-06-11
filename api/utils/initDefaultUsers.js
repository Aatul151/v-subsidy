import mongoose from 'mongoose';
import User from '../models/User.js';
import Module from '../models/Module.js';
import Role from '../models/Role.js';
import logger from '../config/logger.js';
import { initDefaultModuleAccess } from './initDefaultModuleAccess.js';
import { DEFAULT_MODULES, DEFAULT_ROLES, SYSTEM_MODULES, SYSTEM_ROLES } from '../config/defaultdata.js';

/**
 * Initialize default system users
 * 
 * Creates default superadmin and admin users if they don't exist.
 * This should be called once when the application starts.
 */
export const initDefaultUsers = async () => {
  try {
    // Default superadmin user
    const superadminEmail = 'spdmin@gmail.com';
    const superadminData = {
      name: 'System',
      email: superadminEmail,
      password: 'spadminPassword123#',
      role: 'superadmin',
      isActive: true,
    };

    // Default admin user
    const adminEmail = 'admin@gmail.com';
    const adminData = {
      name: 'Admin',
      email: adminEmail,
      password: 'adminPassword123#',
      role: 'admin',
      isActive: true,
    };

    // Default guest user
    const guestEmail = 'guest@gmail.com';
    const guestData = {
      name: 'Guest User',
      email: guestEmail,
      password: 'guestPassword123#', // Password not used for guest login
      role: 'guest',
      isActive: true,
    };

    let superadminCreated = false;
    let adminCreated = false;
    let guestCreated = false;

    // Check and create superadmin user
    const existingSuperadmin = await User.findOne({ email: superadminEmail });
    if (!existingSuperadmin) {
      await User.create(superadminData);
      superadminCreated = true;
      logger.info(`Default superadmin user created: ${superadminEmail}`);
    } else {
      logger.debug(`Superadmin user already exists: ${superadminEmail}`);
    }

    // Check and create admin user
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (!existingAdmin) {
      await User.create(adminData);
      adminCreated = true;
      logger.info(`Default admin user created: ${adminEmail}`);
    } else {
      logger.debug(`Admin user already exists: ${adminEmail}`);
    }

    // Check and create guest user
    const existingGuest = await User.findOne({ email: guestEmail });
    if (!existingGuest) {
      await User.create(guestData);
      guestCreated = true;
      logger.info(`Default guest user created: ${guestEmail}`);
    } else {
      logger.debug(`Guest user already exists: ${guestEmail}`);
    }

    if (superadminCreated || adminCreated || guestCreated) {
      logger.info('Default users initialization completed');
    } else {
      logger.debug('Default users already exist, skipping creation');
    }

    // Get superadmin user for createdBy field in modules
    const superadminUser = await User.findOne({ email: superadminEmail });
    if (!superadminUser) {
      throw new Error('Superadmin user not found after creation');
    }

    // Initialize default roles
    const rolesResult = await initDefaultRoles();

    // Initialize default modules
    const modulesResult = await initDefaultModules(superadminUser._id);

    return {
      superadminCreated,
      adminCreated,
      guestCreated,
      ...rolesResult,
      ...modulesResult,
    };
  } catch (error) {
    logger.error('Error initializing default users:', {
      error: error.message,
      stack: error.stack,
    });
    // Don't throw error - allow application to continue even if initialization fails
    return {
      superadminCreated: false,
      adminCreated: false,
      guestCreated: false,
      error: error.message,
    };
  }
};

/**
 * Initialize default system roles
 * 
 * Creates default roles with fixed IDs if they don't exist.
 * 
 * @returns {Promise<Object>} - Result object with creation status
 */
export const initDefaultRoles = async () => {
  try {

    const allRoles = [...SYSTEM_ROLES, ...DEFAULT_ROLES];
    const results = {
      superadminRoleCreated: false,
      adminRoleCreated: false,
      userRoleCreated: false,
      guestRoleCreated: false,
    };

    for (const roleData of allRoles) {
      // Check if role already exists
      const existingRole = await Role.findById(roleData._id);

      if (!existingRole) {
        // Create role with fixed ID
        await Role.create(roleData);
        logger.info(`Default role created: ${roleData.name} (ID: ${roleData._id})`);

        if (roleData.name === 'superadmin') {
          results.superadminRoleCreated = true;
        } else if (roleData.name === 'admin') {
          results.adminRoleCreated = true;
        } else if (roleData.name === 'user') {
          results.userRoleCreated = true;
        } else if (roleData.name === 'guest') {
          results.guestRoleCreated = true;
        }
      } else {
        logger.debug(`Role already exists: ${roleData.name} (ID: ${roleData._id})`);
      }
    }

    return results;
  } catch (error) {
    logger.error('Error initializing default roles:', {
      error: error.message,
      stack: error.stack,
    });
    // Don't throw error - allow application to continue even if initialization fails
    return {
      superadminRoleCreated: false,
      adminRoleCreated: false,
      userRoleCreated: false,
      error: error.message,
    };
  }
};

/**
 * Initialize default system modules
 * 
 * Creates default modules with fixed IDs if they don't exist.
 * Also initializes default access rules for each module.
 * 
 * @param {ObjectId} createdByUserId - The user ID to set as createdBy for modules
 * @returns {Promise<Object>} - Result object with creation status
 */
export const initDefaultModules = async (createdByUserId) => {
  try {

    const allModules = [...SYSTEM_MODULES, ...DEFAULT_MODULES];

    const results = {
      defaultModuleCreated: false,
      settingsModuleCreated: false,
      defaultModuleAccessInitialized: false,
      settingsModuleAccessInitialized: false,
    };

    for (const moduleData of allModules) {
      // Check if module already exists
      const existingModule = await Module.findById(moduleData._id);

      if (!existingModule) {
        // Create module with fixed ID
        const newModule = await Module.create({
          ...moduleData,
          createdBy: createdByUserId,
        });
        logger.info(`Default module created: ${moduleData.name} (ID: ${moduleData._id})`);

        if (moduleData.name === 'default') {
          results.defaultModuleCreated = true;
        } else if (moduleData.name === 'settings') {
          results.settingsModuleCreated = true;
        }

        // Initialize default access rules for the module
        try {
          await initDefaultModuleAccess(newModule?._id?.toString());
          logger.info(`Default access rules initialized for module: ${moduleData.name}`);

          if (moduleData.name === 'default') {
            results.defaultModuleAccessInitialized = true;
          } else if (moduleData.name === 'settings') {
            results.settingsModuleAccessInitialized = true;
          }
        } catch (accessError) {
          logger.error(`Error initializing access rules for module ${moduleData.name}:`, {
            error: accessError.message,
            stack: accessError.stack,
          });
        }
      } else {
        logger.debug(`Module already exists: ${moduleData.name} (ID: ${moduleData._id})`);

        // Check if access rules exist, if not, initialize them
        try {
          await initDefaultModuleAccess(existingModule?._id?.toString());
          if (moduleData.name === 'default') {
            results.defaultModuleAccessInitialized = true;
          } else if (moduleData.name === 'settings') {
            results.settingsModuleAccessInitialized = true;
          }
        } catch (accessError) {
          logger.error(`Error initializing access rules for module ${moduleData.name}:`, {
            error: accessError.message,
            stack: accessError.stack,
          });
        }
      }
    }

    return results;
  } catch (error) {
    logger.error('Error initializing default modules:', {
      error: error.message,
      stack: error.stack,
    });
    // Don't throw error - allow application to continue even if initialization fails
    return {
      defaultModuleCreated: false,
      settingsModuleCreated: false,
      defaultModuleAccessInitialized: false,
      settingsModuleAccessInitialized: false,
      error: error.message,
    };
  }
};

export default initDefaultUsers;


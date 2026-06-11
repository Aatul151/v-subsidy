import FormAccessRules from '../models/FormAccessRules.js';
import Module from '../models/Module.js';
import { SYSTEM_ROLE_NAMES } from '../config/roles.js';
import logger from '../config/logger.js';

/**
 * @desc    Create a new form access rule
 * @route   POST /api/form-access-rules
 * @access  Admin only
 */
export const createAccessRule = async (req, res) => {
  try {
    const { module: moduleIdOrName, rolesAllowed, actions } = req.body;

    // Validation
    if (!moduleIdOrName) {
      return res.status(400).json({
        success: false,
        message: 'Module ID or name is required',
      });
    }

    // Find module by ID or name
    let module;
    if (typeof moduleIdOrName === 'string' && moduleIdOrName.length === 24) {
      // Likely an ObjectId
      module = await Module.findById(moduleIdOrName);
    } else {
      // Assume it's a module name
      module = await Module.findOne({ name: moduleIdOrName.toLowerCase() });
    }

    if (!module) {
      return res.status(404).json({
        success: false,
        message: `Module not found: ${moduleIdOrName}`,
      });
    }

    if (!rolesAllowed || !Array.isArray(rolesAllowed) || rolesAllowed.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one role must be allowed',
      });
    }

    // Validate all roles are valid
    const invalidRoles = rolesAllowed.filter((role) => !SYSTEM_ROLE_NAMES.includes(role));
    if (invalidRoles.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid roles: ${invalidRoles.join(', ')}`,
      });
    }

    // Check if rule already exists
    const existingRule = await FormAccessRules.findOne({ module: module._id });
    if (existingRule) {
      return res.status(400).json({
        success: false,
        message: `Access rule already exists for module: ${module.name}`,
      });
    }

    // Validate actions if provided
    if (actions) {
      const validActions = ['create', 'read', 'update', 'delete'];
      for (const [action, roles] of Object.entries(actions)) {
        if (!validActions.includes(action)) {
          return res.status(400).json({
            success: false,
            message: `Invalid action: ${action}`,
          });
        }
        if (Array.isArray(roles)) {
          const invalidActionRoles = roles.filter((role) => !SYSTEM_ROLE_NAMES.includes(role));
          if (invalidActionRoles.length > 0) {
            return res.status(400).json({
              success: false,
              message: `Invalid roles for action ${action}: ${invalidActionRoles.join(', ')}`,
            });
          }
        }
      }
    }

    // Create access rule
    const accessRule = await FormAccessRules.create({
      module: module._id,
      rolesAllowed,
      actions: actions || {
        create: [],
        read: [],
        update: [],
        delete: [],
      },
    });

    logger.info(`Form access rule created for module: ${module.name}`);

    res.status(201).json({
      success: true,
      data: accessRule,
    });
  } catch (error) {
    logger.error('Create access rule error:', {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * @desc    Update form access rule
 * @route   PUT /api/form-access-rules/:module
 * @access  Admin only
 */
export const updateAccessRule = async (req, res) => {
  try {
    const { module: moduleIdOrName } = req.params;
    const { rolesAllowed, actions } = req.body;

    // Find module by ID or name
    let module;
    if (typeof moduleIdOrName === 'string' && moduleIdOrName.length === 24) {
      module = await Module.findById(moduleIdOrName);
    } else {
      module = await Module.findOne({ name: moduleIdOrName.toLowerCase() });
    }

    if (!module) {
      return res.status(404).json({
        success: false,
        message: `Module not found: ${moduleIdOrName}`,
      });
    }

    // Find existing rule
    const accessRule = await FormAccessRules.findOne({ module: module._id });

    if (!accessRule) {
      return res.status(404).json({
        success: false,
        message: `Access rule not found for module: ${module}`,
      });
    }

    // Validate rolesAllowed if provided
    if (rolesAllowed !== undefined) {
      if (!Array.isArray(rolesAllowed) || rolesAllowed.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'At least one role must be allowed',
        });
      }

      const invalidRoles = rolesAllowed.filter((role) => !SYSTEM_ROLE_NAMES.includes(role));
      if (invalidRoles.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid roles: ${invalidRoles.join(', ')}`,
        });
      }

      accessRule.rolesAllowed = rolesAllowed;
    }

    // Validate and update actions if provided
    if (actions) {
      const validActions = ['create', 'read', 'update', 'delete'];
      for (const [action, roles] of Object.entries(actions)) {
        if (!validActions.includes(action)) {
          return res.status(400).json({
            success: false,
            message: `Invalid action: ${action}`,
          });
        }
        if (Array.isArray(roles)) {
          const invalidActionRoles = roles.filter((role) => !SYSTEM_ROLE_NAMES.includes(role));
          if (invalidActionRoles.length > 0) {
            return res.status(400).json({
              success: false,
              message: `Invalid roles for action ${action}: ${invalidActionRoles.join(', ')}`,
            });
          }
          accessRule.actions[action] = roles;
        }
      }
    }

    // Save updated rule
    await accessRule.save();

    logger.info(`Form access rule updated for module: ${module.name}`);

    res.status(200).json({
      success: true,
      data: accessRule,
    });
  } catch (error) {
    logger.error('Update access rule error:', {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * @desc    Delete form access rule
 * @route   DELETE /api/form-access-rules/:module
 * @access  Admin only
 */
export const deleteAccessRule = async (req, res) => {
  try {
    const { module: moduleIdOrName } = req.params;

    // Find module by ID or name
    let module;
    if (typeof moduleIdOrName === 'string' && moduleIdOrName.length === 24) {
      module = await Module.findById(moduleIdOrName);
    } else {
      module = await Module.findOne({ name: moduleIdOrName.toLowerCase() });
    }

    if (!module) {
      return res.status(404).json({
        success: false,
        message: `Module not found: ${moduleIdOrName}`,
      });
    }

    const accessRule = await FormAccessRules.findOneAndDelete({ module: module._id });

    if (!accessRule) {
      return res.status(404).json({
        success: false,
        message: `Access rule not found for module: ${module.name}`,
      });
    }

    logger.info(`Form access rule deleted for module: ${module.name}`);

    res.status(200).json({
      success: true,
      message: 'Access rule deleted successfully',
      data: {},
    });
  } catch (error) {
    logger.error('Delete access rule error:', {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * @desc    Get all form access rules
 * @route   GET /api/form-access-rules
 * @access  Admin only
 */
export const getAccessRules = async (req, res) => {
  try {
    const accessRules = await FormAccessRules.find()
      .populate('module', 'name description isActive')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: accessRules.length,
      data: accessRules,
    });
  } catch (error) {
    logger.error('Get access rules error:', {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * @desc    Get access rule for a specific module
 * @route   GET /api/form-access-rules/:module
 * @access  Admin only
 */
export const getModuleAccessRule = async (req, res) => {
  try {
    const { module: moduleIdOrName } = req.params;

    // Find module by ID or name
    let module;
    if (typeof moduleIdOrName === 'string' && moduleIdOrName.length === 24) {
      module = await Module.findById(moduleIdOrName);
    } else {
      module = await Module.findOne({ name: moduleIdOrName.toLowerCase() });
    }

    if (!module) {
      return res.status(404).json({
        success: false,
        message: `Module not found: ${moduleIdOrName}`,
      });
    }

    const accessRule = await FormAccessRules.findOne({ module: module._id })
      .populate('module', 'name description isActive');

    if (!accessRule) {
      return res.status(404).json({
        success: false,
        message: `Access rule not found for module: ${module}`,
      });
    }

    res.status(200).json({
      success: true,
      data: accessRule,
    });
  } catch (error) {
    logger.error('Get module access rule error:', {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};



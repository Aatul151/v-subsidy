import Module from '../models/Module.js';
import FormAccessRules from '../models/FormAccessRules.js';
import { initDefaultModuleAccess } from '../utils/initDefaultModuleAccess.js';
import logger from '../config/logger.js';

/**
 * @desc    Create a new module
 * @route   POST /api/modules
 * @access  Admin only
 * 
 * @example
 * // Request body:
 * {
 *   "name": "student",
 *   "description": "Module for managing student records",
 *   "isActive": true
 * }
 */
export const createModule = async (req, res) => {
  try {
    const { name, description, icon, isActive, isDefault } = req.body;

    // Validation
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Name is required',
      });
    }

    // Check if module with same name already exists
    const existingModule = await Module.findOne({ name: name.toLowerCase() });
    if (existingModule) {
      return res.status(400).json({
        success: false,
        message: `Module with name "${name}" already exists`,
      });
    }

    // Create module
    const module = await Module.create({
      name: name.toLowerCase(),
      description,
      icon,
      isActive: isActive !== undefined ? isActive : true,
      isDefault: isDefault !== undefined ? isDefault : false,
      createdBy: req.user._id,
      updatedBy: req.user._id,
    });

    // Auto-create default access rules for the module
    try {
      await initDefaultModuleAccess(module?._id?.toString());
      logger.info(`Default access rules created for module: ${module.name}`);
    } catch (error) {
      logger.warn(`Failed to create default access rules for module ${module.name}:`, error.message);
      // Don't fail the module creation if access rule creation fails
    }

    logger.info(`Module created: ${module._id} - ${module.name}`);

    res.status(201).json({
      success: true,
      data: module,
    });
  } catch (error) {
    logger.error('Create module error:', {
      error: error.message,
      stack: error.stack,
    });

    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: `Module with name "${req.body.name}" already exists`,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * @desc    Get all modules
 * @route   GET /api/modules
 * @access  Admin only
 */
export const getModules = async (req, res) => {
  try {
    const { isActive } = req.query;

    // Build query
    const query = {};
    if (typeof isActive === 'string') {
      query.isActive = isActive === 'true';
    }
    const modules = await Module.find(query)
      .populate('createdBy', 'name email role')
      .populate('updatedBy', 'name email role')
      .sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: modules.length,
      data: modules,
    });
  } catch (error) {
    logger.error('Get modules error:', {
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
 * @desc    Get module by ID
 * @route   GET /api/modules/:id
 * @access  Admin only
 */
export const getModule = async (req, res) => {
  try {
    const { id } = req.params;

    const module = await Module.findById(id)
      .populate('createdBy', 'name email role')
      .populate('updatedBy', 'name email role');

    if (!module) {
      return res.status(404).json({
        success: false,
        message: 'Module not found',
      });
    }

    res.status(200).json({
      success: true,
      data: module,
    });
  } catch (error) {
    logger.error('Get module error:', {
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
 * @desc    Get module by name
 * @route   GET /api/modules/name/:name
 * @access  Admin only
 */
export const getModuleByName = async (req, res) => {
  try {
    const { name } = req.params;

    const module = await Module.findOne({ name: name.toLowerCase() })
      .populate('createdBy', 'name email role')
      .populate('updatedBy', 'name email role');

    if (!module) {
      return res.status(404).json({
        success: false,
        message: `Module with name "${name}" not found`,
      });
    }

    res.status(200).json({
      success: true,
      data: module,
    });
  } catch (error) {
    logger.error('Get module by name error:', {
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
 * @desc    Update module
 * @route   PUT /api/modules/:id
 * @access  Admin only
 */
export const updateModule = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, icon, isActive, isDefault } = req.body;

    // Find module
    const module = await Module.findById(id);

    if (!module) {
      return res.status(404).json({
        success: false,
        message: 'Module not found',
      });
    }

    // Check for duplicate name if being updated
    if (name) {
      const duplicate = await Module.findOne({
        _id: { $ne: id },
        name: name.toLowerCase(),
      });

      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: 'Module with this name already exists',
        });
      }
    }

    // Update fields
    if (name !== undefined) module.name = name.toLowerCase();
    if (description !== undefined) module.description = description;
    if (icon !== undefined) module.icon = icon;
    if (isActive !== undefined) module.isActive = isActive;
    if (isDefault !== undefined) module.isDefault = isDefault;
    module.updatedBy = req.user._id;

    // Save updated module
    await module.save();

    logger.info(`Module updated: ${module._id} - ${module.name}`);

    res.status(200).json({
      success: true,
      data: module,
    });
  } catch (error) {
    logger.error('Update module error:', {
      error: error.message,
      stack: error.stack,
    });

    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Module with this name already exists',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * @desc    Delete module
 * @route   DELETE /api/modules/:id
 * @access  Admin only
 */
export const deleteModule = async (req, res) => {
  try {
    const { id } = req.params;

    // Find module first to get its ID for deleting access rules
    const module = await Module.findById(id);

    if (!module) {
      return res.status(404).json({
        success: false,
        message: 'Module not found',
      });
    }

    // Prevent deletion if module is marked as default
    if (module.isDefault) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete default module',
      });
    }

    // Delete associated access rules
    const accessRule = await FormAccessRules.deleteMany({ module: module._id });
    if (accessRule?.deletedCount > 0) {
      logger.info(`Access rule deleted for module: ${module.name}`);
    }

    // Delete the module
    await Module.findByIdAndDelete(id);

    logger.info(`Module deleted: ${id} - ${module.name}`);

    res.status(200).json({
      success: true,
      message: 'Module and associated access rules deleted successfully',
      data: {},
    });
  } catch (error) {
    logger.error('Delete module error:', {
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


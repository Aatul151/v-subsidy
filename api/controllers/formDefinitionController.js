import mongoose from 'mongoose';
import FormDefinition from '../models/FormDefinition.js';
import Module from '../models/Module.js';
import FormAccessRules from '../models/FormAccessRules.js';
import { initDefaultModuleAccess } from '../utils/initDefaultModuleAccess.js';
import logger from '../config/logger.js';
import { isAdmin, canUserAccessFormDefinition } from '../services/permissionService.js';
import { validateModuleName } from '../helpers/validateModuleName.js';
import { getFormEntryModel } from '../helpers/formEntryModelFactory.js';

/**
 * @desc    Create a new form definition (module)
 * @route   POST /api/form-definitions
 * @access  Admin only
 * 
 * @example
 * // Request body:
 * {
 *   "title": "Student Admission Form",
 *   "name": "admission2025",
 *   "module": "student",
 *   "sections": [
 *     {
 *       "sectionTitle": "Personal Information",
 *       "fields": [...]
 *     }
 *   ],
 *   "settings": {
 *     "allowMultipleSubmissions": true,
 *     "requireApproval": false
 *   }
 * }
 */
export const createFormDefinition = async (req, res) => {
  try {
    // Only admin can create form definitions
    if (!isAdmin(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Only admin can create form definitions',
      });
    }

    const { title, name, module: moduleIdOrName, sections, formType, collectionName, settings, _id } = req.body;

    // Validation
    if (!title || !name || !moduleIdOrName) {
      return res.status(400).json({
        success: false,
        message: 'Title, name, and module are required',
      });
    }

    // Validate _id if provided
    let customId = null;
    if (_id) {
      if (!mongoose.Types.ObjectId.isValid(_id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid _id format. Must be a valid MongoDB ObjectId',
        });
      }
      
      // Check if form definition with this _id already exists
      const existingFormById = await FormDefinition.findById(_id);
      if (existingFormById) {
        return res.status(400).json({
          success: false,
          message: `Form definition with _id "${_id}" already exists`,
        });
      }
      
      customId = new mongoose.Types.ObjectId(_id);
    }

    // Check if creating system form - only admin allowed
    if (formType === 'system' && !isAdmin(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only admin can create system forms',
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

    // Validate collectionName format if provided
    if (collectionName && !validateModuleName(collectionName)) {
      return res.status(400).json({
        success: false,
        message: `Invalid collection name: "${collectionName}". Collection names must match /^[a-zA-Z0-9_]+$/`,
      });
    }

    // Check if form definition with same name already exists
    const existingForm = await FormDefinition.findOne({ name });
    if (existingForm) {
      return res.status(400).json({
        success: false,
        message: `Form definition with name "${name}" already exists`,
      });
    }

    // Create form definition data object
    const formDefinitionData = {
      title,
      name,
      module: module._id,
      sections: sections || [],
      formType: formType || 'custom',
      collectionName: collectionName || undefined,
      settings: settings || {},
      createdBy: req.user._id,
      updatedBy: req.user._id,
    };

    // Add _id if provided, otherwise let MongoDB auto-generate
    if (customId) {
      formDefinitionData._id = customId;
    }

    // Create form definition
    const formDefinition = await FormDefinition.create(formDefinitionData);

    // Auto-create default access rules for the module (if not already exists)
    try {
      await initDefaultModuleAccess(module._id?.toString());
      logger.info(`Default access rules created for module: ${module.name}`);
    } catch (error) {
      logger.warn(`Failed to create default access rules for module ${module.name}:`, error.message);
      // Don't fail the form creation if access rule creation fails
    }

    logger.info(`Form definition created: ${formDefinition._id} - ${name}`);

    res.status(201).json({
      success: true,
      data: formDefinition,
    });
  } catch (error) {
    logger.error('Create form definition error:', {
      error: error.message,
      stack: error.stack,
    });

    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: `Form definition with name "${name}" already exists`,
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
 * @desc    Get all form definitions
 * @route   GET /api/form-definitions
 * @access  Admin: all forms, Non-admin: forms they have access to
 */
export const getFormDefinitions = async (req, res) => {
  try {
    const { module: moduleIdOrName } = req.query;

    // Build query
    const query = {};
    if (moduleIdOrName) {
      // Find module by ID or name
      let module;
      if (typeof moduleIdOrName === 'string' && moduleIdOrName.length === 24) {
        module = await Module.findById(moduleIdOrName);
      } else {
        module = await Module.findOne({ name: moduleIdOrName.toLowerCase() });
      }
      if (module) {
        query.module = module._id;
      }
    }

    let formDefinitions = await FormDefinition.find(query)
      .populate('module', 'name description isActive')
      .populate('createdBy', 'name email role')
      .populate('updatedBy', 'name email role')
      .sort({ createdAt: -1 });

    // Filter for non-admin users
    if (!isAdmin(req.user.role)) {
      const accessibleForms = [];
      for (const formDef of formDefinitions) {
        const hasAccess = await canUserAccessFormDefinition(req.user, formDef);
        if (hasAccess) {
          accessibleForms.push(formDef);
        }
      }
      formDefinitions = accessibleForms;
    }

    res.status(200).json({
      success: true,
      count: formDefinitions.length,
      data: formDefinitions,
    });
  } catch (error) {
    logger.error('Get form definitions error:', {
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
 * @desc    Get form definition by ID
 * @route   GET /api/form-definitions/:id
 * @access  Admin: all forms, Non-admin: forms they have access to
 */
export const getFormDefinition = async (req, res) => {
  try {
    const { id } = req.params;

    const formDefinition = await FormDefinition.findById(id)
      .populate('module', 'name description isActive')
      .populate('createdBy', 'name email role')
      .populate('updatedBy', 'name email role');

    if (!formDefinition) {
      return res.status(404).json({
        success: false,
        message: 'Form definition not found',
      });
    }

    // Check access for non-admin users
    if (!isAdmin(req.user.role)) {
      const hasAccess = await canUserAccessFormDefinition(req.user, formDefinition);
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You do not have permission to view this form definition',
        });
      }
    }

    res.status(200).json({
      success: true,
      data: formDefinition,
    });
  } catch (error) {
    logger.error('Get form definition error:', {
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
 * @desc    Get form definition by name
 * @route   GET /api/form-definitions/name/:name
 * @access  Admin: all forms, Non-admin: forms they have access to
 */
export const getFormDefinitionByName = async (req, res) => {
  try {
    const { name } = req.params;

    const formDefinition = await FormDefinition.findOne({ name })
      .populate('module', 'name description isActive')
      .populate('createdBy', 'name email role')
      .populate('updatedBy', 'name email role');

    if (!formDefinition) {
      return res.status(404).json({
        success: false,
        message: `Form definition with name "${name}" not found`,
      });
    }

    if (!formDefinition.module) {
      return res.status(404).json({
        success: false,
        message: 'Form definition has no associated module',
      });
    }

    // Check access for non-admin users
    if (!isAdmin(req.user.role)) {
      const hasAccess = await canUserAccessFormDefinition(req.user, formDefinition);
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You do not have permission to view this form definition',
        });
      }
    }

    res.status(200).json({
      success: true,
      data: formDefinition,
    });
  } catch (error) {
    logger.error('Get form definition by name error:', {
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
 * @desc    Update form definition
 * @route   PUT /api/form-definitions/:id
 * @access  Admin only
 */
export const updateFormDefinition = async (req, res) => {
  try {
    // Only admin can update form definitions
    if (!isAdmin(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Only admin can update form definitions',
      });
    }

    const { id } = req.params;
    const { title, name, module: moduleIdOrName, sections, formType, collectionName, settings } = req.body;

    // Find form definition
    const formDefinition = await FormDefinition.findById(id);

    if (!formDefinition) {
      return res.status(404).json({
        success: false,
        message: 'Form definition not found',
      });
    }

    // Check if updating system form - only admin allowed
    if (formDefinition.formType === 'system' && !isAdmin(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only admin can update system forms',
      });
    }

    // Check if trying to change formType to system - only admin allowed
    if (formType === 'system' && !isAdmin(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only admin can set formType to system',
      });
    }

    // Update module if provided
    if (moduleIdOrName !== undefined) {
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

      formDefinition.module = module._id;
    }

    if (collectionName !== undefined) {
      // Validate collectionName format if provided
      if (collectionName !== null && collectionName !== '') {
        if (!validateModuleName(collectionName)) {
          return res.status(400).json({
            success: false,
            message: `Invalid collection name: "${collectionName}". Collection names must match /^[a-zA-Z0-9_]+$/`,
          });
        }
        formDefinition.collectionName = collectionName;
      } else if (collectionName === null || collectionName === '') {
        // Allow clearing the collectionName by setting it to null or empty string
        formDefinition.collectionName = undefined;
      }
    }

    // Update fields
    if (title !== undefined) formDefinition.title = title;
    if (name !== undefined) formDefinition.name = name;
    if (sections !== undefined) formDefinition.sections = sections;
    if (formType !== undefined) formDefinition.formType = formType;
    if (settings !== undefined) formDefinition.settings = settings;
    formDefinition.updatedBy = req.user._id;

    // Save updated form definition
    await formDefinition.save();

    logger.info(`Form definition updated: ${formDefinition._id} - ${formDefinition.name}`);

    res.status(200).json({
      success: true,
      data: formDefinition,
    });
  } catch (error) {
    logger.error('Update form definition error:', {
      error: error.message,
      stack: error.stack,
    });

    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: `Form definition with name "${req.body.name}" already exists`,
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
 * @desc    Delete form definition
 * @route   DELETE /api/form-definitions/:id
 * @access  Admin only
 */
export const deleteFormDefinition = async (req, res) => {
  try {
    // Only admin can delete form definitions
    if (!isAdmin(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Only admin can delete form definitions',
      });
    }

    const { id } = req.params;

    // Find form definition first to check formType and get module info
    const formDefinition = await FormDefinition.findById(id).populate('module');

    if (!formDefinition) {
      return res.status(404).json({
        success: false,
        message: 'Form definition not found',
      });
    }

    // Check if deleting system form - only admin allowed
    if (formDefinition.formType === 'system' && !isAdmin(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only admin can delete system forms',
      });
    }

    // Delete all associated form entries
    let deletedEntriesCount = 0;
    if (formDefinition.module) {
      try {
        const EntryModel = getFormEntryModel(formDefinition);
        const deleteResult = await EntryModel.deleteMany({ formId: id });
        deletedEntriesCount = deleteResult.deletedCount || 0;
        logger.info(`Deleted ${deletedEntriesCount} form entries for form definition: ${id} - ${formDefinition.name}`);
      } catch (error) {
        logger.error('Error deleting form entries:', {
          error: error.message,
          formId: id,
          stack: error.stack,
        });
        // Continue with form definition deletion even if entry deletion fails
      }
    }

    // Delete the form definition
    await FormDefinition.findByIdAndDelete(id);

    logger.info(`Form definition deleted: ${id} - ${formDefinition.name} (${deletedEntriesCount} entries deleted)`);

    res.status(200).json({
      success: true,
      message: 'Form definition deleted successfully',
      data: {},
    });
  } catch (error) {
    logger.error('Delete form definition error:', {
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
 * @desc    Get form definitions by module
 * @route   GET /api/form-definitions/module/:module
 * @access  Admin: all forms, Non-admin: forms they have access to
 */
export const getFormDefinitionsByModule = async (req, res) => {
  try {
    const { module: moduleIdOrName } = req.params;

    // Find module by ID or name
    let moduleDoc;
    if (typeof moduleIdOrName === 'string' && moduleIdOrName.length === 24) {
      moduleDoc = await Module.findById(moduleIdOrName);
    } else {
      moduleDoc = await Module.findOne({ name: moduleIdOrName.toLowerCase() });
    }

    if (!moduleDoc) {
      return res.status(404).json({
        success: false,
        message: `Module not found: ${moduleIdOrName}`,
      });
    }

    // Check module access for non-admin users
    if (!isAdmin(req.user.role)) {
      const accessRule = await FormAccessRules.findOne({ module: moduleDoc._id });
      if (!accessRule || !accessRule.rolesAllowed.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You do not have permission to access this module',
        });
      }
    }

    let formDefinitions = await FormDefinition.find({ module: moduleDoc._id })
      .populate('module', 'name description isActive')
      .populate('createdBy', 'name email role')
      .populate('updatedBy', 'name email role')
      .sort({ createdAt: -1 });

    // Filter for non-admin users
    if (!isAdmin(req.user.role)) {
      const accessibleForms = [];
      for (const formDef of formDefinitions) {
        const hasAccess = await canUserAccessFormDefinition(req.user, formDef);
        if (hasAccess) {
          accessibleForms.push(formDef);
        }
      }
      formDefinitions = accessibleForms;
    }

    res.status(200).json({
      success: true,
      count: formDefinitions.length,
      data: formDefinitions,
    });
  } catch (error) {
    logger.error('Get form definitions by module error:', {
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


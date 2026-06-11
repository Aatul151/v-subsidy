import Role from '../models/Role.js';
import logger from '../config/logger.js';

/**
 * @desc    Get list of roles with pagination
 * @route   GET /api/roles
 * @access  Private
 * 
 * @example
 * // Query params: 
 * // ?page=1&limit=10
 */
export const getRoles = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    // Parse pagination parameters
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);

    // Validate pagination parameters
    if (pageNumber < 1 || limitNumber < 1) {
      return res.status(400).json({
        success: false,
        message: 'Page and limit must be positive numbers',
      });
    }

    // Calculate skip value
    const skip = (pageNumber - 1) * limitNumber;

    // Get total count of roles
    const total = await Role.countDocuments();

    // Find roles with pagination
    const roles = await Role.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNumber);

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limitNumber);
    const hasNextPage = pageNumber < totalPages;
    const hasPrevPage = pageNumber > 1;

    logger.info(`Roles list accessed by user: ${req.user.email} - Page: ${pageNumber}, Limit: ${limitNumber}`);

    res.status(200).json({
      success: true,
      pagination: {
        currentPage: pageNumber,
        limit: limitNumber,
        total,
        totalPages,
        hasNextPage,
        hasPrevPage,
      },
      count: roles.length,
      data: roles,
    });
  } catch (error) {
    logger.error('Get roles error:', {
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
 * @desc    Get role by ID
 * @route   GET /api/roles/:id
 * @access  Private
 */
export const getRoleById = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);

    if (!role) {
      logger.warn(`Role not found with ID: ${req.params.id}`);
      return res.status(404).json({
        success: false,
        message: 'Role not found',
      });
    }

    logger.info(`Role details accessed: ${role.name} by user: ${req.user.email}`);
    res.status(200).json({
      success: true,
      data: role,
    });
  } catch (error) {
    logger.error('Get role by ID error:', {
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
 * @desc    Create a new role
 * @route   POST /api/roles
 * @access  Private (Superadmin only)
 * 
 * @example
 * // Request body:
 * {
 *   "name": "manager"
 * }
 */
export const createRole = async (req, res) => {
  try {
    const { name } = req.body;

    // Validation
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Please provide role name',
      });
    }

    // Check if role already exists
    const roleExists = await Role.findOne({ name: name.toLowerCase().trim() });

    if (roleExists) {
      return res.status(400).json({
        success: false,
        message: 'Role with this name already exists',
      });
    }

    // Create role
    const role = await Role.create({
      name: name.toLowerCase().trim(),
    });

    logger.info(`Role created by superadmin ${req.user.email}: ${role.name}`);

    res.status(201).json({
      success: true,
      data: role,
    });
  } catch (error) {
    logger.error('Create role error:', {
      error: error.message,
      stack: error.stack,
    });

    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Role with this name already exists',
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
 * @desc    Update role
 * @route   PUT /api/roles/:id
 * @access  Private (Superadmin only)
 * 
 * @example
 * // Request body:
 * {
 *   "name": "updated-role-name"
 * }
 */
export const updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    // Find role
    const role = await Role.findById(id);

    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found',
      });
    }

    // Check for duplicate name if being updated
    if (name && name.toLowerCase().trim() !== role.name) {
      const nameExists = await Role.findOne({ name: name.toLowerCase().trim() });
      if (nameExists) {
        return res.status(400).json({
          success: false,
          message: 'Role with this name already exists',
        });
      }
    }

    // Update name if provided
    if (name !== undefined) {
      role.name = name.toLowerCase().trim();
    }

    // Save updated role
    await role.save();

    logger.info(`Role updated by superadmin ${req.user.email}: ${role.name}`);

    res.status(200).json({
      success: true,
      data: role,
    });
  } catch (error) {
    logger.error('Update role error:', {
      error: error.message,
      stack: error.stack,
    });

    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Role with this name already exists',
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
 * @desc    Delete role
 * @route   DELETE /api/roles/:id
 * @access  Private (Superadmin only)
 */
export const deleteRole = async (req, res) => {
  try {
    const { id } = req.params;

    // Find role
    const role = await Role.findById(id);

    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found',
      });
    }

    // Delete role
    await Role.findByIdAndDelete(id);

    logger.info(`Role deleted by superadmin ${req.user.email}: ${role.name}`);

    res.status(200).json({
      success: true,
      message: 'Role deleted successfully',
      data: {
        _id: role._id,
        name: role.name,
      },
    });
  } catch (error) {
    logger.error('Delete role error:', {
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


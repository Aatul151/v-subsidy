import User from '../models/User.js';
import logger from '../config/logger.js';
import { isAdmin } from '../services/permissionService.js';

// Valid roles for User model
const VALID_USER_ROLES = ['user', 'admin', 'superadmin'];

/**
 * @desc    Get list of users with pagination
 * @route   GET /api/users
 * @access  Private (Admin only)
 * 
 * @example
 * // Query params: 
 * // ?page=1&limit=10
 * // ?page=2&limit=20
 */
export const getUsers = async (req, res) => {
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

    // Build query to exclude superadmin users
    const query = { role: { $ne: 'superadmin' } };

    // Get total count of users (for pagination metadata) - excluding superadmin
    const total = await User.countDocuments(query);

    // Find users with pagination (exclude password field and superadmin role)
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNumber);

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limitNumber);
    const hasNextPage = pageNumber < totalPages;
    const hasPrevPage = pageNumber > 1;

    logger.info(`Users list accessed by admin: ${req.user.email} - Page: ${pageNumber}, Limit: ${limitNumber}`);

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
      count: users.length,
      data: users,
    });
  } catch (error) {
    logger.error('Get users error:', {
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

// @desc    Get current logged in user
// @route   GET /api/users/me
// @access  Private
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id ?? req.user._id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check if user is active
    if (!user.isActive) {
      logger.warn(`Inactive user attempted to access profile: ${user.email}`);
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact administrator.',
      });
    }

    logger.info(`User profile accessed: ${user.email}`);
    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    logger.error('Get user profile error:', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private (Admin can get any user; non-admin can only get self)
export const getUserById = async (req, res) => {
  try {
    const requestedId = req.params.id;
    const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';

    // Non-admin can only fetch their own profile
    if (!isAdmin && requestedId !== req.user._id.toString()) {
      logger.warn(`User ${req.user.email} attempted to access another user's profile: ${requestedId}`);
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only view your own profile',
      });
    }

    const user = await User.findById(requestedId).select('-password');

    if (!user) {
      logger.warn(`User not found with ID: ${requestedId}`);
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check if user is active
    if (!user.isActive) {
      logger.warn(`Attempted to access inactive user: ${user.email} by ${req.user.email}`);
      return res.status(403).json({
        success: false,
        message: 'This user account has been deactivated',
      });
    }

    logger.info(`User details accessed: ${user.email} by user: ${req.user.email}`);
    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    logger.error('Get user by ID error:', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

/**
 * @desc    Create a new user
 * @route   POST /api/users
 * @access  Private (Admin only)
 * 
 * @example
 * // Request body:
 * {
 *   "name": "John Doe",
 *   "email": "john@example.com",
 *   "password": "password123",
 *   "role": "user"
 * }
 */
export const createUser = async (req, res) => {
  try {
    const { name, email, password, role, isActive } = req.body;

    // Validation
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email',
      });
    }

    // Validate role if provided
    if (role && !VALID_USER_ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role. Must be one of: ${VALID_USER_ROLES.join(', ')}`,
      });
    }

    // Check if user already exists
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists',
      });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password:"user!123",
      role: role || 'user',
      isActive: isActive !== undefined ? isActive : true,
    });

    logger.info(`User created by admin ${req.user.email}: ${user.email}`);

    res.status(201).json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    logger.error('Create user error:', {
      error: error.message,
      stack: error.stack,
    });

    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists',
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
 * @desc    Update user
 * @route   PUT /api/users/:id
 * @access  Private (Admin only)
 * 
 * @example
 * // Request body:
 * {
 *   "name": "John Doe Updated",
 *   "email": "john.updated@example.com",
 *   "role": "admin",
 * }
 */
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email,  role, isActive } = req.body;

    // Find user
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check for duplicate email if being updated
    if (email && email !== user.email) {
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: 'User with this email already exists',
        });
      }
    }

    // Validate role if provided
    if (role && !VALID_USER_ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role. Must be one of: ${VALID_USER_ROLES.join(', ')}`,
      });
    }

    // Update fields
    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = email;
    if (role !== undefined) user.role = role;
    if (isActive !== undefined) user.isActive = isActive;

    // Save updated user
    await user.save();

    logger.info(`User updated by admin ${req.user.email}: ${user.email}`);

    res.status(200).json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    logger.error('Update user error:', {
      error: error.message,
      stack: error.stack,
    });

    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists',
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
 * @desc    Change user password (Admin/Superadmin only)
 * @route   PUT /api/users/:id/password
 * @access  Private (Admin/Superadmin only)
 * 
 * @example
 * // Request body:
 * {
 *   "password": "newPassword123"
 * }
 */
export const changeUserPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    // Validation
    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a new password',
      });
    }

    // Validate password length (minimum 6 characters as per User model)
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long',
      });
    }

    // Find user
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Prevent non-superadmin from changing superadmin password
    if (user.role === 'superadmin' && req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Only superadmin can change superadmin passwords',
      });
    }

    // Update password (will be automatically hashed by User model pre-save hook)
    user.password = password;
    await user.save();

    logger.info(`Password changed for user ${user.email} by admin ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
      data: {
        _id: user._id,
        email: user.email,
      },
    });
  } catch (error) {
    logger.error('Change user password error:', {
      error: error.message,
      stack: error.stack,
      userId: req.params.id,
      changedBy: req.user.email,
    });

    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};


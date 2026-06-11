import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import logger from '../config/logger.js';

// Protect routes
export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];
      if (token?.length > 0) {

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Get user from the token
        req.user = await User.findById(decoded.id).select('-password');

        if (!req.user) {
          logger.warn('JWT token valid but user not found');
          return res.status(401).json({
            success: false,
            message: 'User not found',
          });
        }

        // Check if user is active
        if (!req.user.isActive) {
          logger.warn(`Inactive user attempted to access protected route: ${req.user.email}`);
          return res.status(403).json({
            success: false,
            message: 'Your account has been deactivated. Please contact administrator.',
          });
        }

        logger.debug(`Authenticated user: ${req.user.email}`);
        next();
      }
      
    } catch (error) {
      logger.warn('JWT authentication failed:', { error: error.message });
      return res.status(401).json({
        success: false,
        message: 'Not authorized, invalid token',
      });
    }
  }

  if (!token) {
    logger.warn('Access attempt without token');
    return res.status(401).json({
      success: false,
      message: 'Not authorized, no token',
    });
  }
};

/**
 * Require specific roles to access route
 * @param {string[]} allowedRoles - Array of roles allowed to access
 * @returns {Function} - Express middleware function
 */
export const requireRoles = (allowedRoles) => {
  return async (req, res, next) => {
    try {
      // Check if user is authenticated
      if (!req.user || !req.user.role) {
        logger.warn('Role check failed: User not authenticated');
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      const userRole = req.user.role;

      // Check if user's role is in allowed roles
      if (!allowedRoles.includes(userRole)) {
        logger.warn(`Access denied: User role "${userRole}" not in allowed roles: ${allowedRoles.join(', ')}`);
        return res.status(403).json({
          success: false,
          message: 'Access denied: Insufficient permissions',
        });
      }

      next();
    } catch (error) {
      logger.error('Error checking user roles:', {
        error: error.message,
        stack: error.stack,
      });
      res.status(500).json({
        success: false,
        message: 'Error checking permissions',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  };
};


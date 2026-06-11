import express from 'express';
import { protect, requireRoles } from '../middleware/auth.js';
import { getUsers, getMe, getUserById, createUser, updateUser, changeUserPassword } from '../controllers/userController.js';
import { apiLimiter } from '../middleware/rateLimiter.js';
import { ADMIN_ROLES } from '../services/permissionService.js';

const router = express.Router();

// Get list of users (admin only) - must be before /:id route
router.get('/', protect, requireRoles(ADMIN_ROLES), apiLimiter, getUsers);

// Create user (admin only) - must be before /:id route
router.post('/', protect, requireRoles(ADMIN_ROLES), apiLimiter, createUser);

// Get current logged in user
router.get('/me', protect, getMe);

// Change user password (admin/superadmin only) - must be before /:id route
router.put('/:id/password', protect, requireRoles(ADMIN_ROLES), apiLimiter, changeUserPassword);

// Update user (admin only)
router.put('/:id', protect, requireRoles(ADMIN_ROLES), apiLimiter, updateUser);

// Get user by ID
router.get('/:id', protect, getUserById);

export default router;


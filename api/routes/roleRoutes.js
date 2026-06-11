import express from 'express';
import { protect, requireRoles } from '../middleware/auth.js';
import {
  getRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
} from '../controllers/roleController.js';

const router = express.Router();

// Get list of roles (authenticated users) - must be before /:id route
router.get('/', protect, getRoles);

// Create role (superadmin only) - must be before /:id route
router.post('/', protect, requireRoles(['superadmin']), createRole);

// Update role (superadmin only)
router.put('/:id', protect, requireRoles(['superadmin']), updateRole);

// Delete role (superadmin only)
router.delete('/:id', protect, requireRoles(['superadmin']), deleteRole);

// Get role by ID (authenticated users)
router.get('/:id', protect, getRoleById);

export default router;


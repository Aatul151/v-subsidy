import express from 'express';
import {
  createAccessRule,
  updateAccessRule,
  deleteAccessRule,
  getAccessRules,
  getModuleAccessRule,
} from '../controllers/formAccessController.js';
import { protect, requireRoles } from '../middleware/auth.js';
import { apiLimiter } from '../middleware/rateLimiter.js';
import { ADMIN_ROLES } from '../services/permissionService.js';

const router = express.Router();

// All routes require authentication and admin role
router.use(protect);
router.use(apiLimiter);

// Form Access Rules Routes
router.post('/', requireRoles(ADMIN_ROLES), createAccessRule);
router.get('/', getAccessRules);
router.get('/:module', getModuleAccessRule);
router.put('/:module', requireRoles(ADMIN_ROLES), updateAccessRule);
router.delete('/:module', requireRoles(ADMIN_ROLES), deleteAccessRule);

export default router;


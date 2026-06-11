import express from 'express';
import {
  createModule,
  getModules,
  getModule,
  getModuleByName,
  updateModule,
  deleteModule,
} from '../controllers/moduleController.js';
import { protect, requireRoles } from '../middleware/auth.js';
import { apiLimiter } from '../middleware/rateLimiter.js';
import { ADMIN_ROLES } from '../services/permissionService.js';

const router = express.Router();

// All routes require authentication and admin role
router.use(protect);
router.use(apiLimiter);

// Module Routes
router.post('/', requireRoles(ADMIN_ROLES), createModule);
router.get('/', getModules);
router.get('/name/:name', getModuleByName);
router.get('/:id', getModule);
router.put('/:id', requireRoles(ADMIN_ROLES), updateModule);
router.delete('/:id', requireRoles(ADMIN_ROLES), deleteModule);

export default router;


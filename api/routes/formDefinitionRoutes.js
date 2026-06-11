import express from 'express';
import {
  createFormDefinition,
  getFormDefinitions,
  getFormDefinition,
  getFormDefinitionByName,
  updateFormDefinition,
  deleteFormDefinition,
  getFormDefinitionsByModule,
} from '../controllers/formDefinitionController.js';
import { protect, requireRoles } from '../middleware/auth.js';
import { apiLimiter } from '../middleware/rateLimiter.js';
import { ADMIN_ROLES } from '../services/permissionService.js';

const router = express.Router();

// All routes require authentication
router.use(protect);
router.use(apiLimiter);

// Form Definition Routes (read: any authenticated user with form access; write: admin only)
router.post('/', requireRoles(ADMIN_ROLES), createFormDefinition);
router.get('/', getFormDefinitions);
router.get('/module/:module', getFormDefinitionsByModule);
router.get('/name/:name', getFormDefinitionByName);
router.get('/:id', getFormDefinition);
router.put('/:id', requireRoles(ADMIN_ROLES), updateFormDefinition);
router.delete('/:id', requireRoles(ADMIN_ROLES), deleteFormDefinition);

export default router;


import express from 'express';
import { protect, requireRoles } from '../middleware/auth.js';
import { getCount } from '../controllers/dashboardController.js';

const router = express.Router();

// All routes are protected
router.use(protect);
router.get('/count', getCount);

export default router;


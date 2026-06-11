import express from 'express';
import { getSettings, updateSettings } from '../controllers/settingsController.js';
import { protect } from '../middleware/auth.js';
import { apiLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// All routes require authentication (users manage their own settings)
router.use(protect);
router.use(apiLimiter);

// Settings Routes
router.get('/', getSettings);
router.put('/', updateSettings);

export default router;


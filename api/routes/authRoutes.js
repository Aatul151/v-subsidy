import express from 'express';
import {
  register,
  login,
  forgotPassword,
  resetPassword,
  getGuestToken,
} from '../controllers/authController.js';
import { authLimiter, passwordResetLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.get('/public/session', authLimiter, getGuestToken);
router.post('/forgotpassword', passwordResetLimiter, forgotPassword);
router.put('/resetpassword/:resettoken', passwordResetLimiter, resetPassword);

export default router;


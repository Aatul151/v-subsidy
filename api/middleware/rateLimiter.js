import rateLimit from 'express-rate-limit';
import logger from '../config/logger.js';

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: (process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000), // 15 minutes
  max: process.env.RATE_LIMIT_MAX || 5000, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      message: 'Too many requests from this IP, please try again later.',
    });
  },
});

// Auth routes rate limiter (stricter)
export const authLimiter = rateLimit({
  windowMs: (process.env.AUTH_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000), // 15 minutes
  max: process.env.AUTH_RATE_LIMIT_MAX || 500, // limit each IP to 5 requests per windowMs
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Auth rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      message: 'Too many authentication attempts, please try again later.',
    });
  },
});

// Password reset rate limiter (very strict)
export const passwordResetLimiter = rateLimit({
  windowMs: (process.env.PASSWORD_RESET_RATE_LIMIT_WINDOW_MS || 60 * 60 * 1000), // 1 hour
  max: process.env.PASSWORD_RESET_RATE_LIMIT_MAX || 3, // limit each IP to 3 requests per hour
  message: {
    success: false,
    message: 'Too many password reset attempts, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Password reset rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      message: 'Too many password reset attempts, please try again later.',
    });
  },
});


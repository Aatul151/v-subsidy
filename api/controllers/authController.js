import User from '../models/User.js';
import { generateToken } from '../utils/generateToken.js';
import logger from '../config/logger.js';
import crypto from 'crypto';

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validation
    if (!name || !email || !password) {
      logger.warn('Registration attempt with missing fields');
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, and password',
      });
    }

    // Check if user already exists
    const userExists = await User.findOne({ email });

    if (userExists) {
      logger.warn(`Registration attempt with existing email: ${email}`);
      return res.status(400).json({
        success: false,
        message: 'User already exists',
      });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role: "user"
    });

    if (user) {
      logger.info(`New user registered: ${user.email}`);
      res.status(201).json({
        success: true,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        token: generateToken(user._id),
      });
    } else {
      logger.error('Failed to create user');
      res.status(400).json({
        success: false,
        message: 'Invalid user data',
      });
    }
  } catch (error) {
    logger.error('Registration error:', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// @desc    Authenticate a user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      logger.warn('Login attempt with missing fields');
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    // Check for user
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      logger.warn(`Login attempt with non-existent email: ${email}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      logger.warn(`Failed login attempt for email: ${email}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Prevent guest users from logging in
    if (user.role === 'guest') {
      logger.warn(`Login attempt by guest user: ${email}`);
      return res.status(403).json({
        success: false,
        message: 'Guest users cannot login. Please use the guest token endpoint.',
      });
    }

    // Check if user is active
    if (!user.isActive) {
      logger.warn(`Login attempt by inactive user: ${email}`);
      return res.status(401).json({
        success: false,
        message: 'Your account has been deactivated. Please contact administrator.',
      });
    }

    logger.info(`User logged in successfully: ${user.email}`);
    res.status(200).json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      },
      token: generateToken(user._id),
    });
  } catch (error) {
    logger.error('Login error:', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// @desc    Get reset password token
// @route   POST /api/auth/forgotpassword
// @access  Public
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      logger.warn('Forgot password request without email');
      return res.status(400).json({
        success: false,
        message: 'Please provide email',
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      logger.warn(`Password reset requested for non-existent email: ${email}`);
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Get reset token
    const resetToken = crypto.randomBytes(20).toString('hex');

    // Hash token and set to resetPasswordToken field
    user.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Set expire
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

    await user.save({ validateBeforeSave: false });

    logger.info(`Password reset token generated for: ${email}`);
    // In production, you would send this token via email
    // For now, we'll return it in the response (remove this in production)
    res.status(200).json({
      success: true,
      message: 'Password reset token generated',
      resetToken, // Remove this in production - send via email instead
    });
  } catch (error) {
    logger.error('Forgot password error:', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// @desc    Reset password
// @route   PUT /api/auth/resetpassword/:resettoken
// @access  Public
export const resetPassword = async (req, res) => {
  try {
    const { password } = req.body;
    const { resettoken } = req.params;

    if (!password) {
      logger.warn('Password reset attempt without password');
      return res.status(400).json({
        success: false,
        message: 'Please provide password',
      });
    }

    // Get hashed token
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(resettoken)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      logger.warn('Password reset attempt with invalid or expired token');
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired token',
      });
    }

    // Set new password
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    logger.info(`Password reset successful for: ${user.email}`);
    res.status(200).json({
      success: true,
      message: 'Password reset successful',
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        token: generateToken(user._id),
      },
    });
  } catch (error) {
    logger.error('Password reset error:', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// @desc    Get guest token (for public web portal access)
// @route   GET /api/auth/public/session
// @access  Public (rate limited)
// @query   key (optional) - Secret key for additional security (set via GUEST_TOKEN_KEY env var)
export const getGuestToken = async (req, res) => {
  try {
    // Optional secret key check for additional security
    const guestTokenKey = process.env.GUEST_TOKEN_KEY;
    if (guestTokenKey) {
      const providedKey = req.query.key;
      if (!providedKey || providedKey !== guestTokenKey) {
        logger.warn(`Guest token request with invalid or missing key from IP: ${req.ip}`);
        return res.status(401).json({
          success: false,
          message: 'Invalid access key',
        });
      }
    }

    // Find guest user
    const guestUser = await User.findOne({ role: 'guest', isActive: true });

    if (!guestUser) {
      logger.warn('Guest token requested but guest user not found');
      return res.status(404).json({
        success: false,
        message: 'Guest user not found. Please contact administrator.',
      });
    }

    logger.info(`Guest token generated for IP: ${req.ip}`);
    res.status(200).json({
      success: true,
      message: 'Guest token generated successfully',
      data: {
        token: generateToken(guestUser._id),
      },
    });
  } catch (error) {
    logger.error('Get guest token error:', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};


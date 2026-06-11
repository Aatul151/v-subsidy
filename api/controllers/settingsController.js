import Settings from '../models/Settings.js';
import logger from '../config/logger.js';

/**
 * @desc    Get user settings (for logged-in user)
 * @route   GET /api/settings
 * @access  Private
 */
export const getSettings = async (req, res) => {
  try {
    const userId = req.user._id;
    const settings = await Settings.getUserSettings(userId);

    res.status(200).json({
      success: true,
      settings: settings,
    });
  } catch (error) {
    logger.error('Get settings error:', {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * @desc    Update user settings (for logged-in user)
 * @route   PUT /api/settings
 * @access  Private
 * 
 * @example
 * // Request body:
 * {
 *   "themeSettings": {
 *     "primaryColor": "#1976d2",
 *     "secondaryColor": "#dc004e",
 *     "mode": "dark",
 *   },
 *   "systemSettings": {
 *   }
 * }
 */
export const updateSettings = async (req, res) => {
  try {
    const userId = req.user._id;
    const { themeSettings, systemSettings } = req.body;

    // Get or create settings document for the logged-in user
    let settings = await Settings.findOne({ user: userId });
    if (!settings) {
      settings = await Settings.create({
        user: userId,
        themeSettings: themeSettings || {},
        systemSettings: systemSettings || {},
        updatedBy: userId,
      });
    } else {
      // Update theme settings if provided
      if (themeSettings !== undefined) {
        settings.themeSettings = {
          ...settings.themeSettings,
          ...themeSettings,
        };
      }
      // Update basic settings if provided
      if (systemSettings !== undefined) {
        settings.systemSettings = {
          ...settings.systemSettings,
          ...systemSettings,
        };
      }
      settings.updatedBy = userId;
      await settings.save();
    }

    logger.info(`Settings updated by user: ${req.user.email} (ID: ${userId})`);

    res.status(200).json({
      success: true,
      settings: settings,
    });
  } catch (error) {
    logger.error('Update settings error:', {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};


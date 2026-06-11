import mongoose from 'mongoose';

/**
 * Settings Schema
 * 
 * Manages user-specific settings.
 * Each user has their own settings document.
 */
const settingsSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
      unique: true,
      index: true,
    },
    themeSettings: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    systemSettings: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Get or create settings for a specific user
settingsSchema.statics.getUserSettings = async function (userId) {
  let settings = await this.findOne({ user: userId });
  if (!settings) {
    settings = await this.create({
      user: userId,
      updatedBy: userId,
    });
  }
  return settings;
};

const Settings = mongoose.model('Settings', settingsSchema);

export default Settings;


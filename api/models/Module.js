import mongoose from 'mongoose';
import { validateModuleName } from '../helpers/validateModuleName.js';

/**
 * Module Schema
 * 
 * Represents a dynamic module in the system (e.g., student, staff, fees, academic, activities).
 * Each module has its own collection for form entries.
 */
const moduleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Module name is required'],
      unique: true,
      trim: true,
      lowercase: true,
      validate: {
        validator: validateModuleName,
        message: 'Module name must match /^[a-zA-Z0-9_]+$/',
      },
      index: true,
    },
    description: {
      type: String,
      trim: true,
    },
    icon: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Created by user is required'],
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

const Module = mongoose.model('Module', moduleSchema);

export default Module;


import mongoose from 'mongoose';
import { validateModuleName } from '../helpers/validateModuleName.js';

/**
 * FormDefinition Schema
 * 
 * Defines the structure and configuration for dynamic forms.
 * Each form definition can be associated with a module, which
 * determines the collection where form entries are stored.
 */
const formDefinitionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Form title is required'],
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Form name is required'],
      unique: true,
      trim: true,
      index: true,
    },
    collectionName: {
      type: String,
      trim: true,
    },
    module: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Module',
      required: [true, 'Module is required'],
      index: true,
    },
    sections: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    formType: {
      type: String,
      enum: ['system', 'custom'],
      default: 'custom',
    },
    settings: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
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

// Note: Collection name is now stored in the Module model

const FormDefinition = mongoose.model('FormDefinition', formDefinitionSchema);

export default FormDefinition;


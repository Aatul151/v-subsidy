import mongoose from 'mongoose';
import BaseFormEntrySchema from '../models/base/BaseFormEntry.js';
import Module from '../models/Module.js';
import { validateModuleName } from './validateModuleName.js';
import { initDefaultModuleAccess } from '../utils/initDefaultModuleAccess.js';

/**
 * Dynamic FormEntry Model Factory
 * 
 * Creates Mongoose models for dynamic form entries based on module names or custom collection names.
 * 
 * Naming Convention:
 * - Model name: FormEntry_<moduleName> or FormEntry_<collectionName>
 * - Collection name: form_entries_<moduleName> (if using module) or <collectionName> (if provided)
 * 
 * Features:
 * - Validates module name format
 * - Supports custom collection names from form definition
 * - Auto-creates indexes on formId and submittedBy
 * - Returns existing model if already registered in mongoose
 * 
 * @param {Object} form - The form definition object with populated module
 * @param {Object} form.module - The module object (must be populated)
 * @param {string} form.module.name - The module name (e.g., "student", "employee")
 * @param {string} [form.collectionName] - Optional custom collection name from form definition
 * @returns {mongoose.Model} - The FormEntry model for the specified module or collection
 * 
 * @throws {Error} - If module name is invalid or form/module is missing
 * 
 * @example
 * // Form definition with populated module
 * const form = await FormDefinition.findOne({ name: "admission2025" }).populate('module');
 * const EntryModel = getFormEntryModel(form);
 */
export const getFormEntryModel = (form) => {
  // Validate form object
  if (!form) {
    throw new Error('Form definition is required');
  }

  // Validate module is populated
  if (!form.module) {
    throw new Error('Form definition must have an associated module');
  }

  // Extract module name and collection name from form
  const moduleName = form.module.name;
  const collectionName = form.collectionName || null;

  // Validate module name
  if (!moduleName || !validateModuleName(moduleName)) {
    throw new Error(
      `Invalid module name: "${moduleName}". Module names must match /^[a-zA-Z0-9_]+$/`
    );
  }

  // Determine the actual collection name to use
  const actualCollectionName = collectionName || `form_entries_${moduleName}`;
  
  // Validate collection name format (if custom)
  if (collectionName && !validateModuleName(collectionName)) {
    throw new Error(
      `Invalid collection name: "${collectionName}". Collection names must match /^[a-zA-Z0-9_]+$/`
    );
  }

  // Build model name - use collection name if provided, otherwise module name
  const modelIdentifier = collectionName || moduleName;
  const modelName = `FormEntry_${modelIdentifier}`;

  // Check if model is already registered in mongoose (prevents overwriting)
  if (mongoose.models[modelName]) {
    return mongoose.models[modelName];
  }

  // Create new model with custom collection name
  const FormEntryModel = mongoose.model(
    modelName,
    BaseFormEntrySchema,
    actualCollectionName
  );

  // Create indexes asynchronously (non-blocking)
  FormEntryModel.createIndexes()
    .then(() => {
      console.log(`Indexes created for collection: ${actualCollectionName}`);
    })
    .catch((err) => {
      console.error(`Error creating indexes for ${actualCollectionName}:`, err);
    });

  // Auto-create default access rules for new module (non-blocking)
  // Only if using module-based collection (not custom collection)
  if (!collectionName) {
    initDefaultModuleAccess(moduleName)
      .then(() => {
        console.log(`Default access rules initialized for module: ${moduleName}`);
      })
      .catch((err) => {
        console.error(`Error initializing default access rules for ${moduleName}:`, err);
      });
  }

  return FormEntryModel;
};

export default getFormEntryModel;


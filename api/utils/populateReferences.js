import mongoose from 'mongoose';
import FormDefinition from '../models/FormDefinition.js';
import { getFormEntryModel } from '../helpers/formEntryModelFactory.js';
import { extractReferenceFields } from './extractReferenceFields.js';
import logger from '../config/logger.js';

/**
 * Convert field value(s) to array of valid MongoDB ObjectIds
 * Handles both single values and arrays, filters out invalid IDs
 * @param {any} fieldValue - The field value (can be string, ObjectId, or array)
 * @param {boolean} allowMultiple - Whether the field allows multiple values
 * @returns {Array} - Array of valid ObjectIds
 */
const convertToObjectIds = (fieldValue, allowMultiple) => {
  const ids = allowMultiple && Array.isArray(fieldValue) ? fieldValue : [fieldValue];

  return ids
    .filter(id => id != null && id !== '')
    .map(id => {
      if (typeof id === 'string' && mongoose.Types.ObjectId.isValid(id)) {
        return new mongoose.Types.ObjectId(id);
      }
      return id;
    })
    .filter(id => mongoose.Types.ObjectId.isValid(id));
};

/**
 * Convert Mongoose document to plain JavaScript object
 * Handles both Mongoose documents (with toObject method) and plain objects
 * @param {Object} entry - Mongoose document or plain object
 * @returns {Object} - Plain JavaScript object
 */
const toPlainObject = (entry) => {
  return entry?.toObject ? entry.toObject() : entry;
};

/**
 * Populate formReference field by fetching referenced form entries
 * Looks up form entries from another form definition and returns their payload data
 * @param {string|ObjectId|Array} fieldValue - The reference field value(s) (ObjectIds)
 * @param {Object} refField - The reference field configuration
 * @returns {Promise<Object|Array|null>} - Populated form entry data or null if not found
 */
const populateFormReference = async (fieldValue, refField) => {
  if (!refField.referenceFormName) {
    return null;
  }

  try {
    const referencedForm = await FormDefinition.findOne({
      name: refField.referenceFormName
    }).populate('module');

    if (!referencedForm) {
      logger.warn(`Referenced form not found: ${refField.referenceFormName}`);
      return null;
    }

    const ReferencedModel = getFormEntryModel(referencedForm);
    const objectIds = convertToObjectIds(fieldValue, refField.allowMultiple);

    if (objectIds.length === 0) {
      return null;
    }

    const referencedEntries = await ReferencedModel.find({
      _id: { $in: objectIds }
    }).lean();

    if (referencedEntries.length === 0) {
      return null;
    }

    // Map entries to return format
    const result = referencedEntries.map(entry => {
      const baseData = { _id: entry._id, ...(entry.payload || {}) };

      if (refField.referenceFieldName && entry.payload?.[refField.referenceFieldName] != null) {
        baseData[refField.referenceFieldName] = entry.payload[refField.referenceFieldName];
      }

      return baseData;
    });

    return refField.allowMultiple ? result : (result[0] || null);
  } catch (error) {
    logger.error(`Error populating form reference:`, {
      error: error.message,
      field: refField.name,
      referenceFormName: refField.referenceFormName,
    });
    return null;
  }
};

/**
 * Populate apiReference field by fetching referenced documents from a Mongoose model
 * Looks up documents from a specified model (e.g., User, Role) and returns their data
 * @param {string|ObjectId|Array} fieldValue - The reference field value(s) (ObjectIds)
 * @param {Object} refField - The reference field configuration
 * @returns {Promise<Object|Array|null>} - Populated document data or null if not found
 */
const populateApiReference = async (fieldValue, refField) => {
  if (!refField.referenceModel) {
    return null;
  }

  try {
    const Model = mongoose.models[refField.referenceModel];

    if (!Model) {
      logger.warn(`Model not found: ${refField.referenceModel}`);
      return null;
    }

    const objectIds = convertToObjectIds(fieldValue, refField.allowMultiple);

    if (objectIds.length === 0) {
      return null;
    }

    let query = Model.find({ _id: { $in: objectIds } });

    if (refField.populateFields) {
      query = query.select(refField.populateFields);
    }

    const referencedDocs = await query.lean();

    if (referencedDocs.length === 0) {
      return null;
    }

    return refField.allowMultiple ? referencedDocs : (referencedDocs[0] || null);
  } catch (error) {
    logger.error(`Error populating API reference:`, {
      error: error.message,
      field: refField.name,
      referenceModel: refField.referenceModel,
    });
    return null;
  }
};

/**
 * Populate reference fields in a single form entry
 * Fetches and attaches referenced data (form entries or API models) to the entry payload
 * Adds populated data with _ref suffix (e.g., role_ref) for easy access
 * @param {Object} entry - The form entry document or object
 * @param {Object} formDefinition - The form definition containing reference field configurations
 * @returns {Promise<Object>} - Entry with populated reference fields added to payload
 */
export const populateReferences = async (entry, formDefinition) => {

  // Early returns for invalid inputs
  if (!entry || !formDefinition) {
    return entry;
  }

  const entryObj = toPlainObject(entry);
  const referenceFields = extractReferenceFields(formDefinition);

  if (referenceFields.length === 0) {
    return entryObj;
  }

  // Create a copy to avoid mutating original
  const populatedEntry = { ...entryObj };
  populatedEntry.payload = { ...(populatedEntry.payload || {}) };

  // Process each reference field
  const populatePromises = referenceFields.map(async (refField) => {
    const fieldValue = populatedEntry.payload[refField.name];

    // Skip if field value is empty
    if (fieldValue == null || fieldValue === '') {
      return null;
    }

    try {
      let populatedData = null;
      if (refField.type === 'formReference') {
        populatedData = await populateFormReference(fieldValue, refField);
      } else if (refField.type === 'apiReference' && refField.referenceModel) {
        populatedData = await populateApiReference(fieldValue, refField);
      }
      if (populatedData != null) {
        const refFieldName = `${refField.name}_ref`;
        populatedEntry.payload[refFieldName] = populatedData;
      }
    } catch (error) {
      logger.warn(`Failed to populate reference field ${refField.name}:`, {
        error: error.message,
        field: refField.name,
        entryId: entryObj._id,
      });
    }

    return null;
  });

  // Wait for all population operations to complete
  await Promise.all(populatePromises);

  return populatedEntry;
};

/**
 * Populate reference fields for multiple form entries in batch
 * Processes all entries in parallel for better performance
 * @param {Array} entries - Array of form entry documents or objects
 * @param {Object} formDefinition - The form definition containing reference field configurations
 * @returns {Promise<Array>} - Array of entries with populated reference fields
 */
export const populateReferencesBatch = async (entries, formDefinition) => {
  if (!Array.isArray(entries) || entries.length === 0) {
    return entries;
  }

  // Process all entries in parallel
  const populatedEntries = await Promise.all(
    entries.map(entry => populateReferences(entry, formDefinition))
  );

  return populatedEntries;
};

/**
 * Resolve reference label back to ID/value for CSV import
 * Converts label values (e.g., "admin") back to ObjectIds or value fields
 * @param {string} fieldName - The reference field name
 * @param {string|Array} labelValue - The label value(s) from CSV (can be comma-separated string)
 * @param {Object} refField - The reference field configuration
 * @returns {Promise<string|ObjectId|Array|null>} - The ID/value or null if not found
 */
export const resolveReferenceLabel = async (fieldName, labelValue, refField) => {
  if (!refField || labelValue === null || labelValue === undefined || labelValue === '') {
    return null;
  }

  try {
    // Handle comma-separated values (for multiple references)
    let labels = [];
    if (typeof labelValue === 'string') {
      // Check if it's comma-separated
      if (labelValue.includes(',')) {
        labels = labelValue.split(',').map(v => v.trim()).filter(v => v);
      } else {
        labels = [labelValue];
      }
    } else if (Array.isArray(labelValue)) {
      labels = labelValue;
    } else {
      labels = [String(labelValue)];
    }

    if (labels.length === 0) {
      return null;
    }

    if (refField.type === 'formReference') {
      // For formReference: find by referenceFieldName
      const referencedForm = await FormDefinition.findOne({
        name: refField.referenceFormName
      }).populate('module');

      if (!referencedForm) {
        logger.warn(`Referenced form not found: ${refField.referenceFormName}`);
        return null;
      }

      const ReferencedModel = getFormEntryModel(referencedForm);
      const searchField = refField.referenceFieldName || 'name';

      // Find entries by label field
      const query = { [`payload.${searchField}`]: { $in: labels } };
      const referencedEntries = await ReferencedModel.find(query).lean();

      if (referencedEntries.length === 0) {
        return null;
      }
      // Return IDs
      const ids = referencedEntries.map(entry => entry._id);
      return refField.allowMultiple ? ids : ids[0];

    } else if (refField.type === 'apiReference') {
      // For apiReference: find by apiLabelField and return apiValueField
      const Model = mongoose.models[refField.referenceModel];

      if (!Model) {
        logger.warn(`Model not found: ${refField.referenceModel}`);
        return null;
      }

      const labelField = refField.apiLabelField || 'name';
      const valueField = refField.apiValueField || '_id';

      // Find documents by label field
      const query = { [labelField]: { $in: labels } };
      const referencedDocs = await Model.find(query).lean();

      if (referencedDocs.length === 0) {
        return null;
      }

      // Return value field (usually _id)
      const values = referencedDocs.map(doc => doc[valueField]);
      return refField.allowMultiple ? values : values[0];
    }
  } catch (error) {
    logger.error(`Error resolving reference label for field ${fieldName}:`, {
      error: error.message,
      field: fieldName,
      labelValue,
    });
    return null;
  }

  return null;
};

/**
 * Extract label/name from populated reference data for CSV export
 * @param {string} fieldName - The reference field name
 * @param {Object} entry - The entry object with populated reference data
 * @param {Object} refField - The reference field configuration
 * @returns {string|null} - The label/name value or null if not found
 */
export const getReferenceLabel = (fieldName, entry, refField) => {
  if (!refField) {
    return null;
  }

  // Check for populated reference data (with _ref suffix)
  const refData = entry.payload?.[`${fieldName}_ref`];
  if (!refData) {
    return null;
  }

  if (refField.type === 'formReference') {
    // For formReference: use referenceFieldName or first string field
    if (refField.referenceFieldName && refData[refField.referenceFieldName]) {
      return Array.isArray(refData)
        ? refData.map(item => item[refField.referenceFieldName]).join(', ')
        : refData[refField.referenceFieldName];
    }
    // Fallback: find first string/number field in payload
    if (Array.isArray(refData)) {
      return refData.map(item => {
        const payload = item.payload || item;
        const firstValue = Object.values(payload).find(v =>
          typeof v === 'string' || typeof v === 'number'
        );
        return firstValue || item._id?.toString() || '';
      }).join(', ');
    } else {
      const payload = refData.payload || refData;
      const firstValue = Object.values(payload).find(v =>
        typeof v === 'string' || typeof v === 'number'
      );
      return firstValue || refData._id?.toString() || '';
    }
  } else if (refField.type === 'apiReference') {
    // For apiReference: use apiLabelField (default: 'name')
    const labelField = refField.apiLabelField || 'name';
    if (Array.isArray(refData)) {
      return refData.map(item => item[labelField] || item._id?.toString() || '').join(', ');
    } else {
      return refData[labelField] || refData._id?.toString() || '';
    }
  }

  return null;
};

export default populateReferences;

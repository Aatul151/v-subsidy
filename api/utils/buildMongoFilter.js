import mongoose from 'mongoose';

/**
 * Utility to convert filter object to MongoDB filter query
 * 
 * @param {Object} filterObj - Filter object with field names as keys and filter conditions as values
 * @param {Object} formDefinition - Form definition object to get field types
 * @returns {Object} MongoDB filter query object
 * 
 * @example
 * // Input filter object:
 * {
 *   "field_7": { "operator": "lessThan", "value": "2025-12-23T18:30:00.000Z" },
 *   "form_response_field": { "operator": "notEquals", "value": "6949050b03f61fd2f1757b6b" },
 *   "field_1": { "operator": "equals", "value": "5" }
 * }
 * 
 * // Output MongoDB filter:
 * {
 *   "payload.field_7": { "$lt": "2025-12-23T18:30:00.000Z" },
 *   "form_response_field": { "$ne": ObjectId("6949050b03f61fd2f1757b6b") },
 *   "payload.field_1": "5"
 * }
 */
export const buildMongoFilter = (filterObj, formDefinition = null) => {
  if (!filterObj || typeof filterObj !== 'object') {
    return {};
  }

  const mongoFilter = {};

  // Map of operator names to MongoDB operators
  const operatorMap = {
    equals: '$eq',
    notEquals: '$ne',
    greaterThan: '$gt',
    greaterThanOrEqual: '$gte',
    lessThan: '$lt',
    lessThanOrEqual: '$lte',
    contains: '$regex',
    notContains: '$not',
    in: '$in',
    notIn: '$nin',
    exists: '$exists',
    isEmpty: null, // Special case - needs custom handling
    isNotEmpty: null, // Special case - needs custom handling
  };

  // Helper function to get field type from form definition
  const getFieldType = (fieldName) => {
    if (!formDefinition || !formDefinition.sections) {
      return null;
    }

    // Search through sections to find the field
    for (const section of formDefinition.sections) {
      if (section.fields && Array.isArray(section.fields)) {
        for (const field of section.fields) {
          if (field.name === fieldName || field.id === fieldName) {
            return field.type;
          }
        }
      }
    }
    return null;
  };

  // Helper function to check if a string is a valid MongoDB ObjectId
  const isValidObjectId = (str) => {
    return typeof str === 'string' && /^[0-9a-fA-F]{24}$/.test(str);
  };

  // Helper function to convert value based on field type
  const convertValue = (value, fieldType, fieldName) => {
    if (value === null || value === undefined) {
      return value;
    }

    // Check if value looks like an ObjectId (24 hex characters)
    // This is useful for fields like form_response_field, formId, submittedBy, etc.
    if (typeof value === 'string' && isValidObjectId(value)) {
      return new mongoose.Types.ObjectId(value);
    }

    switch (fieldType) {
      case 'number':
      case 'integer':
        return Number(value);
      case 'date':
      case 'datetime':
        return new Date(value);
      case 'boolean':
        return value === 'true' || value === true;
      default:
        return value;
    }
  };

  // Process each filter condition
  for (const [fieldName, condition] of Object.entries(filterObj)) {
    if (!condition || typeof condition !== 'object') {
      continue;
    }

    const { operator, value } = condition;

    if (!operator) {
      continue;
    }

    // Determine if this is a payload field or a top-level field
    const isPayloadField = !['formId', 'submittedBy', 'createdAt', 'updatedAt', '_id', 'form_response_field'].includes(fieldName);
    const mongoFieldName = isPayloadField ? `payload.${fieldName}` : fieldName;

    // Get field type for value conversion
    const fieldType = getFieldType(fieldName);

    // Handle special operators
    if (operator === 'isEmpty') {
      mongoFilter[mongoFieldName] = {
        $or: [
          { [mongoFieldName]: { $exists: false } },
          { [mongoFieldName]: null },
          { [mongoFieldName]: '' },
        ],
      };
      continue;
    }

    if (operator === 'isNotEmpty') {
      mongoFilter[mongoFieldName] = {
        $and: [
          { [mongoFieldName]: { $exists: true } },
          { [mongoFieldName]: { $ne: null } },
          { [mongoFieldName]: { $ne: '' } },
        ],
      };
      continue;
    }

    // Handle contains/notContains with regex
    if (operator === 'contains') {
      const convertedValue = typeof value === 'string' ? value : String(value);
      mongoFilter[mongoFieldName] = {
        $regex: convertedValue,
        $options: 'i', // Case insensitive
      };
      continue;
    }

    if (operator === 'notContains') {
      const convertedValue = typeof value === 'string' ? value : String(value);
      mongoFilter[mongoFieldName] = {
        $not: {
          $regex: convertedValue,
          $options: 'i',
        },
      };
      continue;
    }

    // Handle in/notIn operators (expect array values)
    if (operator === 'in' || operator === 'notIn') {
      const mongoOp = operatorMap[operator];
      const values = Array.isArray(value) ? value : [value];
      const convertedValues = values.map(v => convertValue(v, fieldType, fieldName));
      mongoFilter[mongoFieldName] = { [mongoOp]: convertedValues };
      continue;
    }

    // Handle exists operator
    if (operator === 'exists') {
      mongoFilter[mongoFieldName] = { $exists: value === true || value === 'true' };
      continue;
    }

    // Handle standard operators
    const mongoOp = operatorMap[operator];
    if (mongoOp) {
      const convertedValue = convertValue(value, fieldType, fieldName);
      
      // For equals operator, use direct value assignment (MongoDB default)
      if (operator === 'equals') {
        mongoFilter[mongoFieldName] = convertedValue;
      } else {
        mongoFilter[mongoFieldName] = { [mongoOp]: convertedValue };
      }
    }
  }

  return mongoFilter;
};


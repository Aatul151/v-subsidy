import mongoose from 'mongoose';

/**
 * Get field type from form definition
 * @param {Object} formDefinition - Form definition object
 * @param {string} fieldPath - Field path (e.g., "name" or "address.street")
 * @returns {string|null} - Field type or null if not found
 */
export function getFieldTypeFromForm(formDefinition, fieldPath) {
  if (!formDefinition || !formDefinition.sections) {
    return null;
  }

  const pathParts = fieldPath.split('.');
  const fieldName = pathParts[0]; // Get base field name (ignore array indices)

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
}

/**
 * Convert value based on field type
 * @param {*} value - Value to convert
 * @param {string} fieldType - Field type from form definition
 * @returns {*} - Converted value
 */
export function convertValueByType(value, fieldType) {
  if (value === null || value === undefined || value === '') {
    return value;
  }

  // Handle ObjectId strings
  if (typeof value === 'string' && mongoose.Types.ObjectId.isValid(value) && value.length === 24) {
    // Check if it's meant to be an ObjectId (for reference fields)
    if (fieldType === 'formReference' || fieldType === 'apiReference') {
      return new mongoose.Types.ObjectId(value);
    }
  }

  switch (fieldType) {
    case 'number':
    case 'integer':
      const num = Number(value);
      return isNaN(num) ? value : num;

    case 'date':
    case 'datetime':
      const date = new Date(value);
      return isNaN(date.getTime()) ? value : date;

    case 'boolean':
    case 'toggle':
      if (typeof value === 'string') {
        return value.toLowerCase() === 'true' || value === '1' || value === 'yes';
      }
      return Boolean(value);

    case 'array':
      // If value is a string, try to parse as JSON or split by comma
      if (typeof value === 'string') {
        try {
          const parsed = JSON.parse(value);
          return Array.isArray(parsed) ? parsed : [parsed];
        } catch {
          // If not JSON, split by comma
          return value.split(',').map(v => v.trim()).filter(v => v);
        }
      }
      return Array.isArray(value) ? value : [value];

    default:
      return value;
  }
}

/**
 * Flatten payload for CSV export
 * Handles nested objects and arrays with indexed columns
 * @param {Object} payload - Payload object
 * @param {string} prefix - Field prefix for nested fields
 * @param {Object} result - Result object
 * @param {Object} options - Options (maxArraySize)
 * @returns {Object} - Flattened object
 */
export function flattenPayload(payload, prefix = '', result = {}, options = {}) {
  const { maxArraySize = 10 } = options;

  for (const [key, value] of Object.entries(payload)) {
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (value === null || value === undefined) {
      result[newKey] = '';
    } else if (Array.isArray(value)) {
      // Handle MongoDB arrays
      if (value.length === 0) {
        result[newKey] = '';
      } else if (typeof value[0] === 'object' && value[0] !== null && !(value[0] instanceof Date)) {
        // Array of objects: create indexed columns
        value.slice(0, maxArraySize).forEach((item, index) => {
          if (typeof item === 'object' && item !== null) {
            Object.entries(item).forEach(([prop, val]) => {
              const indexedKey = `${newKey}.${index}.${prop}`;
              if (val === null || val === undefined) {
                result[indexedKey] = '';
              } else if (Array.isArray(val)) {
                // Nested array: join with comma
                result[indexedKey] = val.join(',');
              } else if (typeof val === 'object' && val.constructor === Object) {
                // Nested object: recurse
                flattenPayload(val, `${newKey}.${index}.${prop}`, result, options);
              } else {
                result[indexedKey] = val;
              }
            });
          }
        });
      } else {
        // Simple array: comma-separated
        result[newKey] = value.join(',');
      }
    } else if (value && value.constructor && value.constructor.name === 'ObjectId') {
      // MongoDB ObjectId
      result[newKey] = value.toString();
    } else if (typeof value === 'object' && value.constructor === Object) {
      // Nested object: recurse
      flattenPayload(value, newKey, result, options);
    } else {
      // Primitive value
      result[newKey] = value;
    }
  }

  return result;
}

/**
 * Unflatten CSV row to payload structure
 * Converts indexed columns back to arrays and nested objects
 * @param {Object} flatRow - Flattened row object
 * @param {Object} formDefinition - Form definition for type conversion
 * @returns {Object} - Unflattened payload object
 */
export function unflattenPayload(flatRow, formDefinition = null) {
  const result = {};

  for (const [key, value] of Object.entries(flatRow)) {
    // Skip metadata fields
    if (['_id', 'formId', 'submittedBy', 'createdAt', 'updatedAt'].includes(key)) {
      continue;
    }

    const keys = key.split('.');
    let current = result;

    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!current[k]) {
        current[k] = {};
      }
      current = current[k];
    }

    const lastKey = keys[keys.length - 1];
    const fieldPath = key.replace(/\.\d+\./g, '.').replace(/\.\d+$/, ''); // Remove indices for type lookup
    const fieldType = formDefinition ? getFieldTypeFromForm(formDefinition, fieldPath) : null;

    // Convert value based on type
    let convertedValue = convertValueByType(value, fieldType);

    // Handle simple arrays (comma-separated values)
    if (typeof convertedValue === 'string' && convertedValue.includes(',') &&
      fieldType !== 'formReference' && fieldType !== 'apiReference' &&
      !convertedValue.startsWith('{') && !convertedValue.startsWith('[')) {
      convertedValue = convertedValue.split(',').map(v => v.trim()).filter(v => v);
    }

    current[lastKey] = convertedValue;
  }

  // Clean up empty objects in arrays
  function cleanArrays(obj) {
    for (const [key, value] of Object.entries(obj)) {
      if (Array.isArray(value)) {
        obj[key] = value.filter(item => {
          if (typeof item === 'object' && item !== null) {
            const hasValues = Object.values(item).some(v => v !== '' && v !== null && v !== undefined);
            if (hasValues) {
              cleanArrays(item);
              return true;
            }
            return false;
          }
          return item !== '' && item !== null && item !== undefined;
        });
      } else if (typeof value === 'object' && value !== null) {
        cleanArrays(value);
      }
    }
  }

  cleanArrays(result);
  return result;
}

/**
 * Get all field paths from form definition for CSV headers (payload fields only)
 * Extracts simple field names and labels directly from form definition sections
 * @param {Object} formDefinition - Form definition
 * @returns {Array} - Array of header objects with id (field name) and title (field label)
 */
export function getCSVHeaders(formDefinition) {
  const headers = [];

  formDefinition?.sections?.forEach(section => {
    section.fields?.forEach(field => {
      const fieldName = field.name;
      const fieldLabel = field.name;

      headers.push({
        id: fieldName,
        title: fieldLabel
      });

    });
  });

  return headers;
}

export default {
  flattenPayload,
  unflattenPayload,
  getCSVHeaders,
  getFieldTypeFromForm,
  convertValueByType,
};

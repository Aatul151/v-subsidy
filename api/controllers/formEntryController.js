import FormDefinition from '../models/FormDefinition.js';
import Module from '../models/Module.js';
import { getFormEntryModel } from '../helpers/formEntryModelFactory.js';
import { validateModuleAccess } from '../services/permissionService.js';
import { buildMongoFilter } from '../utils/buildMongoFilter.js';
import { populateReferences, populateReferencesBatch, getReferenceLabel, resolveReferenceLabel } from '../utils/populateReferences.js';
import { sendNotificationByDeliveryMode } from '../services/notificationService.js';
import { flattenPayload, unflattenPayload, getCSVHeaders } from '../utils/formEntryTransformer.js';
import { extractReferenceFields } from '../utils/extractReferenceFields.js';
import csv from 'csv-parser';
import { Readable } from 'stream';
import fs from 'fs';
import logger from '../config/logger.js';

/**
 * @desc    Create a new form entry
 * @route   POST /api/form-entries
 * @access  Protected
 * 
 * @example
 * // Request body:
 * {
 *   "formName": "admission2025",
 *   "name": "John Doe",
 *   "email": "john@example.com",
 *   "age": 20
 * }
 */
export const createFormEntry = async (req, res) => {
  try {
    const { formName, payload } = req.body;

    if (!formName) {
      return res.status(400).json({
        success: false,
        message: 'Form name is required',
      });
    }

    // Validate payload is not empty
    if (!payload || Object.keys(payload).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Payload data is required and cannot be empty',
      });
    }

    // Fetch form definition by name with module populated
    const form = await FormDefinition.findOne({ name: formName }).populate('module');

    if (!form) {
      logger.warn(`Form definition not found: ${formName}`);
      return res.status(404).json({
        success: false,
        message: 'Form definition not found',
      });
    }

    if (!form.module) {
      return res.status(400).json({
        success: false,
        message: 'Form definition has no associated module',
      });
    }

    // Validate module access using form object (checks isPublic setting)
    const accessCheck = await validateModuleAccess(req.user.role, form, 'create');
    if (!accessCheck.allowed) {
      return res.status(403).json({
        success: false,
        message: accessCheck.message,
      });
    }

    // Load model dynamically - use collectionName if provided, otherwise use module name
    const EntryModel = getFormEntryModel(form);
    // Create form entry
    // Store form definition _id in formId field
    const formEntry = await EntryModel.create({
      formId: form._id,
      submittedBy: req.user._id,
      payload: payload,
    });

    logger.info(`Form entry created: ${formEntry._id} for form: ${formName}`);

    if (formName === 'school_notification_master') {
      try {
        await sendNotificationByDeliveryMode(payload);
      } catch (notifErr) {
        logger.warn('Notification send failed (entry still saved)', { error: notifErr.message });
      }
    }

    res.status(201).json({
      success: true,
      data: formEntry,
    });
  } catch (error) {
    logger.error('Create form entry error:', {
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
 * @desc    Get form entry by ID
 * @route   GET /api/form-entries/:id
 * @access  Protected
 */
export const getFormEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const { formName } = req.query;

    if (!formName) {
      return res.status(400).json({
        success: false,
        message: 'Form name is required as query parameter',
      });
    }

    // Fetch form definition by name with module populated
    const form = await FormDefinition.findOne({ name: formName }).populate('module');

    if (!form) {
      return res.status(404).json({
        success: false,
        message: 'Form definition not found',
      });
    }

    if (!form.module) {
      return res.status(400).json({
        success: false,
        message: 'Form definition has no associated module',
      });
    }

    // Validate module access using form object (checks isPublic setting)
    const accessCheck = await validateModuleAccess(req.user.role, form, 'read');
    if (!accessCheck.allowed) {
      return res.status(403).json({
        success: false,
        message: accessCheck.message,
      });
    }

    // Load model dynamically - use collectionName if provided, otherwise use module name
    const EntryModel = getFormEntryModel(form);

    // Find entry
    const entry = await EntryModel.findById(id)
      .populate('submittedBy', 'name email')
      .populate('formId', 'title name module');

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Form entry not found',
      });
    }

    const populatedEntry = await populateReferences(entry, form);

    res.status(200).json({
      success: true,
      data: populatedEntry,
    });
  } catch (error) {
    logger.error('Get form entry error:', {
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
 * @desc    Get all form entries for a form (with pagination)
 * @route   GET /api/form-entries
 * @access  Protected
 * 
 * @example
 * // Query params: 
 * // ?formName=admission2025&page=1&limit=10
 * // ?formName=admission2025&page=2&limit=20
 * // ?formName=admission2025&page=1&limit=10&fields=payload,submittedBy,createdAt
 * // ?formName=admission2025&fields=-payload (exclude payload field)
 * // ?formName=admission2025&fields=payload,submittedBy (include only specific fields)
 * // ?formName=admission2025&fields=payload.abc,payload.xyz (select nested payload fields)
 * // ?formName=admission2025&fields=payload.abc,submittedBy,createdAt (mix nested and top-level fields)
 * // ?formName=admission2025&filter={"field_7":{"operator":"lessThan","value":"2025-12-23T18:30:00.000Z"},"field_1":{"operator":"equals","value":"5"}}
 */
export const getFormEntries = async (req, res) => {
  try {
    const { formName, page = 1, limit = 10, fields, filters } = req.query;

    if (!formName) {
      return res.status(400).json({
        success: false,
        message: 'Form name is required as query parameter',
      });
    }

    // Parse pagination parameters
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);

    // Validate pagination parameters
    if (pageNumber < 1 || limitNumber < 1) {
      return res.status(400).json({
        success: false,
        message: 'Page and limit must be positive numbers',
      });
    }

    // Calculate skip value
    const skip = (pageNumber - 1) * limitNumber;

    // Fetch form definition by name with module populated
    const form = await FormDefinition.findOne({ name: formName }).populate('module');

    if (!form) {
      return res.status(404).json({
        success: false,
        message: 'Form definition not found',
      });
    }

    if (!form.module) {
      return res.status(400).json({
        success: false,
        message: 'Form definition has no associated module',
      });
    }

    // Validate module access using form object (checks isPublic setting)
    const accessCheck = await validateModuleAccess(req.user.role, form, 'read');
    if (!accessCheck.allowed) {
      return res.status(403).json({
        success: false,
        message: accessCheck.message,
      });
    }

    // Load model dynamically - use collectionName if provided, otherwise use module name
    const EntryModel = getFormEntryModel(form);

    // Build base query
    const query = { formId: form._id };

    // Parse and apply filter if provided
    if (filters) {
      try {
        // Parse filter JSON string
        const filterObj = typeof filters === 'string' ? JSON.parse(filters) : filters || {};

        // Convert filter object to MongoDB filter query
        const mongoFilter = buildMongoFilter(filterObj, form);
        // Merge with base query
        Object.assign(query, mongoFilter);
      } catch (filterError) {
        logger.warn('Invalid filter JSON:', { filter, error: filterError.message });
        return res.status(400).json({
          success: false,
          message: 'Invalid filter JSON format',
          error: process.env.NODE_ENV === 'development' ? filterError.message : undefined,
        });
      }
    }

    // Get total count of documents (for pagination metadata)
    const total = await EntryModel.countDocuments(query);

    // Parse field selection
    const selectedFields = fields;

    // Build the query chain
    let entriesQuery = EntryModel.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNumber);

    // Apply field selection if provided
    if (selectedFields) {
      // Parse comma-separated fields and trim whitespace
      const fieldList = selectedFields.split(',').map(field => field.trim()).filter(field => field);
      if (fieldList.length > 0) {
        // Mongoose select supports dot notation for nested fields (e.g., payload.abc)
        entriesQuery = entriesQuery.select(fieldList.join(' '));
      }
    } else {
      entriesQuery = entriesQuery.populate('submittedBy', 'name email')
      entriesQuery = entriesQuery.populate('formId', 'title name module')
    }

    // Execute query
    const entries = await entriesQuery;

    // Populate reference fields from FormDefinition at runtime (batch operation)
    // Adds populated data with _ref suffix (e.g., assign_house_ref) without modifying original payload
    const populatedEntries = await populateReferencesBatch(entries, form);
    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limitNumber);
    const hasNextPage = pageNumber < totalPages;
    const hasPrevPage = pageNumber > 1;

    res.status(200).json({
      success: true,
      pagination: {
        currentPage: pageNumber,
        limit: limitNumber,
        total,
        totalPages,
        hasNextPage,
        hasPrevPage,
      },
      count: populatedEntries.length,
      data: populatedEntries,
    });
  } catch (error) {
    logger.error('Get form entries error:', {
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
 * @desc    Get grouped form entries by field with counts
 * @route   GET /api/form-entries/group
 * @access  Protected
 * 
 * Returns grouped data with counts instead of individual entries.
 * Useful for statistics and aggregations.
 * 
 * @example
 * // Query params:
 * // ?formName=admission2025&groupBy=category
 * // ?formName=admission2025&groupBy=payload.category (explicit payload path)
 * // ?formName=admission2025&groupBy=category&filters={"field_1":{"operator":"equals","value":"5"}}

 */
export const getFormEntriesGrouped = async (req, res) => {
  try {
    const { formName, groupBy, filters } = req.query;

    if (!formName) {
      return res.status(400).json({
        success: false,
        message: 'Form name is required as query parameter',
      });
    }

    if (!groupBy) {
      return res.status(400).json({
        success: false,
        message: 'groupBy parameter is required',
      });
    }

    // Fetch form definition by name with module populated
    const form = await FormDefinition.findOne({ name: formName }).populate('module');

    if (!form) {
      return res.status(404).json({
        success: false,
        message: 'Form definition not found',
      });
    }

    if (!form.module) {
      return res.status(400).json({
        success: false,
        message: 'Form definition has no associated module',
      });
    }

    // Validate module access using form object (checks isPublic setting)
    const accessCheck = await validateModuleAccess(req.user.role, form, 'read');
    if (!accessCheck.allowed) {
      return res.status(403).json({
        success: false,
        message: accessCheck.message,
      });
    }

    // Load model dynamically - use collectionName if provided, otherwise use module name
    const EntryModel = getFormEntryModel(form);

    // Build base query
    const query = { formId: form._id };

    // Parse and apply filter if provided
    if (filters) {
      try {
        // Parse filter JSON string
        const filterObj = typeof filters === 'string' ? JSON.parse(filters) : filters || {};

        // Convert filter object to MongoDB filter query
        const mongoFilter = buildMongoFilter(filterObj, form);
        // Merge with base query
        Object.assign(query, mongoFilter);
      } catch (filterError) {
        logger.warn('Invalid filter JSON:', { filters, error: filterError.message });
        return res.status(400).json({
          success: false,
          message: 'Invalid filter JSON format',
          error: process.env.NODE_ENV === 'development' ? filterError.message : undefined,
        });
      }
    }

    // Build aggregation pipeline for grouping
    const groupField = groupBy.trim();
    
    // Determine the field path - if it doesn't start with 'payload.', add it
    const fieldPath = groupField.startsWith('payload.') 
      ? groupField 
      : `payload.${groupField}`;

    // Build aggregation pipeline
    const pipeline = [
      // Match stage - apply filters
      { $match: query },
      // Group stage - group by the specified field and count
      {
        $group: {
          _id: `$${fieldPath}`,
          count: { $sum: 1 }
        }
      },
      // Project stage - format output
      {
        $project: {
          _id: 0,
          name: {
            $cond: {
              if: { $eq: ['$_id', null] },
              then: null,
              else: '$_id'
            }
          },
          count: 1
        }
      },
      // Sort by count descending (most common first)
      { $sort: { count: -1 } }
    ];

    // Execute aggregation
    const groupedResults = await EntryModel.aggregate(pipeline);

    // Get total count of unique groups
    const totalGroups = groupedResults.length;

    // Get total count of all documents matching the query
    const totalDocuments = await EntryModel.countDocuments(query);

    res.status(200).json({
      success: true,
      groupBy: groupField,
      totalGroups,
      totalDocuments,
      count: groupedResults.length,
      data: groupedResults,
    });
  } catch (error) {
    logger.error('Get form entries grouped error:', {
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
 * @desc    Update form entry
 * @route   PUT /api/form-entries/:id
 * @access  Protected
 * 
 * @example
 * // Request body:
 * {
 *   "formName": "admission2025",
 *   "name": "Jane Doe",
 *   "email": "jane@example.com"
 * }
 */
export const updateFormEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const { formName, payload } = req.body;

    if (!formName) {
      return res.status(400).json({
        success: false,
        message: 'Form name is required',
      });
    }

    // Validate payload is not empty
    if (!payload || Object.keys(payload).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Payload data is required and cannot be empty',
      });
    }

    // Fetch form definition by name with module populated
    const form = await FormDefinition.findOne({ name: formName }).populate('module');

    if (!form) {
      return res.status(404).json({
        success: false,
        message: 'Form definition not found',
      });
    }

    if (!form.module) {
      return res.status(400).json({
        success: false,
        message: 'Form definition has no associated module',
      });
    }

    // Validate module access using form object (checks isPublic setting)
    const accessCheck = await validateModuleAccess(req.user.role, form, 'update');
    if (!accessCheck.allowed) {
      return res.status(403).json({
        success: false,
        message: accessCheck.message,
      });
    }

    // Load model dynamically - use collectionName if provided, otherwise use module name
    const EntryModel = getFormEntryModel(form);

    // Update entry
    const entry = await EntryModel.findByIdAndUpdate(
      id,
      { payload: payload },
      { new: true, runValidators: true }
    );

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Form entry not found',
      });
    }

    logger.info(`Form entry updated: ${entry._id} for form: ${formName}`);

    res.status(200).json({
      success: true,
      data: entry,
    });
  } catch (error) {
    logger.error('Update form entry error:', {
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
 * @desc    Delete form entry
 * @route   DELETE /api/form-entries/:id
 * @access  Protected
 * 
 * @example
 * // Query params: ?formName=admission2025
 */
export const deleteFormEntry = async (req, res) => {
  try {
    // Block guest users from deleting entries
    if (req.user.role === 'guest') {
      return res.status(403).json({
        success: false,
        message: 'Guest users cannot delete form entries. Read-only access is available.',
      });
    }

    const { id } = req.params;
    const { formName } = req.query;

    if (!formName) {
      return res.status(400).json({
        success: false,
        message: 'Form name is required as query parameter',
      });
    }

    // Fetch form definition by name with module populated
    const form = await FormDefinition.findOne({ name: formName }).populate('module');

    if (!form) {
      return res.status(404).json({
        success: false,
        message: 'Form definition not found',
      });
    }

    if (!form.module) {
      return res.status(400).json({
        success: false,
        message: 'Form definition has no associated module',
      });
    }

    // Validate module access using form object (checks isPublic setting)
    const accessCheck = await validateModuleAccess(req.user.role, form, 'delete');
    if (!accessCheck.allowed) {
      return res.status(403).json({
        success: false,
        message: accessCheck.message,
      });
    }

    // Load model dynamically - use collectionName if provided, otherwise use module name
    const EntryModel = getFormEntryModel(form);

    // Delete entry
    const entry = await EntryModel.findByIdAndDelete(id);

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Form entry not found',
      });
    }

    logger.info(`Form entry deleted: ${id} for form: ${formName}`);

    res.status(200).json({
      success: true,
      message: 'Form entry deleted successfully',
      data: {},
    });
  } catch (error) {
    logger.error('Delete form entry error:', {
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
 * @desc    Export form entries to CSV
 * @route   GET /api/form-entries/export/csv
 * @access  Protected
 * 
 * Exports ONLY payload fields (no metadata like _id, formId, submittedBy, createdAt, updatedAt).
 * Arrays of objects are exported as indexed columns (e.g., familyMembers.0.name).
 * Simple arrays are comma-separated.
 * 
 * @example
 * // Query params:
 * // ?formName=admission2025
 * // ?formName=admission2025&filters={"name":{"operator":"contains","value":"John"}}
 * // ?formName=admission2025&limit=1000 (max entries to export)
 */
export const exportFormEntries = async (req, res) => {
  try {
    const { formName, filters, limit = 100000 } = req.query;

    if (!formName) {
      return res.status(400).json({
        success: false,
        message: 'Form name is required as query parameter',
      });
    }

    // Fetch form definition by name with module populated
    const form = await FormDefinition.findOne({ name: formName }).populate('module');

    if (!form) {
      return res.status(404).json({
        success: false,
        message: 'Form definition not found',
      });
    }

    if (!form.module) {
      return res.status(400).json({
        success: false,
        message: 'Form definition has no associated module',
      });
    }

    // Validate module access
    const accessCheck = await validateModuleAccess(req.user.role, form, 'read');
    if (!accessCheck.allowed) {
      return res.status(403).json({
        success: false,
        message: accessCheck.message,
      });
    }

    // Load model dynamically
    const EntryModel = getFormEntryModel(form);

    // Build query
    const query = { formId: form._id };

    // Parse and apply filter if provided
    if (filters) {
      try {
        const filterObj = typeof filters === 'string' ? JSON.parse(filters) : filters || {};
        const mongoFilter = buildMongoFilter(filterObj, form);
        Object.assign(query, mongoFilter);
      } catch (filterError) {
        logger.warn('Invalid filter JSON:', { filters, error: filterError.message });
        return res.status(400).json({
          success: false,
          message: 'Invalid filter JSON format',
          error: process.env.NODE_ENV === 'development' ? filterError.message : undefined,
        });
      }
    }

    // Fetch entries (limit for export)
    const limitNumber = Math.min(parseInt(limit, 10) || 10000, 50000); // Max 50k entries
    const entries = await EntryModel.find(query)
      .populate('submittedBy', 'name email')
      .populate('formId', 'title name')
      .sort({ createdAt: -1 })
      .limit(limitNumber)
      .lean();

    if (entries.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No entries found to export',
      });
    }

    // Populate reference fields (adds _ref suffix with populated data)
    const populatedEntries = await populateReferencesBatch(entries, form);

    // Extract reference fields configuration from form definition
    const referenceFields = extractReferenceFields(form);
    const referenceFieldsMap = new Map();
    referenceFields.forEach(refField => {
      referenceFieldsMap.set(refField.name, refField);
    });
    // Flatten entries for CSV - ONLY payload fields (no metadata)
    // Replace reference IDs with labels
    const flattenedEntries = populatedEntries.map(entry => {
      const entryObj = entry?.toObject ? entry.toObject() : entry;
      let payload = { ...(entryObj.payload || {}) };

      // Replace reference field IDs with labels
      referenceFields.forEach(refField => {
        const fieldName = refField.name;
        if (payload[fieldName] !== undefined && payload[fieldName] !== null) {
          const label = getReferenceLabel(fieldName, entryObj, refField);
          if (label !== null) {
            payload[fieldName] = label;
          }
        }
      });

      // Flatten payload
      const flattenedPayload = flattenPayload(payload, '', {}, { maxArraySize: 10 });
      return flattenedPayload;
    });

    // Get CSV headers from form definition (ensures consistent column order and includes all fields)
    const csvHeaders = getCSVHeaders(form);

    // Set response headers
    const filename = `${formName}_export_${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Write CSV headers manually
    const headerRow = csvHeaders.map(h => {
      const title = h.title;
      if (title.includes(',') || title.includes('"') || title.includes('\n')) {
        return `"${title.replace(/"/g, '""')}"`;
      }
      return title;
    }).join(',') + '\n';

    // Write data rows
    const dataRows = flattenedEntries.map(entry => {
      return csvHeaders.map(header => {
        const value = entry[header.id];
        if (value === null || value === undefined) {
          return '';
        }
        // Escape commas and quotes in CSV
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(',');
    }).join('\n');

    const finalCsv = headerRow + dataRows;

    logger.info(`Form entries exported: ${entries.length} entries for form: ${formName} by user: ${req.user.email}`);

    res.send(finalCsv);
  } catch (error) {
    logger.error('Export form entries error:', {
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
 * @desc    Import form entries from CSV
 * @route   POST /api/form-entries/import/csv
 * @access  Protected
 * 
 * @example
 * // Form data:
 * // formName: "admission2025"
 * // file: (CSV file)
 * // options: {"skipErrors": true, "updateExisting": false} (optional)
 */
export const importFormEntries = async (req, res) => {
  try {
    const { formName, options } = req.body;
    const file = req.file;

    if (!formName) {
      return res.status(400).json({
        success: false,
        message: 'Form name is required',
      });
    }

    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'CSV file is required',
      });
    }

    // Parse options
    const importOptions = {
      skipErrors: options?.skipErrors === true || options?.skipErrors === 'true' || false,
      updateExisting: options?.updateExisting === true || options?.updateExisting === 'true' || false,
      dryRun: options?.dryRun === true || options?.dryRun === 'true' || false,
    };

    // Fetch form definition by name with module populated
    const form = await FormDefinition.findOne({ name: formName }).populate('module');

    if (!form) {
      return res.status(404).json({
        success: false,
        message: 'Form definition not found',
      });
    }

    if (!form.module) {
      return res.status(400).json({
        success: false,
        message: 'Form definition has no associated module',
      });
    }

    // Validate module access
    const accessCheck = await validateModuleAccess(req.user.role, form, 'create');
    if (!accessCheck.allowed) {
      return res.status(403).json({
        success: false,
        message: accessCheck.message,
      });
    }

    // Load model dynamically
    const EntryModel = getFormEntryModel(form);

    // Parse CSV file (support both in-memory buffer and disk path from multer)
    const csvRows = [];
    await new Promise((resolve, reject) => {
      const stream = file.buffer
        ? Readable.from(file.buffer.toString('utf-8'))
        : fs.createReadStream(file.path);

      stream
        .pipe(csv())
        .on('data', (row) => {
          csvRows.push(row);
        })
        .on('end', resolve)
        .on('error', reject);
    });

    if (csvRows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'CSV file is empty or invalid',
      });
    }

    // Extract reference fields configuration from form definition
    const referenceFields = extractReferenceFields(form);
    const referenceFieldsMap = new Map();
    referenceFields.forEach(refField => {
      referenceFieldsMap.set(refField.name, refField);
    });

    // Process rows
    const results = {
      total: csvRows.length,
      imported: 0,
      updated: 0,
      failed: 0,
      errors: [],
    };

    for (let i = 0; i < csvRows.length; i++) {
      const row = csvRows[i];
      const rowNumber = i + 2; // +2 because CSV has header and is 1-indexed

      try {
        // Resolve reference field labels to IDs/values before unflattening
        const resolvedRow = { ...row };
        for (const [fieldName, refField] of referenceFieldsMap.entries()) {
          if (resolvedRow[fieldName] !== undefined && resolvedRow[fieldName] !== null && resolvedRow[fieldName] !== '') {
            // Check if value is already an ObjectId (24 hex chars)
            const value = resolvedRow[fieldName];
            if (typeof value === 'string' && /^[0-9a-fA-F]{24}$/.test(value)) {
              // Already an ID, skip resolution
              continue;
            }
            
            // Resolve label to ID/value
            const resolvedId = await resolveReferenceLabel(fieldName, value, refField);
            if (resolvedId !== null) {
              resolvedRow[fieldName] = resolvedId;
            } else {
              // If resolution fails and field is required, throw error
              // Otherwise, set to null/empty
              const fieldConfig = form.sections
                .flatMap(s => s.fields || [])
                .find(f => f.name === fieldName);
              
              if (fieldConfig && fieldConfig.required) {
                throw new Error(`Required reference field "${fieldName}" could not be resolved: "${value}"`);
              } else {
                // Optional field - set to null
                resolvedRow[fieldName] = null;
                logger.warn(`Could not resolve reference label for optional field ${fieldName}: ${value}`);
              }
            }
          }
        }
        // Unflatten CSV row to payload structure
        const payload = unflattenPayload(resolvedRow, form);
        // Skip if payload is empty
        if (!payload || Object.keys(payload).length === 0) {
          if (!importOptions.skipErrors) {
            results.errors.push({
              row: rowNumber,
              error: 'Empty payload',
            });
            results.failed++;
            continue;
          }
          continue;
        }

        // Check if _id exists and updateExisting is true
        // Note: Since export doesn't include _id, updateExisting only works if CSV manually includes _id column
        let entryId = row._id;
        if (entryId && importOptions.updateExisting) {
          // Validate ObjectId format
          if (entryId.match(/^[0-9a-fA-F]{24}$/)) {
            const existingEntry = await EntryModel.findById(entryId);
            if (existingEntry) {
              // Update existing entry
              if (!importOptions.dryRun) {
                existingEntry.payload = payload;
                await existingEntry.save();
              }
              results.updated++;
              continue;
            }
          }
        }

        // Create new entry
        if (!importOptions.dryRun) {
          await EntryModel.create({
            formId: form._id,
            submittedBy: req.user._id,
            payload: payload,
          });
        }
        results.imported++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          row: rowNumber,
          error: error.message,
          data: Object.keys(row).slice(0, 5).reduce((obj, key) => {
            obj[key] = row[key];
            return obj;
          }, {}),
        });

        if (!importOptions.skipErrors) {
          // Stop on first error if skipErrors is false
          break;
        }
      }
    }

    logger.info(`Form entries imported: ${results.imported} imported, ${results.updated} updated, ${results.failed} failed for form: ${formName} by user: ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: importOptions.dryRun
        ? 'Dry run completed. No entries were imported.'
        : 'Import completed',
      data: {
        total: results.total,
        imported: results.imported,
        updated: results.updated,
        failed: results.failed,
        errors: results.errors.slice(0, 100), // Limit errors to first 100
      },
    });
  } catch (error) {
    logger.error('Import form entries error:', {
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


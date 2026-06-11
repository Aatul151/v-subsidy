import FormDefinition from '../models/FormDefinition.js';
import { getFormEntryModel } from '../helpers/formEntryModelFactory.js';
import { validateModuleAccess } from '../services/permissionService.js';
import { uploadFile, deleteFile, listFiles, sanitizeFileName } from '../services/fileUploadService.js';
import logger from '../config/logger.js';
import path from 'path';
import fs from 'fs/promises';

/**
 * @desc    Upload file(s) for a form entry
 * @route   POST /api/file-upload
 * @access  Protected
 * 
 * @example
 * // Form data:
 * // formName: "admission2025"
 * // fieldName: "documents" (optional, defaults to "default_documents")
 * // files: (file or multiple files)
 */
export const uploadFiles = async (req, res) => {
  try {
    const { formName, fieldName } = req.body;

    if (!formName) {
      return res.status(400).json({
        success: false,
        message: 'Form name is required',
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
    const accessCheck = await validateModuleAccess(req.user.role, form, 'update');
    if (!accessCheck.allowed) {
      return res.status(403).json({
        success: false,
        message: accessCheck.message,
      });
    }

    // Get files from request
    // Multer stores files in req.files array when using upload.array()
    // If single file uploaded, it will still be in req.files array with one element
    const files = req.files || [];

    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded. Please use the "files" field in your form data.',
      });
    }

    // Upload files
    const uploadResults = [];
    const formSysName = form.name; // Use form name as system name
    // Use fieldName or default to 'default_documents'
    const folderName = fieldName || 'default_documents';
    // Build file directory path relative to MEDIA_BASE_DIR
    const fileDir = `Forms/${formSysName}/${folderName}`;

    for (const file of files) {
      const tempFilePath = file.path;

      try {
        // Read file from disk (since we're using diskStorage now)
        const fileBuffer = await fs.readFile(tempFilePath);

        // Generate unique ID using timestamp + random number to ensure uniqueness
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substring(2, 9); // 7 random characters
        const uniqueId = `${timestamp}_${randomSuffix}`;

        // Generate unique filename with unique ID
        const fileExt = path.extname(file.originalname);
        const originalFileNameBase = path.basename(file.originalname, fileExt);
        const sanitizedFileNameBase = sanitizeFileName(originalFileNameBase);
        const uniqueFileName = `${sanitizedFileNameBase}_${uniqueId}${fileExt}`;

        const uploadResult = await uploadFile(
          fileBuffer,
          fileDir,
          uniqueFileName,
          file.mimetype
        );

        uploadResults.push({
          uniqueId: uniqueId, // Store unique ID for future file deletion
          originalName: `${sanitizedFileNameBase}${fileExt}`, // Sanitized original name
          fileName: uniqueFileName,
          fileUrl: uploadResult.fileUrl,
          size: file.size,
          mimetype: file.mimetype,
        });
      } catch (error) {
        logger.error('Error uploading file:', {
          error: error.message,
          fileName: file.originalname,
        });
        uploadResults.push({
          originalName: file.originalname,
          error: error.message,
        });
      }
    }

    logger.info(`Files uploaded for field: ${folderName} in form: ${formName}`);

    res.status(200).json({
      success: true,
      message: `${uploadResults.length} file(s) uploaded successfully`,
      data: uploadResults,
    });
  } catch (error) {
    logger.error('Upload files error:', {
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
 * @desc    Delete a file for a form entry
 * @route   DELETE /api/file-upload/:formName/:formRecordId/:fileName
 * @access  Protected
 */
export const deleteFileFromEntry = async (req, res) => {
  try {
    const { formName, formRecordId, fileName } = req.params;

    if (!formName || !formRecordId || !fileName) {
      return res.status(400).json({
        success: false,
        message: 'Form name, form record ID, and file name are required',
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
    const accessCheck = await validateModuleAccess(req.user.role, form, 'update');
    if (!accessCheck.allowed) {
      return res.status(403).json({
        success: false,
        message: accessCheck.message,
      });
    }

    // Verify form entry exists
    const EntryModel = getFormEntryModel(form);
    const formEntry = await EntryModel.findById(formRecordId);

    if (!formEntry) {
      return res.status(404).json({
        success: false,
        message: 'Form entry not found',
      });
    }

    // Delete file
    const formSysName = form.name;
    const fileDir = `Forms/${formSysName}/${formRecordId}`;
    const deleteResult = await deleteFile(fileDir, fileName);

    if (!deleteResult.success) {
      return res.status(404).json({
        success: false,
        message: deleteResult.message || 'File not found',
      });
    }

    logger.info(`File deleted: ${fileName} for form entry: ${formRecordId} in form: ${formName}`);

    res.status(200).json({
      success: true,
      message: 'File deleted successfully',
      data: {},
    });
  } catch (error) {
    logger.error('Delete file error:', {
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
 * @desc    List all files for a form entry
 * @route   GET /api/file-upload/:formName/:formRecordId
 * @access  Protected
 */
export const listEntryFiles = async (req, res) => {
  try {
    const { formName, formRecordId } = req.params;

    if (!formName || !formRecordId) {
      return res.status(400).json({
        success: false,
        message: 'Form name and form record ID are required',
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

    // Verify form entry exists
    const EntryModel = getFormEntryModel(form);
    const formEntry = await EntryModel.findById(formRecordId);

    if (!formEntry) {
      return res.status(404).json({
        success: false,
        message: 'Form entry not found',
      });
    }

    // List files
    const formSysName = form.name;
    const fileDir = `Forms/${formSysName}/${formRecordId}`;
    const files = await listFiles(fileDir);

    res.status(200).json({
      success: true,
      count: files.length,
      data: files,
    });
  } catch (error) {
    logger.error('List files error:', {
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


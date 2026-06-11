import express from 'express';
import {
  uploadFiles,
  deleteFileFromEntry,
  listEntryFiles,
} from '../controllers/fileUploadController.js';
import { protect } from '../middleware/auth.js';
import { apiLimiter } from '../middleware/rateLimiter.js';
import { uploadMultiple, handleUploadError } from '../middleware/upload.js';

const router = express.Router();

// All routes are protected
router.use(protect);

// File Upload Routes
// Use 'files' field in form data (supports both single and multiple files)
router.post(
  '/',
  uploadMultiple('files', 10), // Accept up to 20 files in 'files' field
  handleUploadError,
  uploadFiles
);

// GET /api/file-upload/:formName/:formRecordId - List all files for a form entry
router.get('/:formName/:formRecordId', listEntryFiles);

// DELETE /api/file-upload/:formName/:formRecordId/:fileName - Delete a file
router.delete('/:formName/:formRecordId/:fileName', deleteFileFromEntry);

export default router;


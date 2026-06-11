import express from 'express';
import {
  createFormEntry,
  getFormEntry,
  getFormEntries,
  getFormEntriesGrouped,
  updateFormEntry,
  deleteFormEntry,
  exportFormEntries,
  importFormEntries,
} from '../controllers/formEntryController.js';
import { protect } from '../middleware/auth.js';
import { apiLimiter } from '../middleware/rateLimiter.js';
import { uploadSingle, handleUploadError } from '../middleware/upload.js';

const router = express.Router();

// All routes are protected and rate-limited
router.use(protect);
router.use(apiLimiter);

// Form Entry Routes
router.post('/', createFormEntry);
router.get('/', getFormEntries);
router.get('/group', getFormEntriesGrouped);
router.get('/export/csv', exportFormEntries);
router.post('/import/csv', uploadSingle('file'), handleUploadError, importFormEntries);
router.get('/:id', getFormEntry);
router.put('/:id', updateFormEntry);
router.delete('/:id', deleteFormEntry);

export default router;


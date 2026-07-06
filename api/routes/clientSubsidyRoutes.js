import express from 'express';
import { protect, requireRoles } from '../middleware/auth.js';
import { createClientCase, getClientCases, getCaseById, updateClientCase, archivedCase, uploadDocument, deleteClientDocument, fetchStatusHistory } from '../controllers/clientSubsidyController.js';
import { uploadMultiple, handleUploadError } from '../middleware/upload.js';

const router = express.Router();

// All routes are protected
router.use(protect);

router.get('/', getClientCases);

router.get('/:id', getCaseById);

router.post('/', createClientCase);

router.put('/:id', updateClientCase);

router.delete('/:id', archivedCase);

router.get('/status-history/:case_id', fetchStatusHistory);

// Doc upload

router.post(
    '/upload-doc',
    uploadMultiple('files', 10), // Accept up to 10 files in 'files' field
    handleUploadError,
    uploadDocument
);

router.delete('/doc/:fileName', deleteClientDocument);


export default router;
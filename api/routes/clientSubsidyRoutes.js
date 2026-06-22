import express from 'express';
import { protect, requireRoles } from '../middleware/auth.js';
import { createClientSubsidy, getClientSubsidies, getClientSubsidyById, updateClientSubsidy, deleteClientSubsidy, uploadDocument } from '../controllers/clientSubsidyController.js';
import { uploadMultiple, handleUploadError } from '../middleware/upload.js';

const router = express.Router();

// All routes are protected
router.use(protect);

router.get('/', getClientSubsidies);

router.get('/:id', getClientSubsidyById);

router.post('/', createClientSubsidy);

router.put('/:id', updateClientSubsidy);

router.delete('/:id', deleteClientSubsidy);

// Doc upload

router.post(
    '/upload-doc',
    uploadMultiple('files', 10), // Accept up to 10 files in 'files' field
    handleUploadError,
    uploadDocument
);


export default router;
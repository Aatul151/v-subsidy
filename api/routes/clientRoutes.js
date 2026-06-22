import express from 'express';
import { protect, requireRoles } from '../middleware/auth.js';
import { createClient, deleteClient, getClientById, getClients, updateClient } from '../controllers/clientController.js';

const router = express.Router();

// All routes are protected
router.use(protect);

router.get('/', getClients);

router.get("/:id", getClientById);

router.post('/', createClient);

router.put('/:id', updateClient);

router.delete('/:id', deleteClient);

export default router;


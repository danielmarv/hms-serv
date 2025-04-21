import express from 'express';
import {
  createRole,
  getRoles,
  updateRole,
  deleteRole
} from '../controllers/roleController.js';

// import { protect, isAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Admin-only for now, adjust per use case
router.post('/', createRole);
router.get('/', getRoles);
router.put('/:id', updateRole);
router.delete('/:id', deleteRole);

export default router;

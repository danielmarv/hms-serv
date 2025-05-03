import express from 'express';
import {
  getRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
  getAvailablePermissions
} from '../controllers/roleController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validateObjectId } from '../middleware/validators.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// Get all roles
router.get('/', authorize(['manage_roles', 'view_all_data']), getRoles);

// Get role by ID
router.get('/:id', validateObjectId('id'), authorize(['manage_roles', 'view_all_data']), getRoleById);

// Create new role - Admin only
router.post('/', authorize(['manage_roles']), createRole);

// Update role
router.put('/:id', validateObjectId('id'), authorize(['manage_roles']), updateRole);

// Delete role - Admin only
router.delete('/:id', validateObjectId('id'), authorize(['manage_roles']), deleteRole);

// Get all available permissions for role assignment
router.get('/permissions/available', authorize(['manage_roles', 'view_all_data']), getAvailablePermissions);

export default router;
import express from 'express';
import {
  createPermission,
  getPermissions,
  updatePermission,
  deletePermission
} from '../controllers/permissionController.js';

import { authenticate } from '../middleware/auth.js';

const router = express.Router();


router.use(authenticate)
router.post('/',  createPermission);
router.get('/',  getPermissions);
router.patch('/:id',  updatePermission);
router.delete('/:id', deletePermission);

export default router;

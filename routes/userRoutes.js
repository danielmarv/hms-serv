import express from 'express';
import {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  updateUserStatus,
  assignRoleToUser,
//   assignPermissionsToUser
} from '../controllers/userController.js';

import { isAuthenticated } from '../middlewares/authMiddleware.js';
import { hasPermission } from '../middlewares/permissionMiddleware.js';

const router = express.Router();

// router.use(isAuthenticated);

router.get('/',  getAllUsers);
router.get('/:id', hasPermission('view_user_detail'), getUserById);
router.put('/:id', hasPermission('edit_user'), updateUser);
router.delete('/:id', hasPermission('delete_user'), deleteUser);
router.patch('/:id/status', hasPermission('change_user_status'), updateUserStatus);
router.patch('/:id/role', hasPermission('assign_role'), assignRoleToUser);
// router.patch('/:id/permissions', hasPermission('assign_permissions'), assignPermissionsToUser);

export default router;

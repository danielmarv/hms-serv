import express from "express"
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  updateUserStatus,
  assignRoleToUser,
  assignCustomPermissions,
  getUserPermissions,
  assignHotelAccess,
  removeHotelAccess,
  getUserHotelAccess
} from "../controllers/userController.js"
import { authenticate, authorize } from "../middleware/auth.js"
import { validateObjectId, validateUserUpdate, validate } from "../middleware/validators.js"

const router = express.Router()

// Apply authentication middleware to all routes
router.use(authenticate)

// Get all users - Admin and managers only
router.get("/", authorize(["manage_users", "view_all_data"]), getAllUsers)

// Get user by ID
router.get("/:id", validateObjectId("id"), authorize(["manage_users", "view_all_data"]), getUserById)

// Create user - Admin only
router.post("/", authorize(["manage_users"]), validateUserUpdate, validate, createUser)

// Update user
router.put("/:id", validateObjectId("id"), authorize(["manage_users"]), validateUserUpdate, validate, updateUser)

// Delete user - Admin only
router.delete("/:id", validateObjectId("id"), authorize(["manage_users"]), deleteUser)

// Update user status
router.patch("/:id/status", validateObjectId("id"), authorize(["manage_users"]), updateUserStatus)

// Assign role to user - Admin only
router.patch("/:id/role", validateObjectId("id"), authorize(["manage_users", "manage_roles"]), assignRoleToUser)

// Assign custom permissions to user - Admin only
router.patch(
  "/:id/permissions",
  validateObjectId("id"),
  authorize(["manage_users", "manage_roles"]),
  assignCustomPermissions,
)

// Get user permissions
router.get(
  "/:id/permissions",
  validateObjectId("id"),
  authorize(["manage_users", "manage_roles", "view_all_data"]),
  getUserPermissions,
)

// Hotel access management routes
// Assign hotel access to user
router.post(
  "/:id/hotels",
  validateObjectId("id"),
  authorize(["manage_users", "manage_hotel_access"]),
  assignHotelAccess
)

// Remove hotel access from user
router.delete(
  "/:id/hotels/:hotelId",
  validateObjectId("id"),
  validateObjectId("hotelId"),
  authorize(["manage_users", "manage_hotel_access"]),
  removeHotelAccess
)

// Get user's hotel access
router.get(
  "/:id/hotels",
  validateObjectId("id"),
  authorize(["manage_users", "view_all_data"]),
  getUserHotelAccess
)

export default router
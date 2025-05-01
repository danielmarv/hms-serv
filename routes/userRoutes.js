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
  getUserHotelAccess,
} from "../controllers/userController.js"
import { authenticate, authorize, isAdmin, requireHotelContext } from "../middleware/auth.js"
import { validateObjectId, validateUserUpdate, validate } from "../middleware/validators.js"

const router = express.Router()

// Apply authentication middleware to all routes
router.use(authenticate)

// Global user management routes (admin only)
router.get("/", isAdmin, getAllUsers)
router.post("/", isAdmin, validateUserUpdate, validate, createUser)
router.get("/:id", validateObjectId("id"), isAdmin, getUserById)
router.put("/:id", validateObjectId("id"), isAdmin, validateUserUpdate, validate, updateUser)
router.delete("/:id", validateObjectId("id"), isAdmin, deleteUser)
router.patch("/:id/status", validateObjectId("id"), isAdmin, updateUserStatus)

// Role and permission management
router.patch("/:id/role", validateObjectId("id"), isAdmin, assignRoleToUser)
router.patch("/:id/permissions", validateObjectId("id"), isAdmin, assignCustomPermissions)
router.get("/:id/permissions", validateObjectId("id"), isAdmin, getUserPermissions)

// Hotel access management
router.post("/:id/hotel-access", validateObjectId("id"), isAdmin, assignHotelAccess)
router.delete("/:id/hotel-access/:hotelId", validateObjectId("id"), isAdmin, removeHotelAccess)
router.get("/:id/hotel-access", validateObjectId("id"), isAdmin, getUserHotelAccess)

// Hotel-specific user management routes
router.get("/hotel", requireHotelContext(), authorize("user.view"), getAllUsers) // With hotel filter
router.post("/hotel", requireHotelContext(), authorize("user.create"), validateUserUpdate, validate, createUser) // With hotel context

export default router

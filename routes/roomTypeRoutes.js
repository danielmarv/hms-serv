import express from "express"
import {
  getAllRoomTypes,
  getRoomTypeById,
  createRoomType,
  updateRoomType,
  deleteRoomType,
  getRoomTypeStats,
} from "../controllers/roomTypeController.js"
import { validateCreateRoomType, validateUpdateRoomType, validateObjectId } from "../middleware/validators.js"
import { authenticate, authorize } from "../middleware/auth.js"

const router = express.Router()

// Apply authentication middleware to all routes
router.use(authenticate)

// Get all room types
router.get("/", getAllRoomTypes)

// Get room type statistics
router.get("/stats", getRoomTypeStats)

// Get room type by ID
router.get("/:id", validateObjectId("id"), getRoomTypeById)

// Create new room type (admin only)
router.post("/", authorize(["admin", "manager"]), validateCreateRoomType, createRoomType)

// Update room type (admin only)
router.put("/:id", authorize(["admin", "manager"]), validateUpdateRoomType, updateRoomType)

// Delete room type (admin only)
router.delete("/:id", authorize(["admin", "manager"]), validateObjectId("id"), deleteRoomType)

export default router

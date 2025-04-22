import express from "express"
import {
  getAllRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
  updateRoomStatus,
  getRoomStats,
  connectRooms,
  disconnectRooms,
  getAvailableRooms,
} from "../controllers/roomController.js"
import { validateCreateRoom, validateUpdateRoom, validateObjectId } from "../middleware/validators.js"
import { authenticate, authorize } from "../middleware/auth.js"

const router = express.Router()

// Apply authentication middleware to all routes
router.use(authenticate)

// Get all rooms
router.get("/", getAllRooms)

// Get room statistics
router.get("/stats", getRoomStats)

// Get available rooms for a date range
router.get("/available", getAvailableRooms)

// Get room by ID
router.get("/:id", validateObjectId("id"), getRoomById)

// Create new room (admin/manager only)
router.post("/", authorize(["admin", "manager"]), validateCreateRoom, createRoom)

// Update room (admin/manager only)
router.put("/:id", authorize(["admin", "manager"]), validateUpdateRoom, updateRoom)

// Delete room (admin/manager only)
router.delete("/:id", authorize(["admin", "manager"]), validateObjectId("id"), deleteRoom)

// Update room status
router.patch("/:id/status", authorize(["admin", "manager", "staff"]), validateObjectId("id"), updateRoomStatus)

// Connect rooms (for adjoining rooms)
router.post("/connect", authorize(["admin", "manager"]), connectRooms)

// Disconnect rooms
router.post("/disconnect", authorize(["admin", "manager"]), disconnectRooms)

export default router

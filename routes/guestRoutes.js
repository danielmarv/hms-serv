import express from "express"
import {
  getAllGuests,
  getGuestById,
  createGuest,
  updateGuest,
  deleteGuest,
  getGuestBookingHistory,
  updateGuestLoyalty,
  toggleVipStatus,
  toggleBlacklistStatus,
  getGuestStats,
} from "../controllers/guestController.js"
import { authenticate, authorize } from "../middleware/auth.js"
import { validateObjectId } from "../middleware/validators.js"

const router = express.Router()

// Apply authentication middleware to all routes
router.use(authenticate)

// Get all guests
router.get("/", authorize(["admin", "manager", "receptionist"]), getAllGuests)

// Get guest statistics
router.get("/stats", authorize(["admin", "manager"]), getGuestStats)

// Get guest by ID
router.get("/:id", validateObjectId("id"), authorize(["admin", "manager", "receptionist", "staff"]), getGuestById)

// Get guest booking history
router.get(
  "/:id/bookings",
  validateObjectId("id"),
  authorize(["admin", "manager", "receptionist", "staff"]),
  getGuestBookingHistory,
)

// Create new guest
router.post("/", authorize(["admin", "manager", "receptionist"]), createGuest)

// Update guest
router.put("/:id", validateObjectId("id"), authorize(["admin", "manager", "receptionist"]), updateGuest)

// Delete guest
router.delete("/:id", validateObjectId("id"), authorize(["admin", "manager"]), deleteGuest)

// Update guest loyalty status
router.patch(
  "/:id/loyalty",
  validateObjectId("id"),
  authorize(["admin", "manager", "receptionist"]),
  updateGuestLoyalty,
)

// Toggle guest VIP status
router.patch("/:id/vip", validateObjectId("id"), authorize(["admin", "manager"]), toggleVipStatus)

// Toggle guest blacklist status
router.patch("/:id/blacklist", validateObjectId("id"), authorize(["admin", "manager"]), toggleBlacklistStatus)

export default router

import express from "express"
import {
  getAllBookings,
  getBookingById,
  createBooking,
  updateBooking,
  cancelBooking,
  checkIn,
  checkOut,
  getAvailableRooms,
  getBookingStats,
  getBookingCalendar,
} from "../controllers/bookingController.js"
import { authenticate, authorize } from "../middleware/auth.js"
import { validateObjectId, validateCreateBooking, validateUpdateBooking, validate } from "../middleware/validators.js"

const router = express.Router()

// Apply authentication middleware to all routes
router.use(authenticate)

// Get all bookings
router.get("/", authorize(["admin", "manager", "receptionist"]), getAllBookings)

// Get booking statistics
router.get("/stats", authorize(["admin", "manager"]), getBookingStats)

// Get booking calendar
router.get("/calendar", authorize(["admin", "manager", "receptionist"]), getBookingCalendar)

// Get available rooms for booking
router.get("/available-rooms", authorize(["admin", "manager", "receptionist", "staff"]), getAvailableRooms)

// Get booking by ID
router.get("/:id", validateObjectId("id"), authorize(["admin", "manager", "receptionist", "staff"]), getBookingById)

// Create new booking
router.post("/", authorize(["admin", "manager", "receptionist"]), validateCreateBooking, validate, createBooking)

// Update booking
router.put(
  "/:id",
  validateObjectId("id"),
  authorize(["admin", "manager", "receptionist"]),
  validateUpdateBooking,
  validate,
  updateBooking,
)

// Cancel booking
router.patch("/:id/cancel", validateObjectId("id"), authorize(["admin", "manager", "receptionist"]), cancelBooking)

// Check-in
router.patch("/:id/check-in", validateObjectId("id"), authorize(["admin", "manager", "receptionist"]), checkIn)

// Check-out
router.patch("/:id/check-out", validateObjectId("id"), authorize(["admin", "manager", "receptionist"]), checkOut)

export default router

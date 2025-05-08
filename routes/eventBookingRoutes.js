import express from "express"
import { authenticate, authorize } from "../middleware/auth.js"
import * as eventBookingController from "../controllers/eventBookingController.js"
import { validateBookingRequest } from "../middleware/validationMiddleware.js"

const router = express.Router()

// Apply authentication to all booking routes
router.use(authenticate)

// Booking management routes
router.get("/", authorize(["bookings.view"]), eventBookingController.getAllBookings)

router.get("/:id", authorize(["bookings.view"]), eventBookingController.getBookingById)

router.post("/", authorize(["bookings.create"]), validateBookingRequest, eventBookingController.createBooking)

router.put("/:id", authorize(["bookings.update"]), validateBookingRequest, eventBookingController.updateBooking)

router.delete("/:id", authorize(["bookings.delete"]), eventBookingController.deleteBooking)

// Booking status routes
router.patch("/:id/status", authorize(["bookings.update"]), eventBookingController.updateBookingStatus)

// Booking payment routes
router.post(
  "/:id/payments",
  authorize(["bookings.update", "payments.create"]),
  eventBookingController.addBookingPayment,
)

// Booking confirmation routes
router.post("/:id/confirm", authorize(["bookings.update"]), eventBookingController.confirmBooking)

router.post("/:id/cancel", authorize(["bookings.update"]), eventBookingController.cancelBooking)

export default router

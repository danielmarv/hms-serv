const express = require("express")
const router = express.Router()
const eventBookingController = require("../controllers/eventBookingController")
const { authenticate } = require("../middleware/authMiddleware")
const { authorize } = require("../middleware/roleMiddleware")
const { validateEventBooking } = require("../middleware/validationMiddleware")

// Get all event bookings
router.get(
  "/",
  authenticate,
  authorize(["admin", "manager", "events_manager", "receptionist"]),
  eventBookingController.getAllEventBookings,
)

// Get event booking by ID
router.get("/:id", authenticate, eventBookingController.getEventBookingById)

// Create new event booking
router.post(
  "/",
  authenticate,
  authorize(["admin", "manager", "events_manager", "receptionist"]),
  validateEventBooking,
  eventBookingController.createEventBooking,
)

// Update event booking
router.put(
  "/:id",
  authenticate,
  authorize(["admin", "manager", "events_manager", "receptionist"]),
  validateEventBooking,
  eventBookingController.updateEventBooking,
)

// Delete event booking
router.delete(
  "/:id",
  authenticate,
  authorize(["admin", "manager", "events_manager"]),
  eventBookingController.deleteEventBooking,
)

// Confirm event booking
router.patch(
  "/:id/confirm",
  authenticate,
  authorize(["admin", "manager", "events_manager"]),
  eventBookingController.confirmEventBooking,
)

// Cancel event booking
router.patch(
  "/:id/cancel",
  authenticate,
  authorize(["admin", "manager", "events_manager", "receptionist"]),
  eventBookingController.cancelEventBooking,
)

// Get bookings by date range
router.get(
  "/date-range",
  authenticate,
  authorize(["admin", "manager", "events_manager", "receptionist"]),
  eventBookingController.getBookingsByDateRange,
)

// Get bookings by venue
router.get(
  "/venue/:venueId",
  authenticate,
  authorize(["admin", "manager", "events_manager", "receptionist"]),
  eventBookingController.getBookingsByVenue,
)

// Get bookings by customer
router.get(
  "/customer/:customerId",
  authenticate,
  authorize(["admin", "manager", "events_manager", "receptionist"]),
  eventBookingController.getBookingsByCustomer,
)

module.exports = router

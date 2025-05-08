const express = require("express")
const router = express.Router()
const eventVenueController = require("../controllers/eventVenueController")
const { authenticate } = require("../middleware/authMiddleware")
const { authorize } = require("../middleware/roleMiddleware")
const { validateEventVenue } = require("../middleware/validationMiddleware")

// Get all event venues
router.get("/", authenticate, eventVenueController.getAllEventVenues)

// Get event venue by ID
router.get("/:id", authenticate, eventVenueController.getEventVenueById)

// Create new event venue
router.post(
  "/",
  authenticate,
  authorize(["admin", "manager", "events_manager"]),
  validateEventVenue,
  eventVenueController.createEventVenue,
)

// Update event venue
router.put(
  "/:id",
  authenticate,
  authorize(["admin", "manager", "events_manager"]),
  validateEventVenue,
  eventVenueController.updateEventVenue,
)

// Delete event venue
router.delete("/:id", authenticate, authorize(["admin", "manager"]), eventVenueController.deleteEventVenue)

// Get venue availability
router.get("/:id/availability", authenticate, eventVenueController.getVenueAvailability)

// Get venue bookings
router.get(
  "/:id/bookings",
  authenticate,
  authorize(["admin", "manager", "events_manager", "receptionist"]),
  eventVenueController.getVenueBookings,
)

module.exports = router

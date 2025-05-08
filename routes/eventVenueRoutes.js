import express from "express"
import * as eventVenueController from "../controllers/eventVenueController.js"
import { validateEventVenue } from "../middleware/validationMiddleware.js"

const router = express.Router()

// Get all event venues
router.get("/", eventVenueController.getAllEventVenues)

// Get event venue by ID
router.get("/:id", eventVenueController.getEventVenueById)

// Create new event venue
router.post(
  "/",
  authorize(["admin", "manager", "events_manager"]),
  validateEventVenue,
  eventVenueController.createEventVenue,
)

// Update event venue
router.put(
  "/:id",
  authorize(["admin", "manager", "events_manager"]),
  validateEventVenue,
  eventVenueController.updateEventVenue,
)

// Delete event venue
router.delete("/:id", authorize(["admin", "manager"]), eventVenueController.deleteEventVenue)

// Get venue availability
router.get("/:id/availability", eventVenueController.getVenueAvailability)

// Get venue bookings
router.get(
  "/:id/bookings",
  authorize(["admin", "manager", "events_manager", "receptionist"]),
  eventVenueController.getVenueBookings,
)

// Get venue statistics
router.get(
  "/:id/statistics",
  authorize(["admin", "manager", "events_manager"]),
  eventVenueController.getVenueStatistics,
)

// Get venues by hotel
router.get("/hotel/:hotelId", eventVenueController.getVenuesByHotel)

// Add venue maintenance schedule
router.post(
  "/:id/maintenance",
  authorize(["admin", "manager", "maintenance_manager"]),
  eventVenueController.addMaintenanceSchedule,
)

export default router

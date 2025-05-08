const express = require("express")
const router = express.Router()
const eventServiceController = require("../controllers/eventServiceController")
const { authenticate } = require("../middleware/authMiddleware")
const { authorize } = require("../middleware/roleMiddleware")
const { validateEventService } = require("../middleware/validationMiddleware")

// Get all event services
router.get("/", authenticate, eventServiceController.getAllEventServices)

// Get event service by ID
router.get("/:id", authenticate, eventServiceController.getEventServiceById)

// Create new event service
router.post(
  "/",
  authenticate,
  authorize(["admin", "manager", "events_manager"]),
  validateEventService,
  eventServiceController.createEventService,
)

// Update event service
router.put(
  "/:id",
  authenticate,
  authorize(["admin", "manager", "events_manager"]),
  validateEventService,
  eventServiceController.updateEventService,
)

// Delete event service
router.delete("/:id", authenticate, authorize(["admin", "manager"]), eventServiceController.deleteEventService)

// Get services by category
router.get("/category/:category", authenticate, eventServiceController.getServicesByCategory)

// Add service to event booking
router.post(
  "/booking/:bookingId",
  authenticate,
  authorize(["admin", "manager", "events_manager", "receptionist"]),
  eventServiceController.addServiceToBooking,
)

// Remove service from event booking
router.delete(
  "/booking/:bookingId/service/:serviceId",
  authenticate,
  authorize(["admin", "manager", "events_manager", "receptionist"]),
  eventServiceController.removeServiceFromBooking,
)

module.exports = router

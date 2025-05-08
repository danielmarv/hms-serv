const express = require("express")
const router = express.Router()
const eventTypeController = require("../controllers/eventTypeController")
const { authenticate } = require("../middleware/authMiddleware")
const { authorize } = require("../middleware/roleMiddleware")
const { validateEventType } = require("../middleware/validationMiddleware")

// Get all event types
router.get("/", authenticate, eventTypeController.getAllEventTypes)

// Get event type by ID
router.get("/:id", authenticate, eventTypeController.getEventTypeById)

// Create new event type
router.post(
  "/",
  authenticate,
  authorize(["admin", "manager", "events_manager"]),
  validateEventType,
  eventTypeController.createEventType,
)

// Update event type
router.put(
  "/:id",
  authenticate,
  authorize(["admin", "manager", "events_manager"]),
  validateEventType,
  eventTypeController.updateEventType,
)

// Delete event type
router.delete("/:id", authenticate, authorize(["admin", "manager"]), eventTypeController.deleteEventType)

module.exports = router

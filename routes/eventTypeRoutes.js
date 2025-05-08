import express from "express"
import * as eventTypeController from "../controllers/eventTypeController.js"
import { authenticate } from "../middleware/auth.js"


const router = express.Router()

// Apply authentication to all routes
router.use(authenticate)

// Get all event types
router.get("/", eventTypeController.getAllEventTypes)

// Get event type by ID
router.get("/:id", eventTypeController.getEventTypeById)

// Create new event type
router.post(
  "/",
  eventTypeController.createEventType,
)

// Update event type
router.put(
  "/:id",
  eventTypeController.updateEventType,
)

// Delete event type
router.delete("/:id", eventTypeController.deleteEventType)

export default router

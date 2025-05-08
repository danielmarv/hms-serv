import express from "express"
import * as eventTypeController from "../controllers/eventTypeController.js"
import { authenticate } from "../middleware/auth.js"
import { checkPermission } from "../middleware/permissionMiddleware.js"
import { validateRequest } from "../middleware/validationMiddleware.js"

const router = express.Router()

// Apply authentication to all routes
router.use(authenticate)

// Get all event types
router.get("/", checkPermission("events:view"), eventTypeController.getAllEventTypes)

// Get event type by ID
router.get("/:id", checkPermission("events:view"), eventTypeController.getEventTypeById)

// Create new event type
router.post(
  "/",
  checkPermission("events:create"),
  validateRequest({
    name: "required|string|max:100",
    description: "string|max:500",
    hotel: "required|mongoId",
    color: "string|max:20",
    icon: "string|max:50",
    isActive: "boolean",
    settings: "object",
  }),
  eventTypeController.createEventType,
)

// Update event type
router.put(
  "/:id",
  checkPermission("events:update"),
  validateRequest({
    name: "string|max:100",
    description: "string|max:500",
    hotel: "mongoId",
    color: "string|max:20",
    icon: "string|max:50",
    isActive: "boolean",
    settings: "object",
  }),
  eventTypeController.updateEventType,
)

// Delete event type
router.delete("/:id", checkPermission("events:delete"), eventTypeController.deleteEventType)

export default router

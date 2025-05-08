import express from "express"
import { authenticate, authorize } from "../middleware/auth.js"
import * as eventTypeController from "../controllers/eventTypeController.js"
import { validateEventTypeRequest } from "../middleware/validationMiddleware.js"

const router = express.Router()

// Apply authentication to all event type routes
router.use(authenticate)

// Event type management routes
router.get("/", authorize(["event_types.view"]), eventTypeController.getAllEventTypes)

router.get("/:id", authorize(["event_types.view"]), eventTypeController.getEventTypeById)

router.post("/", authorize(["event_types.create"]), validateEventTypeRequest, eventTypeController.createEventType)

router.put("/:id", authorize(["event_types.update"]), validateEventTypeRequest, eventTypeController.updateEventType)

router.delete("/:id", authorize(["event_types.delete"]), eventTypeController.deleteEventType)

export default router

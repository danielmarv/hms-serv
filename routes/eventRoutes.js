import express from "express"
import { authenticate, authorize } from "../middleware/auth.js"
import * as eventController from "../controllers/eventController.js"
import { validateEventRequest } from "../middleware/validationMiddleware.js"

const router = express.Router()

// Apply authentication to all event routes
router.use(authenticate)

// Event management routes
router.get("/", authorize(["events.view"]), eventController.getAllEvents)

router.get("/:id", authorize(["events.view"]), eventController.getEventById)

router.post("/", authorize(["events.create"]), validateEventRequest, eventController.createEvent)

router.put("/:id", authorize(["events.update"]), validateEventRequest, eventController.updateEvent)

router.delete("/:id", authorize(["events.delete"]), eventController.deleteEvent)

// Calendar view routes
router.get("/calendar/view", authorize(["events.view"]), eventController.getCalendarView)

router.get("/calendar/availability", authorize(["events.view"]), eventController.checkAvailability)

export default router

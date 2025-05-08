import express from "express"
import * as eventCalendarController from "../controllers/eventCalendarController.js"
import { authenticate } from "../middleware/auth.js"
import { checkPermission } from "../middleware/permissionMiddleware.js"

const router = express.Router()

// Apply authentication to all routes
router.use(authenticate)

// Get calendar events
router.get("/events", checkPermission("events:view"), eventCalendarController.getCalendarEvents)

// Get venue availability
router.get("/venue-availability", checkPermission("events:view"), eventCalendarController.getVenueAvailability)

// Get daily schedule
router.get("/daily-schedule", checkPermission("events:view"), eventCalendarController.getDailySchedule)

// Get monthly overview
router.get("/monthly-overview", checkPermission("events:view"), eventCalendarController.getMonthlyOverview)

export default router

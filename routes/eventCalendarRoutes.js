import express from "express"
import { authenticate, authorize } from "../middleware/auth.js"
import * as eventCalendarController from "../controllers/eventCalendarController.js"

const router = express.Router()

// Apply authentication to all calendar routes
router.use(authenticate)

// Calendar view routes
router.get("/", authorize(["calendar.view"]), eventCalendarController.getCalendarEvents)

router.get("/month/:year/:month", authorize(["calendar.view"]), eventCalendarController.getMonthEvents)

router.get("/week/:year/:week", authorize(["calendar.view"]), eventCalendarController.getWeekEvents)

router.get("/day/:year/:month/:day", authorize(["calendar.view"]), eventCalendarController.getDayEvents)

// Availability check routes
router.post("/check-availability", authorize(["calendar.view"]), eventCalendarController.checkAvailability)

// Venue calendar routes
router.get("/venue/:venueId", authorize(["calendar.view"]), eventCalendarController.getVenueCalendar)

export default router

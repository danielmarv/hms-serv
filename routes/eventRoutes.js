import express from "express"
import eventVenueRoutes from "./eventVenueRoutes.js"
import eventTypeRoutes from "./eventTypeRoutes.js"
import eventBookingRoutes from "./eventBookingRoutes.js"
import eventServiceRoutes from "./eventServiceRoutes.js"
import eventPackageRoutes from "./eventPackageRoutes.js"
import eventTemplateRoutes from "./eventTemplateRoutes.js"
import eventStaffingRoutes from "./eventStaffingRoutes.js"
import eventFeedbackRoutes from "./eventFeedbackRoutes.js"
import eventCalendarRoutes from "./eventCalendarRoutes.js"
import eventReportRoutes from "./eventReportRoutes.js"

const router = express.Router()

// Mount all event-related routes
router.use("/venues", eventVenueRoutes)
router.use("/types", eventTypeRoutes)
router.use("/bookings", eventBookingRoutes)
router.use("/services", eventServiceRoutes)
router.use("/packages", eventPackageRoutes)
router.use("/templates", eventTemplateRoutes)
router.use("/staffing", eventStaffingRoutes)
router.use("/feedback", eventFeedbackRoutes)
router.use("/calendar", eventCalendarRoutes)
router.use("/reports", eventReportRoutes)

export default router

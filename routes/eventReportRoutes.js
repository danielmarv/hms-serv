import express from "express"
import { authenticate, authorize } from "../middleware/auth.js"
import * as eventReportController from "../controllers/eventReportController.js"

const router = express.Router()

// Apply authentication to all report routes
router.use(authenticate)

// Report routes
router.get("/revenue", authorize(["reports.view"]), eventReportController.getRevenueReport)

router.get("/event-types", authorize(["reports.view"]), eventReportController.getEventTypeReport)

router.get("/venues", authorize(["reports.view"]), eventReportController.getVenueUtilizationReport)

router.get("/services", authorize(["reports.view"]), eventReportController.getServicePopularityReport)

router.get("/feedback", authorize(["reports.view"]), eventReportController.getFeedbackReport)

router.get("/custom", authorize(["reports.view"]), eventReportController.generateCustomReport)

export default router

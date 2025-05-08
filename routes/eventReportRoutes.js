import express from "express"
import * as eventReportController from "../controllers/eventReportController.js"
import { authenticate } from "../middleware/auth.js"
import { checkPermission } from "../middleware/permissionMiddleware.js"

const router = express.Router()

// Apply authentication to all routes
router.use(authenticate)

// Get revenue report
router.get("/revenue", checkPermission("events:reports"), eventReportController.getRevenueReport)

// Get event type performance report
router.get("/event-type-performance", checkPermission("events:reports"), eventReportController.getEventTypePerformance)

// Get venue utilization report
router.get("/venue-utilization", checkPermission("events:reports"), eventReportController.getVenueUtilization)

// Get service popularity report
router.get("/service-popularity", checkPermission("events:reports"), eventReportController.getServicePopularity)

// Get customer satisfaction report
router.get("/customer-satisfaction", checkPermission("events:reports"), eventReportController.getCustomerSatisfaction)

export default router

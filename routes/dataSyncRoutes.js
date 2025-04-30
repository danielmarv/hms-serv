import express from "express"
import { syncChainConfiguration, getSyncLogs, getSyncLogDetails } from "../controllers/DataSyncController.js"
import { authenticate, authorize } from "../middleware/auth.js"
import { checkChainAccess } from "../middleware/hotelAccessMiddleware.js"

const router = express.Router()

// Apply authentication middleware to all routes
router.use(authenticate)

// Sync configuration across all hotels in a chain
router.post(
  "/chains/:chainCode/configuration",
  authorize(["manage_hotel", "manage_configuration"]),
  checkChainAccess("full"),
  syncChainConfiguration,
)

// Get sync logs for a chain
router.get("/chains/:chainCode/logs", authorize(["view_hotel", "view_configuration"]), checkChainAccess(), getSyncLogs)

// Get sync log details
router.get("/logs/:syncId", authorize(["view_hotel", "view_configuration"]), getSyncLogDetails)

export default router

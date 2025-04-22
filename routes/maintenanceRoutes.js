import express from "express"
import {
  getAllMaintenanceRequests,
  getMaintenanceRequestById,
  createMaintenanceRequest,
  updateMaintenanceRequest,
  deleteMaintenanceRequest,
  assignMaintenanceRequest,
  getMaintenanceStats,
} from "../controllers/maintenanceController.js"
import { validateCreateMaintenance, validateUpdateMaintenance, validateObjectId } from "../middleware/validators.js"
import { authenticate, authorize } from "../middleware/auth.js"

const router = express.Router()

// Apply authentication middleware to all routes
router.use(authenticate)

// Get all maintenance requests
router.get("/", getAllMaintenanceRequests)

// Get maintenance statistics
router.get("/stats", getMaintenanceStats)

// Get maintenance request by ID
router.get("/:id", validateObjectId("id"), getMaintenanceRequestById)

// Create new maintenance request
router.post("/", validateCreateMaintenance, createMaintenanceRequest)

// Update maintenance request
router.put("/:id", authorize(["admin", "manager", "maintenance"]), validateUpdateMaintenance, updateMaintenanceRequest)

// Delete maintenance request
router.delete("/:id", authorize(["admin", "manager"]), validateObjectId("id"), deleteMaintenanceRequest)

// Assign maintenance request
router.patch("/:id/assign", authorize(["admin", "manager"]), validateObjectId("id"), assignMaintenanceRequest)

export default router

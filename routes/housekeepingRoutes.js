import express from "express"
import {
  getAllHousekeepingSchedules,
  getHousekeepingScheduleById,
  createHousekeepingSchedule,
  updateHousekeepingSchedule,
  deleteHousekeepingSchedule,
  assignHousekeepingSchedule,
  bulkCreateHousekeepingSchedules,
  getHousekeepingStats,
} from "../controllers/housekeepingController.js"
import {
  validateCreateHousekeeping,
  validateUpdateHousekeeping,
  validateObjectId,
  validateBulkCreateHousekeeping,
} from "../middleware/validators.js"
import { authenticate, authorize } from "../middleware/auth.js"

const router = express.Router()

// Apply authentication middleware to all routes
router.use(authenticate)

// Get all housekeeping schedules
router.get("/", getAllHousekeepingSchedules)

// Get housekeeping statistics
router.get("/stats", getHousekeepingStats)

// Get housekeeping schedule by ID
router.get("/:id", validateObjectId("id"), getHousekeepingScheduleById)

// Create new housekeeping schedule
router.post(
  "/",
  authorize(["admin", "manager", "housekeeping"]),
  validateCreateHousekeeping,
  createHousekeepingSchedule,
)

// Bulk create housekeeping schedules
router.post("/bulk", authorize(["admin", "manager"]), validateBulkCreateHousekeeping, bulkCreateHousekeepingSchedules)

// Update housekeeping schedule
router.put(
  "/:id",
  authorize(["admin", "manager", "housekeeping"]),
  validateUpdateHousekeeping,
  updateHousekeepingSchedule,
)

// Delete housekeeping schedule
router.delete("/:id", authorize(["admin", "manager"]), validateObjectId("id"), deleteHousekeepingSchedule)

// Assign housekeeping schedule
router.patch("/:id/assign", authorize(["admin", "manager"]), validateObjectId("id"), assignHousekeepingSchedule)

export default router

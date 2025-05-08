import express from "express"
import * as eventStaffingController from "../controllers/eventStaffingController.js"
import { authenticate } from "../middleware/auth.js"
import { checkPermission } from "../middleware/permissionMiddleware.js"
import { validateRequest } from "../middleware/validationMiddleware.js"

const router = express.Router()

// Apply authentication to all routes
router.use(authenticate)

// Get all staff assignments
router.get("/", checkPermission("events:view"), eventStaffingController.getAllStaffAssignments)

// Get staff assignment by ID
router.get("/:id", checkPermission("events:view"), eventStaffingController.getStaffAssignmentById)

// Get staff schedule
router.get("/staff/:staffId/schedule", checkPermission("events:view"), eventStaffingController.getStaffSchedule)

// Get event staffing
router.get("/event/:eventId", checkPermission("events:view"), eventStaffingController.getEventStaffing)

// Create new staff assignment
router.post(
  "/",
  checkPermission("events:create"),
  validateRequest({
    event: "required|mongoId",
    staff: "required|mongoId",
    date: "required|date",
    startTime: "required|regex:/^([01]\\d|2[0-3]):([0-5]\\d)$/",
    endTime: "required|regex:/^([01]\\d|2[0-3]):([0-5]\\d)$/",
    role: "required|string",
    notes: "string|max:500",
  }),
  eventStaffingController.createStaffAssignment,
)

// Update staff assignment
router.put(
  "/:id",
  checkPermission("events:update"),
  validateRequest({
    event: "mongoId",
    staff: "mongoId",
    date: "date",
    startTime: "regex:/^([01]\\d|2[0-3]):([0-5]\\d)$/",
    endTime: "regex:/^([01]\\d|2[0-3]):([0-5]\\d)$/",
    role: "string",
    notes: "string|max:500",
  }),
  eventStaffingController.updateStaffAssignment,
)

// Update staff assignment status
router.patch(
  "/:id/status",
  checkPermission("events:update"),
  validateRequest({
    status: "required|string|in:scheduled,confirmed,checked-in,completed,cancelled,no-show",
    checkInTime: "date",
    checkOutTime: "date",
    notes: "string|max:500",
  }),
  eventStaffingController.updateAssignmentStatus,
)

// Delete staff assignment
router.delete("/:id", checkPermission("events:delete"), eventStaffingController.deleteStaffAssignment)

export default router

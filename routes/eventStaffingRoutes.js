import express from "express"
import { authenticate, authorize } from "../middleware/auth.js"
import * as eventStaffingController from "../controllers/eventStaffingController.js"
import { validateStaffingRequest } from "../middleware/validationMiddleware.js"

const router = express.Router()

// Apply authentication to all staffing routes
router.use(authenticate)

// Staffing management routes
router.get("/", authorize(["staffing.view"]), eventStaffingController.getAllStaffAssignments)

router.get("/:id", authorize(["staffing.view"]), eventStaffingController.getStaffAssignmentById)

router.post("/", authorize(["staffing.create"]), validateStaffingRequest, eventStaffingController.createStaffAssignment)

router.put(
  "/:id",
  authorize(["staffing.update"]),
  validateStaffingRequest,
  eventStaffingController.updateStaffAssignment,
)

router.delete("/:id", authorize(["staffing.delete"]), eventStaffingController.deleteStaffAssignment)

// Staff availability routes - Commenting out until the controller function is implemented
// router.get("/staff/:staffId/availability", authorize(["staffing.view"]), eventStaffingController.getStaffAvailability)

// Event staffing routes
router.get("/event/:eventId", authorize(["staffing.view"]), eventStaffingController.getEventStaffing)

export default router

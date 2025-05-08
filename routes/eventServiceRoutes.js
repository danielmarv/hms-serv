import express from "express"
import { authenticate, authorize } from "../middleware/auth.js"
import {
  getAllEventServices,
  getEventServiceById,
  createEventService,
  updateEventService,
  deleteEventService,
  getServicesByCategory,
  addServiceToBooking,
  removeServiceFromBooking,
} from "../controllers/eventServiceController.js"
import { validateServiceRequest } from "../middleware/validationMiddleware.js"

const router = express.Router()

// Apply authentication to all service routes
router.use(authenticate)

// Service management routes
router.get("/", authorize(["services.view"]), getAllEventServices)
router.get("/:id", authorize(["services.view"]), getEventServiceById)
router.post("/", authorize(["services.create"]), validateServiceRequest, createEventService)
router.put("/:id", authorize(["services.update"]), validateServiceRequest, updateEventService)
router.delete("/:id", authorize(["services.delete"]), deleteEventService)

// Get services by category
router.get("/category/:category", authorize(["services.view"]), getServicesByCategory)

// Routes for managing services in bookings
router.post("/bookings/:bookingId/services", authorize(["bookings.update", "services.create"]), addServiceToBooking)
router.delete("/bookings/:bookingId/services/:serviceId", authorize(["bookings.update"]), removeServiceFromBooking)

export default router

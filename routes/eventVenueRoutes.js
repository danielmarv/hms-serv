import express from "express"
import { authenticate, authorize } from "../middleware/auth.js"
import * as eventVenueController from "../controllers/eventVenueController.js"
import { validateVenueRequest } from "../middleware/validationMiddleware.js"

const router = express.Router()

// Apply authentication to all venue routes
router.use(authenticate)

// Venue management routes
router.get("/", authorize(["venues.view"]), eventVenueController.getAllVenues)

router.get("/:id", authorize(["venues.view"]), eventVenueController.getVenueById)

router.post("/", authorize(["venues.create"]), validateVenueRequest, eventVenueController.createVenue)

router.put("/:id", authorize(["venues.update"]), validateVenueRequest, eventVenueController.updateVenue)

router.delete("/:id", authorize(["venues.delete"]), eventVenueController.deleteVenue)

// Venue availability routes
router.get("/:id/availability", authorize(["venues.view"]), eventVenueController.getVenueAvailability)

// Venue bookings routes
router.get("/:id/bookings", authorize(["venues.view", "bookings.view"]), eventVenueController.getVenueBookings)

export default router

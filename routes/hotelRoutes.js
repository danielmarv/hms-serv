import express from "express"
import {
  getAllHotels,
  getHotelById,
  createHotel,
  updateHotel,
  deleteHotel,
  initializeHotelSetup,
  getHotelSetupStatus,
} from "../controllers/HotelController.js"
import { authenticate, authorize } from "../middleware/auth.js"

const router = express.Router()

// Apply authentication middleware to all routes
router.use(authenticate)

// Get all hotels
router.get("/", authorize(["view_hotel"]), getAllHotels)

// Get hotel by ID
router.get("/:id", authorize(["view_hotel"]), getHotelById)

// Create hotel
router.post("/", authorize(["manage_hotel"]), createHotel)

// Update hotel
router.put("/:id", authorize(["manage_hotel"]), updateHotel)

// Delete hotel
router.delete("/:id", authorize(["manage_hotel"]), deleteHotel)

// Initialize hotel setup
router.post("/:id/setup/initialize", authorize(["manage_hotel", "manage_configuration"]), initializeHotelSetup)

// Get hotel setup status
router.get("/:id/setup/status", authorize(["view_hotel", "view_configuration"]), getHotelSetupStatus)

export default router

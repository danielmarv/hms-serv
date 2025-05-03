import express from "express"
import {
  getAllHotelChains,
  getHotelChainDetails,
  createHotelChain,
  updateSharedConfiguration,
  addHotelToChain,
  removeHotelFromChain,
  getChainStatistics,
} from "../controllers/HotelChainController.js"
import { authenticate, authorize } from "../middleware/auth.js"

const router = express.Router()

// Apply authentication middleware to all routes
router.use(authenticate)

// Get all hotel chains
router.get("/", authorize(["view_hotel", "manage_hotel"]), getAllHotelChains)

// Get hotel chain details
router.get("/:chainCode", authorize(["view_hotel", "manage_hotel"]), getHotelChainDetails)

// Create a new hotel chain
router.post("/", authorize(["manage_hotel"]), createHotelChain)

// Update shared configuration
router.put("/:chainCode/configuration", authorize(["manage_hotel", "manage_configuration"]), updateSharedConfiguration)

// Add a hotel to a chain
router.post("/:chainCode/hotels", authorize(["manage_hotel"]), addHotelToChain)

// Remove a hotel from a chain
router.delete("/:chainCode/hotels/:hotelId", authorize(["manage_hotel"]), removeHotelFromChain)

// Get chain statistics
router.get("/:chainCode/statistics", authorize(["view_hotel", "view_all_data"]), getChainStatistics)

export default router

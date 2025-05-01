import express from "express"
import {
  getHotelConfiguration,
  createHotelConfiguration,
  updateHotelConfiguration,
  getConfigurationSection,
  updateConfigurationSection,
  getAllConfigurations,
  cloneConfiguration,
} from "../controllers/hotelConfigurationController.js"
import { authenticate, authorize, isAdmin, requireHotelContext } from "../middleware/auth.js"

const router = express.Router()

// Apply authentication middleware to all routes
router.use(authenticate)

// Hotel-specific configuration routes
router.get("/", requireHotelContext(), authorize("configuration.view"), getHotelConfiguration)
router.post("/", requireHotelContext(), authorize("configuration.create"), createHotelConfiguration)
router.put("/", requireHotelContext(), authorize("configuration.update"), updateHotelConfiguration)

// Configuration section routes
router.get("/:section", requireHotelContext(), authorize("configuration.view"), getConfigurationSection)
router.put("/:section", requireHotelContext(), authorize("configuration.update"), updateConfigurationSection)

// Admin-only routes
router.get("/admin/all", isAdmin, getAllConfigurations)
router.post("/admin/clone", isAdmin, cloneConfiguration)

export default router

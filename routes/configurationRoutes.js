import express from "express"
import {
  getConfiguration,
  createConfiguration,
  updateConfiguration,
  updateSetupProgress,
  getSetupWizardStatus,
  generateDocumentNumber,
} from "../controllers/ConfigurationController.js"
import { authenticate, authorize } from "../middleware/auth.js"

const router = express.Router()

// Apply authentication middleware to all routes
router.use(authenticate)

// Get configuration for a specific hotel
router.get("/:hotelId", authorize(["view_configuration"]), getConfiguration)

// Create initial configuration for a hotel
router.post("/:hotelId", authorize(["manage_configuration"]), createConfiguration)

// Update configuration
router.put("/:hotelId", authorize(["manage_configuration"]), updateConfiguration)

// Update setup progress
router.put("/:hotelId/setup/:step", authorize(["manage_configuration"]), updateSetupProgress)

// Get setup wizard status
router.get("/:hotelId/setup", authorize(["view_configuration"]), getSetupWizardStatus)

// Generate document number
router.post("/:hotelId/document/:documentType", authorize(["manage_documents"]), generateDocumentNumber)

export default router

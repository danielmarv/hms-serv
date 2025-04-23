import Configuration from "../models/Configuration.js"
import Hotel from "../models/Hotel.js"
import SetupWizard from "../models/SetupWizard.js"
import { ApiError } from "../utils/apiError.js"

// Get configuration for a specific hotel
export const getConfiguration = async (req, res, next) => {
  try {
    const { hotelId } = req.params

    const configuration = await Configuration.findOne({ hotelId })

    if (!configuration) {
      return next(new ApiError("Configuration not found for this hotel", 404))
    }

    res.status(200).json({
      success: true,
      data: configuration,
    })
  } catch (error) {
    next(error)
  }
}

// Create initial configuration for a hotel
export const createConfiguration = async (req, res, next) => {
  try {
    const { hotelId } = req.params

    // Check if hotel exists
    const hotel = await Hotel.findById(hotelId)
    if (!hotel) {
      return next(new ApiError("Hotel not found", 404))
    }

    // Check if configuration already exists
    const existingConfig = await Configuration.findOne({ hotelId })
    if (existingConfig) {
      return next(new ApiError("Configuration already exists for this hotel", 400))
    }

    // Create configuration
    const configuration = await Configuration.create({
      hotelId,
      hotelName: hotel.name,
      legalName: req.body.legalName || hotel.name,
      taxId: req.body.taxId,
      address: req.body.address,
      contact: req.body.contact,
      branding: req.body.branding || {},
      documentPrefixes: req.body.documentPrefixes || {},
      systemSettings: req.body.systemSettings || {},
      createdBy: req.user.id,
      updatedBy: req.user.id,
    })

    // Initialize setup wizard
    await SetupWizard.create({
      hotelId,
      steps: [
        { step: 1, name: "Hotel Information", completed: true, completedAt: new Date() },
        { step: 2, name: "Contact Information", completed: false },
        { step: 3, name: "Branding", completed: false },
        { step: 4, name: "Document Settings", completed: false },
        { step: 5, name: "System Settings", completed: false },
        { step: 6, name: "Admin User Setup", completed: false },
      ],
      currentStep: 2,
      createdBy: req.user.id,
      updatedBy: req.user.id,
    })

    res.status(201).json({
      success: true,
      data: configuration,
    })
  } catch (error) {
    next(error)
  }
}

// Update configuration
export const updateConfiguration = async (req, res, next) => {
  try {
    const { hotelId } = req.params

    const configuration = await Configuration.findOne({ hotelId })

    if (!configuration) {
      return next(new ApiError("Configuration not found for this hotel", 404))
    }

    // Update fields
    const updatableFields = [
      "hotelName",
      "legalName",
      "taxId",
      "address",
      "contact",
      "branding",
      "documentPrefixes",
      "systemSettings",
    ]

    updatableFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        configuration[field] = req.body[field]
      }
    })

    configuration.updatedBy = req.user.id
    await configuration.save()

    res.status(200).json({
      success: true,
      data: configuration,
    })
  } catch (error) {
    next(error)
  }
}

// Update setup progress
export const updateSetupProgress = async (req, res, next) => {
  try {
    const { hotelId, step } = req.params

    const setupWizard = await SetupWizard.findOne({ hotelId })

    if (!setupWizard) {
      return next(new ApiError("Setup wizard not found for this hotel", 404))
    }

    // Find the step
    const stepIndex = setupWizard.steps.findIndex((s) => s.step === Number.parseInt(step))
    if (stepIndex === -1) {
      return next(new ApiError("Step not found", 404))
    }

    // Update step
    setupWizard.steps[stepIndex].completed = true
    setupWizard.steps[stepIndex].completedAt = new Date()
    setupWizard.steps[stepIndex].data = req.body.data || {}

    // Update current step
    if (setupWizard.currentStep === Number.parseInt(step)) {
      setupWizard.currentStep = Number.parseInt(step) + 1
    }

    // Check if all steps are completed
    const allCompleted = setupWizard.steps.every((s) => s.completed)
    if (allCompleted) {
      setupWizard.isCompleted = true
      setupWizard.completedAt = new Date()

      // Update configuration to mark setup as completed
      await Configuration.findOneAndUpdate({ hotelId }, { setupCompleted: true, setupStep: setupWizard.steps.length })
    }

    setupWizard.updatedBy = req.user.id
    await setupWizard.save()

    res.status(200).json({
      success: true,
      data: setupWizard,
    })
  } catch (error) {
    next(error)
  }
}

// Get setup wizard status
export const getSetupWizardStatus = async (req, res, next) => {
  try {
    const { hotelId } = req.params

    const setupWizard = await SetupWizard.findOne({ hotelId })

    if (!setupWizard) {
      return next(new ApiError("Setup wizard not found for this hotel", 404))
    }

    res.status(200).json({
      success: true,
      data: setupWizard,
    })
  } catch (error) {
    next(error)
  }
}

// Generate document number
export const generateDocumentNumber = async (req, res, next) => {
  try {
    const { hotelId, documentType } = req.params

    const configuration = await Configuration.findOne({ hotelId })

    if (!configuration) {
      return next(new ApiError("Configuration not found for this hotel", 404))
    }

    if (!["invoice", "receipt", "booking", "guest"].includes(documentType)) {
      return next(new ApiError("Invalid document type", 400))
    }

    const documentNumber = configuration.generateDocumentNumber(documentType)
    await configuration.save()

    res.status(200).json({
      success: true,
      data: {
        documentNumber,
      },
    })
  } catch (error) {
    next(error)
  }
}

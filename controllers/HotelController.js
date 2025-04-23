import Hotel from "../models/Hotel.js"
import Configuration from "../models/Configuration.js"
import SetupWizard from "../models/SetupWizard.js"
import { ApiError } from "../utils/apiError.js"

// Get all hotels
export const getAllHotels = async (req, res, next) => {
  try {
    const hotels = await Hotel.find()

    res.status(200).json({
      success: true,
      count: hotels.length,
      data: hotels,
    })
  } catch (error) {
    next(error)
  }
}

// Get hotel by ID
export const getHotelById = async (req, res, next) => {
  try {
    const hotel = await Hotel.findById(req.params.id)

    if (!hotel) {
      return next(new ApiError("Hotel not found", 404))
    }

    res.status(200).json({
      success: true,
      data: hotel,
    })
  } catch (error) {
    next(error)
  }
}

// Create hotel
export const createHotel = async (req, res, next) => {
  try {
    const { name, code, description, type, starRating, parentCompany } = req.body

    // Check if hotel code already exists
    const existingHotel = await Hotel.findOne({ code })
    if (existingHotel) {
      return next(new ApiError("Hotel code already in use", 400))
    }

    // Create hotel
    const hotel = await Hotel.create({
      name,
      code,
      description,
      type,
      starRating,
      parentCompany,
      createdBy: req.user.id,
      updatedBy: req.user.id,
    })

    res.status(201).json({
      success: true,
      data: hotel,
    })
  } catch (error) {
    next(error)
  }
}

// Update hotel
export const updateHotel = async (req, res, next) => {
  try {
    const { name, description, type, starRating, parentCompany, active } = req.body

    const hotel = await Hotel.findById(req.params.id)

    if (!hotel) {
      return next(new ApiError("Hotel not found", 404))
    }

    // Update fields
    if (name) hotel.name = name
    if (description !== undefined) hotel.description = description
    if (type) hotel.type = type
    if (starRating !== undefined) hotel.starRating = starRating
    if (parentCompany !== undefined) hotel.parentCompany = parentCompany
    if (active !== undefined) hotel.active = active

    hotel.updatedBy = req.user.id
    await hotel.save()

    // If hotel name was updated, update the configuration as well
    if (name) {
      await Configuration.findOneAndUpdate({ hotelId: hotel._id }, { hotelName: name })
    }

    res.status(200).json({
      success: true,
      data: hotel,
    })
  } catch (error) {
    next(error)
  }
}

// Delete hotel
export const deleteHotel = async (req, res, next) => {
  try {
    const hotel = await Hotel.findById(req.params.id)

    if (!hotel) {
      return next(new ApiError("Hotel not found", 404))
    }

    // Check if hotel has configuration
    const configuration = await Configuration.findOne({ hotelId: hotel._id })
    if (configuration) {
      return next(new ApiError("Cannot delete hotel with existing configuration. Deactivate it instead.", 400))
    }

    await hotel.deleteOne()

    res.status(200).json({
      success: true,
      data: {},
    })
  } catch (error) {
    next(error)
  }
}

// Initialize hotel setup
export const initializeHotelSetup = async (req, res, next) => {
  try {
    const { id: hotelId } = req.params

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

    // Create initial configuration
    const configuration = await Configuration.create({
      hotelId,
      hotelName: hotel.name,
      legalName: hotel.name,
      taxId: "",
      address: {
        street: "",
        city: "",
        state: "",
        postalCode: "",
        country: "",
      },
      contact: {
        phone: "",
        email: "",
        website: "",
      },
      createdBy: req.user.id,
      updatedBy: req.user.id,
    })

    // Initialize setup wizard
    const setupWizard = await SetupWizard.create({
      hotelId,
      steps: [
        { step: 1, name: "Hotel Information", completed: false },
        { step: 2, name: "Contact Information", completed: false },
        { step: 3, name: "Branding", completed: false },
        { step: 4, name: "Document Settings", completed: false },
        { step: 5, name: "System Settings", completed: false },
        { step: 6, name: "Admin User Setup", completed: false },
      ],
      currentStep: 1,
      createdBy: req.user.id,
      updatedBy: req.user.id,
    })

    res.status(200).json({
      success: true,
      data: {
        hotel,
        configuration,
        setupWizard,
      },
    })
  } catch (error) {
    next(error)
  }
}

// Get hotel setup status
export const getHotelSetupStatus = async (req, res, next) => {
  try {
    const { id: hotelId } = req.params

    // Check if hotel exists
    const hotel = await Hotel.findById(hotelId)
    if (!hotel) {
      return next(new ApiError("Hotel not found", 404))
    }

    // Get configuration
    const configuration = await Configuration.findOne({ hotelId })
    if (!configuration) {
      return res.status(200).json({
        success: true,
        data: {
          setupInitiated: false,
          setupCompleted: false,
          currentStep: 0,
        },
      })
    }

    // Get setup wizard
    const setupWizard = await SetupWizard.findOne({ hotelId })

    res.status(200).json({
      success: true,
      data: {
        setupInitiated: true,
        setupCompleted: configuration.setupCompleted,
        currentStep: setupWizard ? setupWizard.currentStep : configuration.setupStep,
        steps: setupWizard ? setupWizard.steps : [],
      },
    })
  } catch (error) {
    next(error)
  }
}

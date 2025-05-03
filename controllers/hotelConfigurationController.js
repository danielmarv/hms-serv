import HotelConfiguration from "../models/HotelConfiguration.js"
import Hotel from "../models/Hotel.js"
import { ApiError } from "../utils/apiError.js"

// Get configuration for current hotel context
export const getHotelConfiguration = async (req, res, next) => {
  try {
    // Ensure hotel context is established
    if (!req.hotelId) {
      return next(new ApiError("Hotel context is required", 400))
    }

    // Find configuration for the current hotel
    const configuration = await HotelConfiguration.findOne({ hotel: req.hotelId })

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

// Create configuration for a hotel
export const createHotelConfiguration = async (req, res, next) => {
  try {
    // Ensure hotel context is established
    if (!req.hotelId) {
      return next(new ApiError("Hotel context is required", 400))
    }

    // Check if configuration already exists
    const existingConfig = await HotelConfiguration.findOne({ hotel: req.hotelId })
    if (existingConfig) {
      return next(new ApiError("Configuration already exists for this hotel", 400))
    }

    // Get hotel details
    const hotel = await Hotel.findById(req.hotelId)
    if (!hotel) {
      return next(new ApiError("Hotel not found", 404))
    }

    // Create configuration
    const configuration = await HotelConfiguration.create({
      hotel: req.hotelId,
      name: hotel.name,
      legal_name: req.body.legal_name || hotel.name,
      tax_id: req.body.tax_id,
      contact: req.body.contact,
      financial: req.body.financial,
      operational: req.body.operational,
      branding: req.body.branding,
      features: req.body.features,
      notifications: req.body.notifications,
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

// Update configuration for current hotel context
export const updateHotelConfiguration = async (req, res, next) => {
  try {
    // Ensure hotel context is established
    if (!req.hotelId) {
      return next(new ApiError("Hotel context is required", 400))
    }

    // Find configuration for the current hotel
    const configuration = await HotelConfiguration.findOne({ hotel: req.hotelId })

    if (!configuration) {
      return next(new ApiError("Configuration not found for this hotel", 404))
    }

    // Update fields
    const updatableFields = [
      "name",
      "legal_name",
      "tax_id",
      "contact",
      "financial",
      "operational",
      "branding",
      "features",
      "notifications",
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

// Get specific configuration section
export const getConfigurationSection = async (req, res, next) => {
  try {
    const { section } = req.params

    // Ensure hotel context is established
    if (!req.hotelId) {
      return next(new ApiError("Hotel context is required", 400))
    }

    // Validate section
    const validSections = ["contact", "financial", "operational", "branding", "features", "notifications"]
    if (!validSections.includes(section)) {
      return next(new ApiError("Invalid configuration section", 400))
    }

    // Find configuration for the current hotel
    const configuration = await HotelConfiguration.findOne({ hotel: req.hotelId })

    if (!configuration) {
      return next(new ApiError("Configuration not found for this hotel", 404))
    }

    res.status(200).json({
      success: true,
      data: configuration[section],
    })
  } catch (error) {
    next(error)
  }
}

// Update specific configuration section
export const updateConfigurationSection = async (req, res, next) => {
  try {
    const { section } = req.params

    // Ensure hotel context is established
    if (!req.hotelId) {
      return next(new ApiError("Hotel context is required", 400))
    }

    // Validate section
    const validSections = ["contact", "financial", "operational", "branding", "features", "notifications"]
    if (!validSections.includes(section)) {
      return next(new ApiError("Invalid configuration section", 400))
    }

    // Find configuration for the current hotel
    const configuration = await HotelConfiguration.findOne({ hotel: req.hotelId })

    if (!configuration) {
      return next(new ApiError("Configuration not found for this hotel", 404))
    }

    // Update section
    configuration[section] = req.body
    configuration.updatedBy = req.user.id
    await configuration.save()

    res.status(200).json({
      success: true,
      data: configuration[section],
    })
  } catch (error) {
    next(error)
  }
}

// Get all configurations (admin only)
export const getAllConfigurations = async (req, res, next) => {
  try {
    // This endpoint is for admins only
    if (!req.user.is_global_admin && !["super admin", "admin"].includes(req.user.role?.name)) {
      return next(new ApiError("Not authorized to access all configurations", 403))
    }

    const configurations = await HotelConfiguration.find().populate("hotel", "name code type")

    res.status(200).json({
      success: true,
      count: configurations.length,
      data: configurations,
    })
  } catch (error) {
    next(error)
  }
}

// Clone configuration from one hotel to another (admin only)
export const cloneConfiguration = async (req, res, next) => {
  try {
    const { sourceHotelId, targetHotelId, sections } = req.body

    // This endpoint is for admins only
    if (!req.user.is_global_admin && !["super admin", "admin"].includes(req.user.role?.name)) {
      return next(new ApiError("Not authorized to clone configurations", 403))
    }

    // Validate hotels
    const sourceHotel = await Hotel.findById(sourceHotelId)
    const targetHotel = await Hotel.findById(targetHotelId)

    if (!sourceHotel || !targetHotel) {
      return next(new ApiError("Source or target hotel not found", 404))
    }

    // Get source configuration
    const sourceConfig = await HotelConfiguration.findOne({ hotel: sourceHotelId })
    if (!sourceConfig) {
      return next(new ApiError("Source hotel configuration not found", 404))
    }

    // Get or create target configuration
    let targetConfig = await HotelConfiguration.findOne({ hotel: targetHotelId })
    if (!targetConfig) {
      targetConfig = new HotelConfiguration({
        hotel: targetHotelId,
        name: targetHotel.name,
        legal_name: targetHotel.name,
        createdBy: req.user.id,
      })
    }

    // Clone specified sections or all if not specified
    const sectionsToClone = sections || ["contact", "financial", "operational", "branding", "features", "notifications"]

    sectionsToClone.forEach((section) => {
      if (sourceConfig[section]) {
        targetConfig[section] = JSON.parse(JSON.stringify(sourceConfig[section]))
      }
    })

    targetConfig.updatedBy = req.user.id
    await targetConfig.save()

    res.status(200).json({
      success: true,
      message: "Configuration cloned successfully",
      data: targetConfig,
    })
  } catch (error) {
    next(error)
  }
}

import Hotel from "../models/Hotel.js"
import Configuration from "../models/Configuration.js"
import SetupWizard from "../models/SetupWizard.js"
import SharedConfiguration from "../models/SharedConfiguration.js"
import UserHotelAccess from "../models/userHotelAccess.js"
import { ApiError } from "../utils/apiError.js"

// Get all hotels with optional filtering
export const getAllHotels = async (req, res, next) => {
  try {
    const {
      type,
      active,
      parentHotel,
      isHeadquarters,
      chainCode,
      parentCompany,
      showBranches = false,
      page = 1,
      limit = 20,
    } = req.query

    // Build filter object
    const filter = {}

    if (type) filter.type = type
    if (active !== undefined) filter.active = active === "true"
    if (parentHotel) filter.parentHotel = parentHotel
    if (isHeadquarters !== undefined) filter.isHeadquarters = isHeadquarters === "true"
    if (chainCode) filter.chainCode = chainCode
    if (parentCompany) filter.parentCompany = parentCompany

    // If user is not admin, only show hotels they have access to
    if (req.user.role?.name !== "super admin" && req.user.role?.name !== "admin") {
      const accessibleHotels = await UserHotelAccess.find({ user: req.user.id }).distinct("hotel")

      filter._id = { $in: accessibleHotels }
    }

    // Calculate pagination
    const skip = (Number(page) - 1) * Number(limit)

    // Execute query
    let query = Hotel.find(filter).skip(skip).limit(Number(limit)).sort({ createdAt: -1 })

    // Populate branches if requested
    if (showBranches === "true") {
      query = query.populate("branches")
    }

    const hotels = await query

    // Get total count for pagination
    const total = await Hotel.countDocuments(filter)

    res.status(200).json({
      success: true,
      count: hotels.length,
      total,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
      data: hotels,
    })
  } catch (error) {
    next(error)
  }
}

// Get hotel by ID with branches
export const getHotelById = async (req, res, next) => {
  try {
    const { includeBranches = false, includeHierarchy = false } = req.query

    const hotel = await Hotel.findById(req.params.id)

    if (!hotel) {
      return next(new ApiError("Hotel not found", 404))
    }

    // Check if user has access to this hotel
    if (req.user.role?.name !== "super admin" && req.user.role?.name !== "admin") {
      const hasAccess = await UserHotelAccess.exists({
        user: req.user.id,
        hotel: hotel._id,
      })

      if (!hasAccess) {
        return next(new ApiError("You don't have access to this hotel", 403))
      }
    }

    // Include branches if requested
    if (includeBranches === "true") {
      await hotel.populate("branches")
    }

    // Include full hierarchy if requested
    let hierarchyData = null
    if (includeHierarchy === "true") {
      hierarchyData = await hotel.getHotelHierarchy()
    }

    res.status(200).json({
      success: true,
      data: hotel,
      hierarchy: hierarchyData,
    })
  } catch (error) {
    next(error)
  }
}

// Create hotel
export const createHotel = async (req, res, next) => {
  try {
    const { name, code, description, type, starRating, parentHotel, isHeadquarters, chainCode, parentCompany } =
      req.body

    // Check if hotel code already exists
    const existingHotel = await Hotel.findOne({ code })
    if (existingHotel) {
      return next(new ApiError("Hotel code already in use", 400))
    }

    // Validate parent hotel if provided
    if (parentHotel) {
      const parent = await Hotel.findById(parentHotel)
      if (!parent) {
        return next(new ApiError("Parent hotel not found", 404))
      }

      // A branch cannot be a headquarters
      if (isHeadquarters) {
        return next(new ApiError("A branch hotel cannot be a headquarters", 400))
      }
    }

    // If this is a headquarters, ensure it has a chain code
    if (isHeadquarters && !chainCode) {
      return next(new ApiError("Headquarters hotel must have a chain code", 400))
    }

    // Create hotel
    const hotel = await Hotel.create({
      name,
      code,
      description,
      type,
      starRating,
      parentHotel,
      isHeadquarters,
      chainCode,
      parentCompany,
      createdBy: req.user.id,
      updatedBy: req.user.id,
    })

    // Grant access to the creator
    await UserHotelAccess.create({
      user: req.user.id,
      hotel: hotel._id,
      accessLevel: "full",
      accessAllBranches: true,
      isDefault: true,
      createdBy: req.user.id,
      updatedBy: req.user.id,
    })

    // If this is a headquarters, create a shared configuration
    if (isHeadquarters && chainCode) {
      const existingSharedConfig = await SharedConfiguration.findOne({ chainCode })

      if (!existingSharedConfig) {
        await SharedConfiguration.create({
          chainCode,
          name: `${name} Chain Configuration`,
          createdBy: req.user.id,
          updatedBy: req.user.id,
        })
      }
    }

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
    const { name, description, type, starRating, parentHotel, isHeadquarters, chainCode, parentCompany, active } =
      req.body

    const hotel = await Hotel.findById(req.params.id)

    if (!hotel) {
      return next(new ApiError("Hotel not found", 404))
    }

    // Validate parent hotel if provided
    if (parentHotel) {
      // Prevent circular references
      if (parentHotel === hotel._id.toString()) {
        return next(new ApiError("Hotel cannot be its own parent", 400))
      }

      const parent = await Hotel.findById(parentHotel)
      if (!parent) {
        return next(new ApiError("Parent hotel not found", 404))
      }

      // Check if this would create a circular reference
      const branches = await hotel.getAllBranches()
      if (branches.some((branch) => branch._id.toString() === parentHotel)) {
        return next(new ApiError("This would create a circular reference in the hotel hierarchy", 400))
      }

      // A branch cannot be a headquarters
      if (isHeadquarters) {
        return next(new ApiError("A branch hotel cannot be a headquarters", 400))
      }
    }

    // If changing to headquarters, ensure it has a chain code
    if (isHeadquarters && !hotel.isHeadquarters && !chainCode && !hotel.chainCode) {
      return next(new ApiError("Headquarters hotel must have a chain code", 400))
    }

    // Update fields
    if (name) hotel.name = name
    if (description !== undefined) hotel.description = description
    if (type) hotel.type = type
    if (starRating !== undefined) hotel.starRating = starRating
    if (parentHotel !== undefined) hotel.parentHotel = parentHotel || null
    if (isHeadquarters !== undefined) hotel.isHeadquarters = isHeadquarters
    if (chainCode) hotel.chainCode = chainCode
    if (parentCompany !== undefined) hotel.parentCompany = parentCompany
    if (active !== undefined) hotel.active = active

    hotel.updatedBy = req.user.id
    await hotel.save()

    // If hotel name was updated, update the configuration as well
    if (name) {
      await Configuration.findOneAndUpdate({ hotelId: hotel._id }, { hotelName: name })
    }

    // If this is now a headquarters and has a chain code, create a shared configuration if it doesn't exist
    if (hotel.isHeadquarters && hotel.chainCode) {
      const existingSharedConfig = await SharedConfiguration.findOne({ chainCode: hotel.chainCode })

      if (!existingSharedConfig) {
        await SharedConfiguration.create({
          chainCode: hotel.chainCode,
          name: `${hotel.name} Chain Configuration`,
          createdBy: req.user.id,
          updatedBy: req.user.id,
        })
      }
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

    // Check if hotel has branches
    const hasBranches = await Hotel.exists({ parentHotel: hotel._id })
    if (hasBranches) {
      return next(new ApiError("Cannot delete hotel with branches. Please delete or reassign branches first.", 400))
    }

    // Check if hotel has configuration
    const configuration = await Configuration.findOne({ hotelId: hotel._id })
    if (configuration) {
      return next(new ApiError("Cannot delete hotel with existing configuration. Deactivate it instead.", 400))
    }

    // Delete hotel access records
    await UserHotelAccess.deleteMany({ hotel: hotel._id })

    // Delete the hotel
    await hotel.deleteOne()

    res.status(200).json({
      success: true,
      data: {},
    })
  } catch (error) {
    next(error)
  }
}

// Get hotel branches
export const getHotelBranches = async (req, res, next) => {
  try {
    const hotel = await Hotel.findById(req.params.id)

    if (!hotel) {
      return next(new ApiError("Hotel not found", 404))
    }

    const branches = await hotel.getAllBranches()

    res.status(200).json({
      success: true,
      count: branches.length,
      data: branches,
    })
  } catch (error) {
    next(error)
  }
}

// Get hotel chain
export const getHotelChain = async (req, res, next) => {
  try {
    const { chainCode } = req.params

    // Find headquarters
    const headquarters = await Hotel.findOne({
      chainCode,
      isHeadquarters: true,
    })

    if (!headquarters) {
      return next(new ApiError("Hotel chain not found", 404))
    }

    // Get all hotels in the chain
    const chainHotels = await Hotel.find({ chainCode })

    // Get shared configuration
    const sharedConfig = await SharedConfiguration.findOne({ chainCode })

    res.status(200).json({
      success: true,
      data: {
        headquarters,
        hotels: chainHotels,
        sharedConfiguration: sharedConfig,
      },
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

    // Check if this is part of a chain
    let sharedConfig = null
    if (hotel.chainCode) {
      sharedConfig = await SharedConfiguration.findOne({ chainCode: hotel.chainCode })
    }

    // Create initial configuration
    const configData = {
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
    }

    // Apply shared configuration if available
    if (sharedConfig) {
      // Apply branding if not overridable
      if (!sharedConfig.overrideSettings.branding) {
        configData.branding = sharedConfig.branding
      }

      // Apply document prefixes (can be overridden later)
      configData.documentPrefixes = sharedConfig.documentPrefixes

      // Apply system settings (can be overridden later)
      configData.systemSettings = sharedConfig.systemSettings
    }

    const configuration = await Configuration.create(configData)

    // Initialize setup wizard
    const setupWizard = await SetupWizard.create({
      hotelId,
      steps: [
        { step: 1, name: "Hotel Information", completed: false },
        { step: 2, name: "Contact Information", completed: false },
        { step: 3, name: "Branding", completed: sharedConfig && !sharedConfig.overrideSettings.branding },
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
        sharedConfigurationApplied: !!sharedConfig,
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

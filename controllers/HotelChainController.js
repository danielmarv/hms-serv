import Hotel from "../models/Hotel.js"
import SharedConfiguration from "../models/SharedConfiguration.js"
import UserHotelAccess from "../models/userHotelAccess.js"
import Configuration from "../models/Configuration.js"
import { ApiError } from "../utils/apiError.js"

// Get all hotel chains
export const getAllHotelChains = async (req, res, next) => {
  try {
    // Find all unique chain codes
    const chains = await Hotel.aggregate([
      { $match: { chainCode: { $exists: true, $ne: null }, isHeadquarters: true } },
      {
        $project: {
          chainCode: 1,
          name: 1,
          code: 1,
          description: 1,
          type: 1,
          starRating: 1,
          active: 1,
        },
      },
    ])

    // Get count of hotels in each chain
    for (const chain of chains) {
      const count = await Hotel.countDocuments({ chainCode: chain.chainCode })
      chain.hotelCount = count
    }

    res.status(200).json({
      success: true,
      count: chains.length,
      data: chains,
    })
  } catch (error) {
    next(error)
  }
}

// Get hotel chain details
export const getHotelChainDetails = async (req, res, next) => {
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
    const chainHotels = await Hotel.find({ chainCode }).sort({ name: 1 })

    // Get shared configuration
    const sharedConfig = await SharedConfiguration.findOne({ chainCode })

    // Build hierarchy
    const hierarchy = await buildChainHierarchy(chainHotels)

    res.status(200).json({
      success: true,
      data: {
        headquarters,
        hotels: chainHotels,
        hotelCount: chainHotels.length,
        sharedConfiguration: sharedConfig,
        hierarchy,
      },
    })
  } catch (error) {
    next(error)
  }
}

// Create a new hotel chain
export const createHotelChain = async (req, res, next) => {
  try {
    const { name, code, description, chainCode, type, starRating } = req.body

    // Validate chain code
    if (!chainCode) {
      return next(new ApiError("Chain code is required", 400))
    }

    // Check if chain code already exists
    const existingChain = await Hotel.findOne({ chainCode, isHeadquarters: true })
    if (existingChain) {
      return next(new ApiError("Chain code already in use", 400))
    }

    // Check if hotel code already exists
    const existingHotel = await Hotel.findOne({ code })
    if (existingHotel) {
      return next(new ApiError("Hotel code already in use", 400))
    }

    // Create headquarters hotel
    const headquarters = await Hotel.create({
      name,
      code,
      description,
      type: type || "hotel",
      starRating: starRating || 0,
      isHeadquarters: true,
      chainCode,
      createdBy: req.user.id,
      updatedBy: req.user.id,
    })

    // Create shared configuration
    const sharedConfig = await SharedConfiguration.create({
      chainCode,
      name: `${name} Chain Configuration`,
      branding: {
        primaryColor: "#1a73e8",
        secondaryColor: "#f8f9fa",
        accentColor: "#fbbc04",
        font: {
          primary: "Roboto",
          secondary: "Open Sans",
        },
      },
      documentPrefixes: {
        invoice: {
          prefix: "INV",
          startingNumber: 1000,
          format: "{prefix}-{chainCode}-{year}{month}-{number}",
        },
        receipt: {
          prefix: "RCP",
          startingNumber: 1000,
          format: "{prefix}-{chainCode}-{year}{month}-{number}",
        },
        booking: {
          prefix: "BKG",
          startingNumber: 1000,
          format: "{prefix}-{chainCode}-{year}{month}-{number}",
        },
        guest: {
          prefix: "GST",
          startingNumber: 1000,
          format: "{prefix}-{chainCode}-{number}",
        },
      },
      systemSettings: {
        dateFormat: "MM/DD/YYYY",
        timeFormat: "12h",
        currency: {
          code: "USD",
          symbol: "$",
          position: "before",
        },
        timezone: "UTC",
        language: "en-US",
        measurementSystem: "metric",
      },
      overrideSettings: {
        branding: false,
        documentPrefixes: true,
        systemSettings: true,
      },
      createdBy: req.user.id,
      updatedBy: req.user.id,
    })

    // Grant access to the creator
    await UserHotelAccess.create({
      user: req.user.id,
      hotel: headquarters._id,
      accessLevel: "full",
      accessAllBranches: true,
      isDefault: true,
      createdBy: req.user.id,
      updatedBy: req.user.id,
    })

    res.status(201).json({
      success: true,
      data: {
        headquarters,
        sharedConfiguration: sharedConfig,
      },
    })
  } catch (error) {
    next(error)
  }
}

// Update hotel chain shared configuration
export const updateSharedConfiguration = async (req, res, next) => {
  try {
    const { chainCode } = req.params
    const { branding, documentPrefixes, systemSettings, overrideSettings } = req.body

    // Find shared configuration
    const sharedConfig = await SharedConfiguration.findOne({ chainCode })
    if (!sharedConfig) {
      return next(new ApiError("Shared configuration not found", 404))
    }

    // Update fields
    if (branding) sharedConfig.branding = { ...sharedConfig.branding, ...branding }
    if (documentPrefixes) sharedConfig.documentPrefixes = { ...sharedConfig.documentPrefixes, ...documentPrefixes }
    if (systemSettings) sharedConfig.systemSettings = { ...sharedConfig.systemSettings, ...systemSettings }
    if (overrideSettings) sharedConfig.overrideSettings = { ...sharedConfig.overrideSettings, ...overrideSettings }

    sharedConfig.updatedBy = req.user.id
    await sharedConfig.save()

    // If override settings changed, update all hotels in the chain
    if (overrideSettings) {
      await syncChainConfiguration(chainCode, sharedConfig, overrideSettings)
    }

    res.status(200).json({
      success: true,
      data: sharedConfig,
    })
  } catch (error) {
    next(error)
  }
}

// Add a hotel to an existing chain
export const addHotelToChain = async (req, res, next) => {
  try {
    const { chainCode } = req.params
    const { name, code, description, type, starRating, parentHotel } = req.body

    // Check if chain exists
    const headquarters = await Hotel.findOne({ chainCode, isHeadquarters: true })
    if (!headquarters) {
      return next(new ApiError("Hotel chain not found", 404))
    }

    // Check if hotel code already exists
    const existingHotel = await Hotel.findOne({ code })
    if (existingHotel) {
      return next(new ApiError("Hotel code already in use", 400))
    }

    // Validate parent hotel if provided
    if (parentHotel) {
      const parent = await Hotel.findOne({ _id: parentHotel, chainCode })
      if (!parent) {
        return next(new ApiError("Parent hotel not found in this chain", 404))
      }
    }

    // Create hotel
    const hotel = await Hotel.create({
      name,
      code,
      description,
      type: type || "hotel",
      starRating: starRating || 0,
      chainCode,
      parentHotel: parentHotel || headquarters._id,
      isHeadquarters: false,
      createdBy: req.user.id,
      updatedBy: req.user.id,
    })

    // Grant access to the creator
    await UserHotelAccess.create({
      user: req.user.id,
      hotel: hotel._id,
      accessLevel: "full",
      accessAllBranches: true,
      isDefault: false,
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

// Remove a hotel from a chain
export const removeHotelFromChain = async (req, res, next) => {
  try {
    const { chainCode, hotelId } = req.params

    // Check if hotel exists and belongs to the chain
    const hotel = await Hotel.findOne({ _id: hotelId, chainCode })
    if (!hotel) {
      return next(new ApiError("Hotel not found in this chain", 404))
    }

    // Cannot remove headquarters
    if (hotel.isHeadquarters) {
      return next(new ApiError("Cannot remove headquarters from chain", 400))
    }

    // Check if hotel has branches
    const hasBranches = await Hotel.exists({ parentHotel: hotel._id })
    if (hasBranches) {
      return next(new ApiError("Cannot remove hotel with branches. Please reassign branches first.", 400))
    }

    // Remove from chain by setting chainCode to null
    hotel.chainCode = null
    hotel.parentHotel = null
    hotel.updatedBy = req.user.id
    await hotel.save()

    res.status(200).json({
      success: true,
      message: "Hotel removed from chain successfully",
      data: hotel,
    })
  } catch (error) {
    next(error)
  }
}

// Sync configuration across all hotels in a chain
export const syncChainConfiguration = async (chainCode, sharedConfig, overrideSettings) => {
  // Get all hotels in the chain
  const hotels = await Hotel.find({ chainCode })

  // Update each hotel's configuration
  for (const hotel of hotels) {
    const config = await Configuration.findOne({ hotelId: hotel._id })
    if (config) {
      // Apply shared configuration based on override settings
      if (!overrideSettings.branding) {
        config.branding = sharedConfig.branding
      }

      if (!overrideSettings.documentPrefixes) {
        config.documentPrefixes = sharedConfig.documentPrefixes
      }

      if (!overrideSettings.systemSettings) {
        config.systemSettings = sharedConfig.systemSettings
      }

      await config.save()
    }
  }
}

// Build chain hierarchy
const buildChainHierarchy = async (hotels) => {
  const headquarters = hotels.find((hotel) => hotel.isHeadquarters)
  if (!headquarters) return null

  const hierarchy = {
    id: headquarters._id,
    name: headquarters.name,
    code: headquarters.code,
    type: headquarters.type,
    isHeadquarters: true,
    children: [],
  }

  // Function to recursively build the tree
  const buildTree = (parentId, parentNode) => {
    const children = hotels.filter((hotel) => hotel.parentHotel && hotel.parentHotel.toString() === parentId.toString())

    for (const child of children) {
      const childNode = {
        id: child._id,
        name: child.name,
        code: child.code,
        type: child.type,
        children: [],
      }
      parentNode.children.push(childNode)
      buildTree(child._id, childNode)
    }
  }

  // Start building from headquarters
  buildTree(headquarters._id, hierarchy)
  return hierarchy
}

// Get chain statistics
export const getChainStatistics = async (req, res, next) => {
  try {
    const { chainCode } = req.params

    // Check if chain exists
    const headquarters = await Hotel.findOne({ chainCode, isHeadquarters: true })
    if (!headquarters) {
      return next(new ApiError("Hotel chain not found", 404))
    }

    // Get all hotels in the chain
    const hotels = await Hotel.find({ chainCode })

    // Get hotel IDs for further queries
    const hotelIds = hotels.map((hotel) => hotel._id)

    // Get total number of active hotels
    const activeHotels = hotels.filter((hotel) => hotel.active).length

    // Get total number of rooms (would need to query Room model)
    // This is a placeholder - you would need to implement the actual query
    const totalRooms = 0

    // Get total number of active bookings (would need to query Booking model)
    // This is a placeholder - you would need to implement the actual query
    const activeBookings = 0

    // Get total number of guests (would need to query Guest model)
    // This is a placeholder - you would need to implement the actual query
    const totalGuests = 0

    res.status(200).json({
      success: true,
      data: {
        totalHotels: hotels.length,
        activeHotels,
        totalRooms,
        activeBookings,
        totalGuests,
        hotels: hotels.map((hotel) => ({
          id: hotel._id,
          name: hotel.name,
          code: hotel.code,
          active: hotel.active,
        })),
      },
    })
  } catch (error) {
    next(error)
  }
}

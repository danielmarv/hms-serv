import Hotel from "../models/Hotel.js"
import UserHotelAccess from "../models/userHotelAccess.js"
import User from "../models/User.js"
import { ApiError } from "../utils/apiError.js"

// Get all users with access across multiple hotels
export const getCrossHotelUsers = async (req, res, next) => {
  try {
    const { chainCode } = req.params

    // Check if chain exists
    const headquarters = await Hotel.findOne({ chainCode, isHeadquarters: true })
    if (!headquarters) {
      return next(new ApiError("Hotel chain not found", 404))
    }

    // Get all hotels in the chain
    const hotels = await Hotel.find({ chainCode })
    const hotelIds = hotels.map((hotel) => hotel._id)

    // Find users with access to multiple hotels in the chain
    const accessRecords = await UserHotelAccess.find({ hotel: { $in: hotelIds } })
      .populate("user", "full_name email status")
      .populate("hotel", "name code")

    // Group by user
    const userMap = new Map()

    for (const record of accessRecords) {
      if (!record.user) continue

      const userId = record.user._id.toString()

      if (!userMap.has(userId)) {
        userMap.set(userId, {
          user: {
            id: record.user._id,
            full_name: record.user.full_name,
            email: record.user.email,
            status: record.user.status,
          },
          hotelAccess: [],
        })
      }

      userMap.get(userId).hotelAccess.push({
        hotel: record.hotel,
        accessLevel: record.accessLevel,
        accessAllBranches: record.accessAllBranches,
      })
    }

    // Convert map to array
    const users = Array.from(userMap.values())

    // Filter to only include users with access to multiple hotels
    const crossHotelUsers = users.filter((user) => user.hotelAccess.length > 1)

    res.status(200).json({
      success: true,
      count: crossHotelUsers.length,
      data: crossHotelUsers,
    })
  } catch (error) {
    next(error)
  }
}

// Grant user access to all hotels in a chain
export const grantChainAccess = async (req, res, next) => {
  try {
    const { chainCode } = req.params
    const { userId, accessLevel } = req.body

    // Check if user exists
    const user = await User.findById(userId)
    if (!user) {
      return next(new ApiError("User not found", 404))
    }

    // Check if chain exists
    const headquarters = await Hotel.findOne({ chainCode, isHeadquarters: true })
    if (!headquarters) {
      return next(new ApiError("Hotel chain not found", 404))
    }

    // Get all hotels in the chain
    const hotels = await Hotel.find({ chainCode })

    // Grant access to each hotel
    const accessRecords = []

    for (const hotel of hotels) {
      // Check if access already exists
      const existingAccess = await UserHotelAccess.findOne({ user: userId, hotel: hotel._id })

      if (existingAccess) {
        // Update existing access
        existingAccess.accessLevel = accessLevel
        existingAccess.accessAllBranches = true
        existingAccess.updatedBy = req.user.id
        await existingAccess.save()
        accessRecords.push(existingAccess)
      } else {
        // Create new access
        const newAccess = await UserHotelAccess.create({
          user: userId,
          hotel: hotel._id,
          accessLevel,
          accessAllBranches: true,
          isDefault: hotel.isHeadquarters, // Set headquarters as default
          createdBy: req.user.id,
          updatedBy: req.user.id,
        })
        accessRecords.push(newAccess)
      }
    }

    res.status(200).json({
      success: true,
      message: `Access granted to ${hotels.length} hotels in the chain`,
      data: {
        userId,
        chainCode,
        accessLevel,
        hotelCount: hotels.length,
      },
    })
  } catch (error) {
    next(error)
  }
}

// Revoke user access from all hotels in a chain
export const revokeChainAccess = async (req, res, next) => {
  try {
    const { chainCode, userId } = req.params

    // Check if user exists
    const user = await User.findById(userId)
    if (!user) {
      return next(new ApiError("User not found", 404))
    }

    // Check if chain exists
    const headquarters = await Hotel.findOne({ chainCode, isHeadquarters: true })
    if (!headquarters) {
      return next(new ApiError("Hotel chain not found", 404))
    }

    // Get all hotels in the chain
    const hotels = await Hotel.find({ chainCode })
    const hotelIds = hotels.map((hotel) => hotel._id)

    // Delete all access records
    const result = await UserHotelAccess.deleteMany({
      user: userId,
      hotel: { $in: hotelIds },
    })

    res.status(200).json({
      success: true,
      message: `Access revoked from ${result.deletedCount} hotels in the chain`,
      data: {
        userId,
        chainCode,
        hotelsAffected: result.deletedCount,
      },
    })
  } catch (error) {
    next(error)
  }
}

// Get users with access to a specific hotel
export const getHotelUsers = async (req, res, next) => {
  try {
    const { hotelId } = req.params
    const { includeChainUsers = false } = req.query

    // Check if hotel exists
    const hotel = await Hotel.findById(hotelId)
    if (!hotel) {
      return next(new ApiError("Hotel not found", 404))
    }

    // Get direct access records
    const directAccessRecords = await UserHotelAccess.find({ hotel: hotelId })
      .populate("user", "full_name email status")
      .populate("permissions", "key description")

    let chainAccessRecords = []

    // If hotel is part of a chain and includeChainUsers is true, get chain-wide access
    if (includeChainUsers === "true" && hotel.chainCode) {
      // Get headquarters
      const headquarters = await Hotel.findOne({
        chainCode: hotel.chainCode,
        isHeadquarters: true,
      })

      if (headquarters) {
        // Get users with access to headquarters and accessAllBranches=true
        chainAccessRecords = await UserHotelAccess.find({
          hotel: headquarters._id,
          accessAllBranches: true,
        })
          .populate("user", "full_name email status")
          .populate("permissions", "key description")
      }
    }

    // Combine and deduplicate users
    const allRecords = [...directAccessRecords]

    // Add chain users if they don't already have direct access
    for (const chainRecord of chainAccessRecords) {
      const userExists = directAccessRecords.some(
        (record) => record.user && chainRecord.user && record.user._id.toString() === chainRecord.user._id.toString(),
      )

      if (!userExists && chainRecord.user) {
        allRecords.push({
          ...chainRecord.toObject(),
          accessSource: "chain",
        })
      }
    }

    res.status(200).json({
      success: true,
      count: allRecords.length,
      data: allRecords,
    })
  } catch (error) {
    next(error)
  }
}

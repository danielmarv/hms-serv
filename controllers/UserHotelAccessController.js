import UserHotelAccess from "../models/user-hotel-access.tsx"
import User from "../models/User.js"
import Hotel from "../models/Hotel.js"
import { ApiError } from "../utils/apiError.js"

// Get all hotel access records for a user
export const getUserHotelAccess = async (req, res, next) => {
  try {
    const { userId } = req.params

    // Check if user exists
    const user = await User.findById(userId)
    if (!user) {
      return next(new ApiError("User not found", 404))
    }

    // Get access records
    const accessRecords = await UserHotelAccess.find({ user: userId })
      .populate("hotel", "name code type")
      .populate("accessibleBranches", "name code type")
      .populate("permissions", "key description")

    res.status(200).json({
      success: true,
      count: accessRecords.length,
      data: accessRecords,
    })
  } catch (error) {
    next(error)
  }
}

// Get all users with access to a hotel
export const getHotelUserAccess = async (req, res, next) => {
  try {
    const { hotelId } = req.params

    // Check if hotel exists
    const hotel = await Hotel.findById(hotelId)
    if (!hotel) {
      return next(new ApiError("Hotel not found", 404))
    }

    // Get access records
    const accessRecords = await UserHotelAccess.find({ hotel: hotelId })
      .populate("user", "full_name email")
      .populate("permissions", "key description")

    res.status(200).json({
      success: true,
      count: accessRecords.length,
      data: accessRecords,
    })
  } catch (error) {
    next(error)
  }
}

// Grant hotel access to a user
export const grantHotelAccess = async (req, res, next) => {
  try {
    const { userId, hotelId } = req.params
    const { accessLevel, permissions, accessAllBranches, accessibleBranches, isDefault } = req.body

    // Check if user exists
    const user = await User.findById(userId)
    if (!user) {
      return next(new ApiError("User not found", 404))
    }

    // Check if hotel exists
    const hotel = await Hotel.findById(hotelId)
    if (!hotel) {
      return next(new ApiError("Hotel not found", 404))
    }

    // Check if access already exists
    const existingAccess = await UserHotelAccess.findOne({ user: userId, hotel: hotelId })
    if (existingAccess) {
      return next(new ApiError("User already has access to this hotel", 400))
    }

    // Validate accessible branches if provided
    if (!accessAllBranches && accessibleBranches && accessibleBranches.length > 0) {
      // Verify all branches belong to this hotel
      const branches = await Hotel.find({
        _id: { $in: accessibleBranches },
        parentHotel: hotelId,
      })

      if (branches.length !== accessibleBranches.length) {
        return next(new ApiError("One or more branches are invalid", 400))
      }
    }

    // Create access record
    const accessRecord = await UserHotelAccess.create({
      user: userId,
      hotel: hotelId,
      accessLevel,
      permissions,
      accessAllBranches: accessAllBranches || false,
      accessibleBranches: !accessAllBranches ? accessibleBranches : [],
      isDefault: isDefault || false,
      createdBy: req.user.id,
      updatedBy: req.user.id,
    })

    await accessRecord.populate("hotel", "name code type")
    await accessRecord.populate("user", "full_name email")

    if (permissions && permissions.length > 0) {
      await accessRecord.populate("permissions", "key description")
    }

    res.status(201).json({
      success: true,
      data: accessRecord,
    })
  } catch (error) {
    next(error)
  }
}

// Update hotel access for a user
export const updateHotelAccess = async (req, res, next) => {
  try {
    const { userId, hotelId } = req.params
    const { accessLevel, permissions, accessAllBranches, accessibleBranches, isDefault } = req.body

    // Find access record
    const accessRecord = await UserHotelAccess.findOne({ user: userId, hotel: hotelId })
    if (!accessRecord) {
      return next(new ApiError("Access record not found", 404))
    }

    // Validate accessible branches if provided
    if (!accessAllBranches && accessibleBranches && accessibleBranches.length > 0) {
      // Verify all branches belong to this hotel
      const branches = await Hotel.find({
        _id: { $in: accessibleBranches },
        parentHotel: hotelId,
      })

      if (branches.length !== accessibleBranches.length) {
        return next(new ApiError("One or more branches are invalid", 400))
      }
    }

    // Update fields
    if (accessLevel) accessRecord.accessLevel = accessLevel
    if (permissions) accessRecord.permissions = permissions
    if (accessAllBranches !== undefined) accessRecord.accessAllBranches = accessAllBranches
    if (!accessAllBranches && accessibleBranches) accessRecord.accessibleBranches = accessibleBranches
    if (accessAllBranches) accessRecord.accessibleBranches = []
    if (isDefault !== undefined) accessRecord.isDefault = isDefault

    accessRecord.updatedBy = req.user.id
    await accessRecord.save()

    await accessRecord.populate("hotel", "name code type")
    await accessRecord.populate("user", "full_name email")

    if (accessRecord.permissions && accessRecord.permissions.length > 0) {
      await accessRecord.populate("permissions", "key description")
    }

    if (!accessRecord.accessAllBranches && accessRecord.accessibleBranches.length > 0) {
      await accessRecord.populate("accessibleBranches", "name code type")
    }

    res.status(200).json({
      success: true,
      data: accessRecord,
    })
  } catch (error) {
    next(error)
  }
}

// Revoke hotel access from a user
export const revokeHotelAccess = async (req, res, next) => {
  try {
    const { userId, hotelId } = req.params

    // Find access record
    const accessRecord = await UserHotelAccess.findOne({ user: userId, hotel: hotelId })
    if (!accessRecord) {
      return next(new ApiError("Access record not found", 404))
    }

    // Delete access record
    await accessRecord.deleteOne()

    res.status(200).json({
      success: true,
      message: "Hotel access revoked successfully",
    })
  } catch (error) {
    next(error)
  }
}

// Get user's default hotel
export const getUserDefaultHotel = async (req, res, next) => {
  try {
    const { userId } = req.params

    // Check if user exists
    const user = await User.findById(userId)
    if (!user) {
      return next(new ApiError("User not found", 404))
    }

    // Get default hotel access
    const defaultAccess = await UserHotelAccess.findOne({
      user: userId,
      isDefault: true,
    }).populate("hotel")

    if (!defaultAccess) {
      return res.status(200).json({
        success: true,
        data: null,
        message: "No default hotel set for this user",
      })
    }

    res.status(200).json({
      success: true,
      data: {
        hotel: defaultAccess.hotel,
        accessLevel: defaultAccess.accessLevel,
        accessAllBranches: defaultAccess.accessAllBranches,
      },
    })
  } catch (error) {
    next(error)
  }
}

// Set user's default hotel
export const setUserDefaultHotel = async (req, res, next) => {
  try {
    const { userId, hotelId } = req.params

    // Check if access exists
    const accessRecord = await UserHotelAccess.findOne({ user: userId, hotel: hotelId })
    if (!accessRecord) {
      return next(new ApiError("User does not have access to this hotel", 404))
    }

    // Set as default
    accessRecord.isDefault = true
    accessRecord.updatedBy = req.user.id
    await accessRecord.save()

    res.status(200).json({
      success: true,
      message: "Default hotel set successfully",
      data: {
        userId,
        hotelId,
      },
    })
  } catch (error) {
    next(error)
  }
}

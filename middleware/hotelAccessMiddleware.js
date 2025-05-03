import Hotel from "../models/Hotel.js"
import UserHotelAccess from "../models/userHotelAccess.js"
import { ApiError } from "../utils/apiError.js"

// Middleware to check if user has access to a specific hotel
export const checkHotelAccess = (paramName = "hotelId", minAccessLevel = "read-only") => {
  return async (req, res, next) => {
    try {
      const hotelId = req.params[paramName]

      // Skip for super admin
      if (req.user.role?.name === "super admin") {
        return next()
      }

      // Get the hotel
      const hotel = await Hotel.findById(hotelId)
      if (!hotel) {
        return next(new ApiError("Hotel not found", 404))
      }

      // Check direct access to this hotel
      const directAccess = await UserHotelAccess.findOne({
        user: req.user.id,
        hotel: hotelId,
      })

      if (directAccess) {
        // Check access level
        if (hasRequiredAccessLevel(directAccess.accessLevel, minAccessLevel)) {
          req.hotelAccess = directAccess
          return next()
        }
      }

      // If no direct access and hotel is part of a chain, check chain access
      if (hotel.chainCode) {
        // Get headquarters
        const headquarters = await Hotel.findOne({
          chainCode: hotel.chainCode,
          isHeadquarters: true,
        })

        if (headquarters) {
          // Check if user has chain-wide access
          const chainAccess = await UserHotelAccess.findOne({
            user: req.user.id,
            hotel: headquarters._id,
            accessAllBranches: true,
          })

          if (chainAccess && hasRequiredAccessLevel(chainAccess.accessLevel, minAccessLevel)) {
            req.hotelAccess = chainAccess
            req.isChainAccess = true
            return next()
          }
        }
      }

      // If hotel has a parent, check if user has access to parent with accessAllBranches
      if (hotel.parentHotel) {
        const parentAccess = await UserHotelAccess.findOne({
          user: req.user.id,
          hotel: hotel.parentHotel,
          accessAllBranches: true,
        })

        if (parentAccess && hasRequiredAccessLevel(parentAccess.accessLevel, minAccessLevel)) {
          req.hotelAccess = parentAccess
          req.isParentAccess = true
          return next()
        }
      }

      // No access found
      return next(new ApiError("You don't have access to this hotel", 403))
    } catch (error) {
      next(error)
    }
  }
}

// Helper function to check if user has required access level
const hasRequiredAccessLevel = (userLevel, requiredLevel) => {
  const levels = ["read-only", "limited", "full"]
  const userLevelIndex = levels.indexOf(userLevel)
  const requiredLevelIndex = levels.indexOf(requiredLevel)

  return userLevelIndex >= requiredLevelIndex
}

// Middleware to check if user has access to a specific chain
export const checkChainAccess = (minAccessLevel = "read-only") => {
  return async (req, res, next) => {
    try {
      const { chainCode } = req.params

      // Skip for super admin
      if (req.user.role?.name === "super admin") {
        return next()
      }

      // Get headquarters
      const headquarters = await Hotel.findOne({
        chainCode,
        isHeadquarters: true,
      })

      if (!headquarters) {
        return next(new ApiError("Hotel chain not found", 404))
      }

      // Check if user has access to headquarters
      const access = await UserHotelAccess.findOne({
        user: req.user.id,
        hotel: headquarters._id,
      })

      if (access && hasRequiredAccessLevel(access.accessLevel, minAccessLevel)) {
        req.chainAccess = access
        return next()
      }

      // No access found
      return next(new ApiError("You don't have access to this hotel chain", 403))
    } catch (error) {
      next(error)
    }
  }
}

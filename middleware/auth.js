import jwt from "jsonwebtoken"
import User from "../models/User.js"
import Hotel from "../models/Hotel.js"
import { ApiError } from "../utils/apiError.js"
import "../models/Permission.js"
import mongoose from "mongoose"

/**
 * Authenticate user with JWT and establish hotel context
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const authenticate = async (req, res, next) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization
    const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null

    // Check if token exists
    if (!token) {
      return next(new ApiError("Not authorized, no token provided", 401))
    }

    // Verify token
    let decoded
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET)
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return next(new ApiError("Token expired, please login again", 401))
      }
      return next(new ApiError("Not authorized, invalid token", 401))
    }

    // Find user and populate role, permissions, and hotel associations
    const user = await User.findById(decoded.id)
      .select("-password")
      .populate({
        path: "role",
        populate: {
          path: "permissions",
          model: "Permission",
          select: "key description category isGlobal",
        },
      })
      .populate({
        path: "custom_permissions",
        select: "key description category isGlobal",
      })
      .populate("primary_hotel")
      .populate({
        path: "accessible_hotels.hotel",
        model: "Hotel",
      })
      .populate({
        path: "accessible_hotels.role",
        model: "Role",
        populate: {
          path: "permissions",
          model: "Permission",
        },
      })

    // Check if user exists
    if (!user) {
      return next(new ApiError("Not authorized, user not found", 401))
    }

    // Check if user is active
    if (user.status !== "active") {
      return next(new ApiError("Account is inactive or suspended", 403))
    }

    // Add user to request object
    req.user = user

    // Establish hotel context
    await establishHotelContext(req)

    // Pre-compute effective permissions for performance
    req.user.effectivePermissions = await user.getEffectivePermissions(req.hotelId)

    next()
  } catch (error) {
    console.error("🔥 Auth Middleware Error:", error)
    next(error)
  }
}

/**
 * Establish hotel context for the request
 * @param {Object} req - Express request object
 */
const establishHotelContext = async (req) => {
  // Check for hotel ID in headers, params, or query
  const hotelIdFromRequest = req.headers["x-hotel-id"] || req.params.hotelId || req.query.hotelId || req.body.hotelId

  // If hotel ID is provided in the request, validate and use it
  if (hotelIdFromRequest) {
    // Validate hotel ID format
    if (!mongoose.Types.ObjectId.isValid(hotelIdFromRequest)) {
      throw new ApiError("Invalid hotel ID format", 400)
    }

    // Check if user has access to this hotel
    if (!req.user.hasHotelAccess(hotelIdFromRequest)) {
      throw new ApiError("You do not have access to this hotel", 403)
    }

    // Set hotel context
    req.hotelId = hotelIdFromRequest
  } else {
    // Use primary hotel as default context
    req.hotelId = req.user.primary_hotel ? req.user.primary_hotel._id : null
  }

  // If no hotel context could be established and user is not a global admin
  if (!req.hotelId && !req.user.is_global_admin && !["super admin", "admin"].includes(req.user.role?.name)) {
    throw new ApiError("No hotel context could be established", 400)
  }

  // If hotel ID is set, fetch hotel details
  if (req.hotelId) {
    const hotel = await Hotel.findById(req.hotelId)
    if (!hotel) {
      throw new ApiError("Hotel not found", 404)
    }
    req.hotel = hotel
  }
}

/**
 * Authorize based on roles
 * @param {...string} roles - Roles that are authorized to access the resource
 * @returns {Function} Express middleware
 */
export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError("User not authenticated", 401))
    }

    // Super admin bypass
    if (req.user.is_global_admin || req.user.role?.name === "super admin") {
      return next()
    }

    // Check user's primary role
    const userRole = req.user.role?.name
    if (!userRole || !roles.includes(userRole)) {
      // Check hotel-specific role if in hotel context
      if (req.hotelId) {
        const hotelAccess = req.user.accessible_hotels.find(
          (access) => access.hotel && access.hotel._id.toString() === req.hotelId.toString(),
        )
        if (hotelAccess && hotelAccess.role && roles.includes(hotelAccess.role.name)) {
          return next()
        }
      }
      return next(new ApiError(`Role (${userRole}) is not authorized to access this resource`, 403))
    }

    next()
  }
}

/**
 * Authorize based on permissions
 * @param {string|string[]} requiredPermissions - Permission(s) required to access the resource
 * @param {Object} options - Additional options
 * @param {boolean} options.requireAll - If true, user must have all permissions; if false, any one is sufficient
 * @returns {Function} Express middleware
 */
export const authorize = (requiredPermissions = [], options = { requireAll: true }) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return next(new ApiError("User not authenticated", 401))
      }

      // Super admin bypass
      if (req.user.is_global_admin || req.user.role?.name === "super admin") {
        return next()
      }

      // Convert to array if string
      const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions]

      // If no permissions required, proceed
      if (permissions.length === 0) {
        return next()
      }

      // Get effective permissions for the current hotel context
      const userPermissions = req.user.effectivePermissions || (await req.user.getEffectivePermissions(req.hotelId))

      // Check permissions based on options
      let hasPermission = false

      if (options.requireAll) {
        // User must have ALL required permissions
        hasPermission = permissions.every((permission) => userPermissions.includes(permission))
      } else {
        // User must have ANY of the required permissions
        hasPermission = permissions.some((permission) => userPermissions.includes(permission))
      }

      if (!hasPermission) {
        return next(
          new ApiError(
            `You do not have the required permission(s): ${permissions.join(", ")} for this hotel context`,
            403,
          ),
        )
      }

      next()
    } catch (error) {
      next(error)
    }
  }
}

/**
 * Require a valid hotel context for the request
 * @returns {Function} Express middleware
 */
export const requireHotelContext = () => {
  return (req, res, next) => {
    // Skip for global admins if they're performing global operations
    if (
      (req.user.is_global_admin || ["super admin", "admin"].includes(req.user.role?.name)) &&
      req.path.startsWith("/api/global")
    ) {
      return next()
    }

    if (!req.hotelId) {
      return next(new ApiError("Hotel context is required for this operation", 400))
    }

    next()
  }
}

/**
 * Check if user is a super admin
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const isSuperAdmin = (req, res, next) => {
  if (!req.user) {
    return next(new ApiError("User not authenticated", 401))
  }

  if (!req.user.is_global_admin && req.user.role?.name !== "super admin") {
    return next(new ApiError("This action requires super admin privileges", 403))
  }

  next()
}

/**
 * Check if user is an admin or super admin
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const isAdmin = (req, res, next) => {
  if (!req.user) {
    return next(new ApiError("User not authenticated", 401))
  }

  if (!req.user.is_global_admin && !["super admin", "admin"].includes(req.user.role?.name)) {
    return next(new ApiError("This action requires admin privileges", 403))
  }

  next()
}

/**
 * Check if user is the owner of a resource or has admin privileges
 * @param {string} modelName - Name of the model to check ownership against
 * @param {string} paramIdField - Name of the parameter containing the resource ID
 * @returns {Function} Express middleware
 */
export const isOwnerOrAdmin = (modelName, paramIdField = "id") => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[paramIdField]
      const userId = req.user.id

      // Admin bypass
      if (req.user.is_global_admin || ["super admin", "admin"].includes(req.user.role?.name)) {
        return next()
      }

      // Check if resource ID is valid
      if (!mongoose.Types.ObjectId.isValid(resourceId)) {
        return next(new ApiError(`Invalid ${modelName} ID format`, 400))
      }

      // Use dynamic import instead of require
      const Model = (await import(`../models/${modelName}.js`)).default
      const resource = await Model.findById(resourceId)

      if (!resource) {
        return next(new ApiError(`${modelName} not found`, 404))
      }

      // Check if resource belongs to the current hotel context
      if (resource.hotel && req.hotelId && resource.hotel.toString() !== req.hotelId.toString()) {
        return next(new ApiError(`This ${modelName} does not belong to your current hotel context`, 403))
      }

      // Check if user is the owner (createdBy) or the resource itself
      if (
        (resource.createdBy && resource.createdBy.toString() === userId.toString()) ||
        (modelName === "User" && resource._id.toString() === userId.toString())
      ) {
        return next()
      }

      // Check if user has admin access to the hotel
      if (resource.hotel) {
        const hotelAccess = req.user.accessible_hotels.find((access) => access.hotel && access)
        const hotelAdminAccess = req.user.accessible_hotels.find(
          (access) =>
            access.hotel &&
            access.hotel._id.toString() === resource.hotel.toString() &&
            access.access_level === "admin",
        )

        if (hotelAdminAccess) {
          return next()
        }
      }

      return next(new ApiError("Not authorized to access this resource", 403))
    } catch (error) {
      next(error)
    }
  }
}

/**
 * Filter query results based on hotel context
 * @param {Object} req - Express request object
 * @param {Object} query - Mongoose query object
 * @returns {Object} Modified query with hotel context filter
 */
export const applyHotelFilter = (req, query) => {
  // Skip for global admins if explicitly requested
  if (
    (req.user.is_global_admin || ["super admin", "admin"].includes(req.user.role?.name)) &&
    req.query.global === "true"
  ) {
    return query
  }

  // Apply hotel filter if hotel context is established
  if (req.hotelId) {
    query.where("hotel").equals(req.hotelId)
  }

  return query
}


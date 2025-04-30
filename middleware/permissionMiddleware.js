import { ApiError } from "../utils/apiError.js"

/**
 * Middleware to check if user has required permissions
 * @param {String|Array} requiredPermissions - Permission key(s) required for the route
 * @param {Boolean} requireAll - If true, user must have all permissions. If false, any one is sufficient
 * @param {Boolean} globalOnly - If true, only check global permissions (ignoring hotel-specific)
 */
export const hasPermission = (requiredPermissions, requireAll = true, globalOnly = false) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return next(new ApiError("Authentication required", 401))
      }

      // Get user permissions (efficiently via method in User model)
      const user = req.user
      const effectivePermissions = await user.getEffectivePermissions()

      // Convert to array if string
      const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions]

      // Check if user has required permissions
      const hasRequiredPermissions = requireAll
        ? permissions.every((p) => effectivePermissions.includes(p))
        : permissions.some((p) => effectivePermissions.includes(p))

      if (!hasRequiredPermissions) {
        return next(new ApiError("You don't have permission to perform this action", 403))
      }

      next()
    } catch (error) {
      next(error)
    }
  }
}

/**
 * Middleware to check if user has hotel-specific permission
 * @param {String|Array} requiredPermissions - Permission key(s) required for the hotel
 * @param {String} hotelParam - Parameter name to extract hotel ID (default: 'hotelId')
 */
export const hasHotelPermission = (requiredPermissions, hotelParam = "hotelId") => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return next(new ApiError("Authentication required", 401))
      }

      // Get hotel ID from request
      const hotelId = req.params[hotelParam] || req.body.hotelId || req.query.hotelId

      if (!hotelId) {
        return next(new ApiError("Hotel ID is required", 400))
      }

      // Check if user has access to this hotel
      const hasAccess = await req.user.hasHotelAccess(hotelId)

      if (!hasAccess) {
        return next(new ApiError("You don't have access to this hotel", 403))
      }

      // Check required permissions for this hotel
      const hasPermission = await req.user.hasHotelPermission(hotelId, requiredPermissions)

      if (!hasPermission) {
        return next(new ApiError("You don't have permission to perform this action in this hotel", 403))
      }

      next()
    } catch (error) {
      next(error)
    }
  }
}

/**
 * Middleware to check if user is a super administrator
 */
export const isSuperAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return next(new ApiError("Authentication required", 401))
    }

    // Populate role if not already populated
    if (!req.user.populated("role")) {
      await req.user.populate("role")
    }

    // Check if user has super admin role
    if (req.user.role && req.user.role.name === "super admin") {
      return next()
    }

    // If not super admin, deny access
    return next(new ApiError("Super administrator access required", 403))
  } catch (error) {
    next(error)
  }
}

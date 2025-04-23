import jwt from "jsonwebtoken"
import User from "../models/User.js"
import { ApiError } from "../utils/apiError.js"
import '../models/Permission.js'

// Authenticate user with JWT
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null

    console.log("🔐 Received Token:", token)
    console.log("🔑 JWT_SECRET:", process.env.JWT_SECRET)

    if (!token) {
      return next(new ApiError("Not authorized, no token provided", 401))
    }

    let decoded
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET)
      console.log("✅ Decoded Token:", decoded)
    } catch (err) {
      console.error("❌ JWT Verification Error:", err)
      return next(new ApiError("Not authorized, invalid token", 401))
    }

    const user = await User.findById(decoded.id)
      .select("-password")
      .populate({
        path: "role",
        populate: {
          path: "permissions",
          model: "Permission",
        },
      })
      .populate("custom_permissions")

    if (!user) {
      return next(new ApiError("Not authorized, user not found", 401))
    }

    if (user.status !== "active") {
      return next(new ApiError("Account is inactive or suspended", 403))
    }

    req.user = user
    next()
  } catch (error) {
    console.error("🔥 Auth Middleware Error:", error)
    next(error)
  }
}


// Authorize based on roles
export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError("User not authenticated", 401))
    }

    const userRole = req.user.role?.name
    if (!userRole || !roles.includes(userRole)) {
      return next(new ApiError(`Role (${userRole}) is not authorized to access this resource`, 403))
    }

    next()
  }
}

// Authorize based on permissions
export const authorize = (requiredPermissions = []) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return next(new ApiError("User not authenticated", 401))
      }

      // Super admin bypass
      if (req.user.role?.name === "super admin") {
        return next()
      }

      // Get user's effective permissions
      const userPermissions = await req.user.getEffectivePermissions()

      // Check if user has all required permissions
      const hasPermission = requiredPermissions.every((permission) => userPermissions.includes(permission))

      if (!hasPermission) {
        return next(new ApiError("You do not have permission to perform this action", 403))
      }

      next()
    } catch (error) {
      next(error)
    }
  }
}

// Check if user is the owner of a resource or has admin privileges
export const isOwnerOrAdmin = (modelName, paramIdField = "id") => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[paramIdField]
      const userId = req.user.id

      // Admin bypass
      if (req.user.role?.name === "super admin" || req.user.role?.name === "admin") {
        return next()
      }

      // Use dynamic import instead of require
      const Model = (await import(`../models/${modelName}.js`)).default
      const resource = await Model.findById(resourceId)

      if (!resource) {
        return next(new ApiError(`${modelName} not found`, 404))
      }

      // Check if user is the owner (createdBy) or the resource itself
      if (
        (resource.createdBy && resource.createdBy.toString() === userId.toString()) ||
        (modelName === "User" && resource._id.toString() === userId.toString())
      ) {
        return next()
      }

      return next(new ApiError("Not authorized to access this resource", 403))
    } catch (error) {
      next(error)
    }
  }
}

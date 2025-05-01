import User from "../models/User.js"
import Role from "../models/Role.js"
import Hotel from "../models/Hotel.js"
import { ApiError } from "../utils/apiError.js"

// Get all users with filtering, pagination, and sorting
export const getAllUsers = async (req, res, next) => {
  try {
    const { status, role, department, search, page = 1, limit = 20, sort = "-createdAt" } = req.query

    // Build filter object
    const filter = {}

    if (status) filter.status = status
    if (role) filter.role = role
    if (department) filter.department = department

    // Search functionality
    if (search) {
      filter.$or = [
        { full_name: new RegExp(search, "i") },
        { email: new RegExp(search, "i") },
        { phone: new RegExp(search, "i") },
      ]
    }

    // Apply hotel filter if in hotel context
    if (req.hotelId && !req.user.is_global_admin && !["super admin", "admin"].includes(req.user.role?.name)) {
      // Find users with access to this hotel
      filter.$or = [
        { primary_hotel: req.hotelId },
        { "accessible_hotels.hotel": req.hotelId },
        { is_global_admin: true },
      ]
    }

    // Calculate pagination
    const skip = (Number(page) - 1) * Number(limit)

    // Execute query with pagination and sorting
    const query = User.find(filter)
      .populate("role", "name description")
      .populate("custom_permissions", "key description")
      .populate("primary_hotel", "name code")
      .sort(sort)
      .skip(skip)
      .limit(Number(limit))

    // Get total count for pagination
    const total = await User.countDocuments(filter)

    // Execute query
    const users = await query

    res.status(200).json({
      success: true,
      count: users.length,
      total,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
      data: users,
    })
  } catch (error) {
    next(error)
  }
}

// Get user by ID
export const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .populate("role", "name description")
      .populate("custom_permissions", "key description")
      .populate("primary_hotel", "name code type")
      .populate("accessible_hotels.hotel", "name code type")
      .populate("accessible_hotels.role", "name description")
      .populate("createdBy", "full_name")
      .populate("updatedBy", "full_name")

    if (!user) {
      return next(new ApiError("User not found", 404))
    }

    // Check if requesting user has access to view this user
    if (
      !req.user.is_global_admin &&
      !["super admin", "admin"].includes(req.user.role?.name) &&
      req.hotelId &&
      !user.hasHotelAccess(req.hotelId)
    ) {
      return next(new ApiError("Not authorized to view this user", 403))
    }

    res.status(200).json({
      success: true,
      data: user,
    })
  } catch (error) {
    next(error)
  }
}

// Create user
export const createUser = async (req, res, next) => {
  try {
    const {
      full_name,
      email,
      password,
      phone,
      gender,
      dob,
      role,
      custom_permissions,
      national_id,
      address,
      department,
      job_title,
      is_global_admin,
      primary_hotel,
      accessible_hotels,
    } = req.body

    // Check if email already exists
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return next(new ApiError("Email already in use", 400))
    }

    // Validate role if provided
    if (role) {
      const roleExists = await Role.findById(role)
      if (!roleExists) {
        return next(new ApiError("Invalid role", 400))
      }
    }

    // Validate primary hotel if provided
    if (primary_hotel) {
      const hotelExists = await Hotel.findById(primary_hotel)
      if (!hotelExists) {
        return next(new ApiError("Invalid primary hotel", 400))
      }
    }

    // If in hotel context and no primary_hotel specified, use current hotel
    const userPrimaryHotel = primary_hotel || (req.hotelId ? req.hotelId : null)

    // Validate accessible hotels if provided
    const validatedAccessibleHotels = []
    if (accessible_hotels && accessible_hotels.length > 0) {
      for (const access of accessible_hotels) {
        // Validate hotel
        const hotel = await Hotel.findById(access.hotel)
        if (!hotel) {
          return next(new ApiError(`Invalid hotel ID: ${access.hotel}`, 400))
        }

        // Validate role if provided
        if (access.role) {
          const roleExists = await Role.findById(access.role)
          if (!roleExists) {
            return next(new ApiError(`Invalid role ID for hotel ${hotel.name}: ${access.role}`, 400))
          }
        }

        validatedAccessibleHotels.push({
          hotel: access.hotel,
          role: access.role,
          access_level: access.access_level || "read",
        })
      }
    }

    // If in hotel context and no accessible_hotels specified, add current hotel
    if (req.hotelId && validatedAccessibleHotels.length === 0 && !req.body.accessible_hotels) {
      validatedAccessibleHotels.push({
        hotel: req.hotelId,
        role: role, // Use the same role as the user's primary role
        access_level: "read",
      })
    }

    // Only super admin can create global admins
    if (is_global_admin && !req.user.is_global_admin && req.user.role?.name !== "super admin") {
      return next(new ApiError("Only super admins can create global admin users", 403))
    }

    // Create user
    const user = await User.create({
      full_name,
      email,
      password,
      phone,
      gender,
      dob,
      role,
      custom_permissions,
      national_id,
      address,
      department,
      job_title,
      is_global_admin: is_global_admin || false,
      primary_hotel: userPrimaryHotel,
      accessible_hotels: validatedAccessibleHotels,
      createdBy: req.user.id,
      updatedBy: req.user.id,
    })

    // Populate related fields for response
    await user.populate([
      { path: "role", select: "name description" },
      { path: "custom_permissions", select: "key description" },
      { path: "primary_hotel", select: "name code type" },
      { path: "accessible_hotels.hotel", select: "name code type" },
      { path: "accessible_hotels.role", select: "name description" },
    ])

    res.status(201).json({
      success: true,
      data: user,
    })
  } catch (error) {
    next(error)
  }
}

// Update user
export const updateUser = async (req, res, next) => {
  try {
    const {
      full_name,
      email,
      phone,
      gender,
      dob,
      role,
      custom_permissions,
      national_id,
      address,
      department,
      job_title,
      is_global_admin,
      primary_hotel,
      status,
    } = req.body

    // Check if email already exists for another user
    if (email) {
      const existingUser = await User.findOne({ email, _id: { $ne: req.params.id } })
      if (existingUser) {
        return next(new ApiError("Email already in use", 400))
      }
    }

    // Validate role if provided
    if (role) {
      const roleExists = await Role.findById(role)
      if (!roleExists) {
        return next(new ApiError("Invalid role", 400))
      }
    }

    // Validate primary hotel if provided
    if (primary_hotel) {
      const hotelExists = await Hotel.findById(primary_hotel)
      if (!hotelExists) {
        return next(new ApiError("Invalid primary hotel", 400))
      }
    }

    // Only super admin can update global admin status
    if (is_global_admin !== undefined && !req.user.is_global_admin && req.user.role?.name !== "super admin") {
      return next(new ApiError("Only super admins can update global admin status", 403))
    }

    // Get the user to update
    const user = await User.findById(req.params.id)
    if (!user) {
      return next(new ApiError("User not found", 404))
    }

    // Check if user has permission to update this user
    if (
      !req.user.is_global_admin &&
      !["super admin", "admin"].includes(req.user.role?.name) &&
      req.hotelId &&
      !user.hasHotelAccess(req.hotelId)
    ) {
      return next(new ApiError("Not authorized to update this user", 403))
    }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      {
        full_name,
        email,
        phone,
        gender,
        dob,
        role,
        custom_permissions,
        national_id,
        address,
        department,
        job_title,
        is_global_admin,
        primary_hotel,
        status,
        updatedBy: req.user.id,
      },
      { new: true, runValidators: true },
    )
      .populate("role", "name description")
      .populate("custom_permissions", "key description")
      .populate("primary_hotel", "name code type")
      .populate("accessible_hotels.hotel", "name code type")
      .populate("accessible_hotels.role", "name description")

    res.status(200).json({
      success: true,
      data: updatedUser,
    })
  } catch (error) {
    next(error)
  }
}

// Delete user
export const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)

    if (!user) {
      return next(new ApiError("User not found", 404))
    }

    // Check if user has permission to delete this user
    if (
      !req.user.is_global_admin &&
      !["super admin", "admin"].includes(req.user.role?.name) &&
      req.hotelId &&
      !user.hasHotelAccess(req.hotelId)
    ) {
      return next(new ApiError("Not authorized to delete this user", 403))
    }

    // Prevent deleting yourself
    if (user._id.toString() === req.user.id.toString()) {
      return next(new ApiError("You cannot delete your own account", 400))
    }

    // Prevent non-super-admins from deleting global admins
    if (user.is_global_admin && !req.user.is_global_admin && req.user.role?.name !== "super admin") {
      return next(new ApiError("Only super admins can delete global admin users", 403))
    }

    await user.deleteOne()

    res.status(200).json({
      success: true,
      message: "User deleted successfully",
    })
  } catch (error) {
    next(error)
  }
}

// Update user status
export const updateUserStatus = async (req, res, next) => {
  try {
    const { status } = req.body

    if (!["active", "inactive", "suspended"].includes(status)) {
      return next(new ApiError("Invalid status", 400))
    }

    const user = await User.findById(req.params.id)

    if (!user) {
      return next(new ApiError("User not found", 404))
    }

    // Check if user has permission to update this user's status
    if (
      !req.user.is_global_admin &&
      !["super admin", "admin"].includes(req.user.role?.name) &&
      req.hotelId &&
      !user.hasHotelAccess(req.hotelId)
    ) {
      return next(new ApiError("Not authorized to update this user's status", 403))
    }

    // Prevent changing your own status
    if (user._id.toString() === req.user.id.toString()) {
      return next(new ApiError("You cannot change your own status", 400))
    }

    // Prevent non-super-admins from changing global admin status
    if (user.is_global_admin && !req.user.is_global_admin && req.user.role?.name !== "super admin") {
      return next(new ApiError("Only super admins can change global admin status", 403))
    }

    user.status = status
    user.updatedBy = req.user.id
    await user.save()

    res.status(200).json({
      success: true,
      message: "User status updated successfully",
      data: user,
    })
  } catch (error) {
    next(error)
  }
}

// Assign role to user
export const assignRoleToUser = async (req, res, next) => {
  try {
    const { roleId } = req.body

    // Validate role
    const role = await Role.findById(roleId)
    if (!role) {
      return next(new ApiError("Role not found", 404))
    }

    const user = await User.findById(req.params.id)
    if (!user) {
      return next(new ApiError("User not found", 404))
    }

    // Check if user has permission to update this user's role
    if (
      !req.user.is_global_admin &&
      !["super admin", "admin"].includes(req.user.role?.name) &&
      req.hotelId &&
      !user.hasHotelAccess(req.hotelId)
    ) {
      return next(new ApiError("Not authorized to update this user's role", 403))
    }

    user.role = roleId
    user.updatedBy = req.user.id
    await user.save()

    res.status(200).json({
      success: true,
      message: "Role assigned successfully",
      data: {
        userId: user._id,
        role: role.name,
      },
    })
  } catch (error) {
    next(error)
  }
}

// Assign custom permissions to user
export const assignCustomPermissions = async (req, res, next) => {
  try {
    const { permissionIds } = req.body

    if (!Array.isArray(permissionIds)) {
      return next(new ApiError("Permission IDs must be an array", 400))
    }

    const user = await User.findById(req.params.id)
    if (!user) {
      return next(new ApiError("User not found", 404))
    }

    // Check if user has permission to update this user's permissions
    if (
      !req.user.is_global_admin &&
      !["super admin", "admin"].includes(req.user.role?.name) &&
      req.hotelId &&
      !user.hasHotelAccess(req.hotelId)
    ) {
      return next(new ApiError("Not authorized to update this user's permissions", 403))
    }

    user.custom_permissions = permissionIds
    user.updatedBy = req.user.id
    await user.save()

    await user.populate("custom_permissions", "key description")

    res.status(200).json({
      success: true,
      message: "Custom permissions assigned successfully",
      data: {
        userId: user._id,
        custom_permissions: user.custom_permissions,
      },
    })
  } catch (error) {
    next(error)
  }
}

// Get user permissions
export const getUserPermissions = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .populate({
        path: "role",
        populate: {
          path: "permissions",
          model: "Permission",
        },
      })
      .populate("custom_permissions")

    if (!user) {
      return next(new ApiError("User not found", 404))
    }

    // Check if user has permission to view this user's permissions
    if (
      !req.user.is_global_admin &&
      !["super admin", "admin"].includes(req.user.role?.name) &&
      req.hotelId &&
      !user.hasHotelAccess(req.hotelId)
    ) {
      return next(new ApiError("Not authorized to view this user's permissions", 403))
    }

    // Get effective permissions for current hotel context
    const effectivePermissions = await user.getEffectivePermissions(req.hotelId)

    res.status(200).json({
      success: true,
      data: {
        userId: user._id,
        role: user.role ? { id: user.role._id, name: user.role.name } : null,
        rolePermissions: user.role?.permissions || [],
        customPermissions: user.custom_permissions || [],
        effectivePermissions,
      },
    })
  } catch (error) {
    next(error)
  }
}

// Assign hotel access to user
export const assignHotelAccess = async (req, res, next) => {
  try {
    const { hotelId, roleId, accessLevel } = req.body

    if (!hotelId || !accessLevel) {
      return next(new ApiError("Hotel ID and access level are required", 400))
    }

    // Validate hotel
    const hotel = await Hotel.findById(hotelId)
    if (!hotel) {
      return next(new ApiError("Hotel not found", 404))
    }

    // Validate role if provided
    let role = null
    if (roleId) {
      role = await Role.findById(roleId)
      if (!role) {
        return next(new ApiError("Role not found", 404))
      }
    }

    // Validate access level
    if (!["read", "write", "admin"].includes(accessLevel)) {
      return next(new ApiError("Invalid access level. Must be read, write, or admin", 400))
    }

    const user = await User.findById(req.params.id)
    if (!user) {
      return next(new ApiError("User not found", 404))
    }

    // Check if user already has access to this hotel
    const existingAccess = user.accessible_hotels.find((access) => access.hotel && access.hotel.toString() === hotelId)

    if (existingAccess) {
      // Update existing access
      existingAccess.role = roleId || existingAccess.role
      existingAccess.access_level = accessLevel
    } else {
      // Add new access
      user.accessible_hotels.push({
        hotel: hotelId,
        role: roleId,
        access_level: accessLevel,
      })
    }

    user.updatedBy = req.user.id
    await user.save()

    // Populate for response
    await user.populate([
      { path: "accessible_hotels.hotel", select: "name code type" },
      { path: "accessible_hotels.role", select: "name description" },
    ])

    res.status(200).json({
      success: true,
      message: "Hotel access assigned successfully",
      data: {
        userId: user._id,
        hotelAccess: user.accessible_hotels.find((access) => access.hotel._id.toString() === hotelId),
      },
    })
  } catch (error) {
    next(error)
  }
}

// Remove hotel access from user
export const removeHotelAccess = async (req, res, next) => {
  try {
    const { id, hotelId } = req.params

    const user = await User.findById(id)
    if (!user) {
      return next(new ApiError("User not found", 404))
    }

    // Check if hotel exists
    const hotel = await Hotel.findById(hotelId)
    if (!hotel) {
      return next(new ApiError("Hotel not found", 404))
    }

    // Check if user has access to this hotel
    const accessIndex = user.accessible_hotels.findIndex(
      (access) => access.hotel && access.hotel.toString() === hotelId,
    )

    if (accessIndex === -1) {
      return next(new ApiError("User does not have access to this hotel", 404))
    }

    // Remove access
    user.accessible_hotels.splice(accessIndex, 1)

    // If this was the primary hotel, reset it
    if (user.primary_hotel && user.primary_hotel.toString() === hotelId) {
      user.primary_hotel = user.accessible_hotels.length > 0 ? user.accessible_hotels[0].hotel : null
    }

    user.updatedBy = req.user.id
    await user.save()

    res.status(200).json({
      success: true,
      message: "Hotel access removed successfully",
    })
  } catch (error) {
    next(error)
  }
}

// Get user's hotel access
export const getUserHotelAccess = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .populate("primary_hotel", "name code type")
      .populate("accessible_hotels.hotel", "name code type")
      .populate("accessible_hotels.role", "name description")

    if (!user) {
      return next(new ApiError("User not found", 404))
    }

    // Get all accessible hotels
    const accessibleHotels = await user.getAccessibleHotels()

    res.status(200).json({
      success: true,
      data: {
        userId: user._id,
        is_global_admin: user.is_global_admin,
        primary_hotel: user.primary_hotel,
        hotel_access: user.accessible_hotels,
        accessible_hotels: accessibleHotels.map((hotel) => ({
          id: hotel._id,
          name: hotel.name,
          code: hotel.code,
          type: hotel.type,
        })),
      },
    })
  } catch (error) {
    next(error)
  }
}

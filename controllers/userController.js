import User from "../models/User.js"
import Role from "../models/Role.js"
import { ApiError } from "../utils/apiError.js"

// Get all users with filtering, pagination, and sorting
export const getAllUsers = async (req, res, next) => {
  try {
    const { status, role, department, branch, search, page = 1, limit = 20, sort = "-createdAt" } = req.query

    // Build filter object
    const filter = {}

    if (status) filter.status = status
    if (role) filter.role = role
    if (department) filter.department = department
    if (branch) filter.branch = branch

    // Search functionality
    if (search) {
      filter.$or = [
        { full_name: new RegExp(search, "i") },
        { email: new RegExp(search, "i") },
        { phone: new RegExp(search, "i") },
      ]
    }

    // Calculate pagination
    const skip = (Number(page) - 1) * Number(limit)

    // Execute query with pagination and sorting
    const users = await User.find(filter)
      .populate("role", "name description")
      .populate("custom_permissions", "key description")
      .sort(sort)
      .skip(skip)
      .limit(Number(limit))

    // Get total count for pagination
    const total = await User.countDocuments(filter)

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
      .populate("createdBy", "full_name")
      .populate("updatedBy", "full_name")

    if (!user) {
      return next(new ApiError("User not found", 404))
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
      branch,
      status,
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
      branch,
      status,
      createdBy: req.user.id,
      updatedBy: req.user.id,
    })

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
      branch,
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
        branch,
        status,
        updatedBy: req.user.id,
      },
      { new: true, runValidators: true },
    )
      .populate("role", "name description")
      .populate("custom_permissions", "key description")

    if (!updatedUser) {
      return next(new ApiError("User not found", 404))
    }

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

    // Prevent deleting yourself
    if (user._id.toString() === req.user.id.toString()) {
      return next(new ApiError("You cannot delete your own account", 400))
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

    // Prevent changing your own status
    if (user._id.toString() === req.user.id.toString()) {
      return next(new ApiError("You cannot change your own status", 400))
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

    const effectivePermissions = await user.getEffectivePermissions()

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

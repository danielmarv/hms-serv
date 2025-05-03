import Role from "../models/Role.js"
import User from "../models/User.js"
import { ApiError } from "../utils/apiError.js"
import { getPermissionsByCategory } from "../utils/permissionUtils.js"

// Get all roles
export const getRoles = async (req, res, next) => {
  try {
    const roles = await Role.find().sort({ name: 1 })

    res.status(200).json({
      success: true,
      count: roles.length,
      data: roles.map((role) => ({
        id: role._id,
        name: role.name,
        description: role.description,
        permissionCount: role.permissions.length,
      })),
    })
  } catch (error) {
    next(error)
  }
}

// Get role by ID
export const getRoleById = async (req, res, next) => {
  try {
    const role = await Role.findById(req.params.id).populate("permissions")

    if (!role) {
      return next(new ApiError("Role not found", 404))
    }

    res.status(200).json({
      success: true,
      data: {
        id: role._id,
        name: role.name,
        description: role.description,
        permissions: role.permissions.map((p) => ({
          id: p._id,
          key: p.key,
          description: p.description,
          category: p.category,
          isGlobal: p.isGlobal,
        })),
      },
    })
  } catch (error) {
    next(error)
  }
}

// Create new role
export const createRole = async (req, res, next) => {
  try {
    const { name, description, permissions } = req.body

    // Check if role with same name already exists
    const existingRole = await Role.findOne({ name: name.toLowerCase() })
    if (existingRole) {
      return next(new ApiError("Role with this name already exists", 400))
    }

    // Create new role
    const role = await Role.create({
      name,
      description,
      permissions,
      createdBy: req.user.id,
    })

    // Populate permissions
    await role.populate("permissions")

    res.status(201).json({
      success: true,
      data: {
        id: role._id,
        name: role.name,
        description: role.description,
        permissions: role.permissions.map((p) => ({
          id: p._id,
          key: p.key,
          description: p.description,
          category: p.category,
          isGlobal: p.isGlobal,
        })),
      },
    })
  } catch (error) {
    next(error)
  }
}

// Update role
export const updateRole = async (req, res, next) => {
  try {
    const { name, description, permissions } = req.body

    // Check if role exists
    const role = await Role.findById(req.params.id)
    if (!role) {
      return next(new ApiError("Role not found", 404))
    }

    // Check if updating to an existing name
    if (name && name !== role.name) {
      const existingRole = await Role.findOne({ name: name.toLowerCase() })
      if (existingRole && existingRole._id.toString() !== req.params.id) {
        return next(new ApiError("Role with this name already exists", 400))
      }
    }

    // Special protection for super admin role
    if (role.name === "super admin") {
      // Only allow description changes for super admin
      if (permissions) {
        return next(new ApiError("Cannot modify permissions for super admin role", 403))
      }
    }

    // Update role
    role.name = name || role.name
    role.description = description || role.description
    if (permissions) {
      role.permissions = permissions
    }
    role.updatedBy = req.user.id

    await role.save()
    await role.populate("permissions")

    res.status(200).json({
      success: true,
      data: {
        id: role._id,
        name: role.name,
        description: role.description,
        permissions: role.permissions.map((p) => ({
          id: p._id,
          key: p.key,
          description: p.description,
          category: p.category,
          isGlobal: p.isGlobal,
        })),
      },
    })
  } catch (error) {
    next(error)
  }
}

// Delete role
export const deleteRole = async (req, res, next) => {
  try {
    const role = await Role.findById(req.params.id)

    if (!role) {
      return next(new ApiError("Role not found", 404))
    }

    // Prevent deletion of system roles
    if (["super admin", "admin"].includes(role.name)) {
      return next(new ApiError("Cannot delete system roles", 403))
    }

    // Check if role is assigned to any users
    const usersWithRole = await User.countDocuments({ role: role._id })
    if (usersWithRole > 0) {
      return next(new ApiError(`Cannot delete role that is assigned to ${usersWithRole} users`, 400))
    }

    await role.deleteOne()

    res.status(200).json({
      success: true,
      message: "Role deleted successfully",
    })
  } catch (error) {
    next(error)
  }
}

// Get all available permissions for role assignment
export const getAvailablePermissions = async (req, res, next) => {
  try {
    const permissions = await getPermissionsByCategory()

    res.status(200).json({
      success: true,
      data: permissions,
    })
  } catch (error) {
    next(error)
  }
}

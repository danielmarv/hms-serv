import Role from "../models/Role.js"
import User from "../models/User.js"
import { ApiError } from "./apiError.js"

/**
 * Assign a default role to a user
 * @param {string} userId - The user ID
 * @param {string} roleName - The role name (default: "guest")
 */
export const assignDefaultRole = async (userId, roleName = "guest") => {
  try {
    // Find the role
    const role = await Role.findOne({ name: roleName.toLowerCase() })
    if (!role) {
      throw new ApiError(`Role '${roleName}' not found`, 404)
    }

    // Find the user and update
    const user = await User.findById(userId)
    if (!user) {
      throw new ApiError(`User not found`, 404)
    }

    user.role = role._id
    await user.save()

    return { success: true, message: `Role '${roleName}' assigned to user` }
  } catch (error) {
    throw error
  }
}

/**
 * Get all available roles
 */
export const getAllRoles = async () => {
  try {
    const roles = await Role.find().populate("permissions", "key description category isGlobal")
    return roles
  } catch (error) {
    throw error
  }
}

/**
 * Get role by ID
 * @param {string} roleId - The role ID
 */
export const getRoleById = async (roleId) => {
  try {
    const role = await Role.findById(roleId).populate("permissions", "key description category isGlobal")
    if (!role) {
      throw new ApiError(`Role not found`, 404)
    }
    return role
  } catch (error) {
    throw error
  }
}

/**
 * Get role by name
 * @param {string} roleName - The role name
 */
export const getRoleByName = async (roleName) => {
  try {
    const role = await Role.findOne({ name: roleName.toLowerCase() }).populate(
      "permissions",
      "key description category isGlobal",
    )
    if (!role) {
      throw new ApiError(`Role '${roleName}' not found`, 404)
    }
    return role
  } catch (error) {
    throw error
  }
}

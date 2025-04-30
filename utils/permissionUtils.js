import Permission from "../models/Permission.js"

/**
 * Creates a new permission if it doesn't already exist
 * @param {Object} permissionData - Permission data
 * @returns {Object} Created permission
 */
export const createPermissionIfNotExists = async (permissionData) => {
  try {
    // Check if permission already exists
    let permission = await Permission.findOne({ key: permissionData.key })

    // If it doesn't exist, create it
    if (!permission) {
      permission = await Permission.create(permissionData)
    }

    return permission
  } catch (error) {
    console.error(`Error creating permission ${permissionData.key}:`, error)
    throw error
  }
}

/**
 * Get all permissions by category
 * @param {String} category - Optional category to filter by
 * @returns {Array} Permissions organized by category
 */
export const getPermissionsByCategory = async (category = null) => {
  try {
    const query = category ? { category } : {}
    const permissions = await Permission.find(query).sort({ category: 1, key: 1 })

    // If no category specified, organize by category
    if (!category) {
      const categorized = {}

      permissions.forEach((permission) => {
        if (!categorized[permission.category]) {
          categorized[permission.category] = []
        }

        categorized[permission.category].push({
          id: permission._id,
          key: permission.key,
          description: permission.description,
          isGlobal: permission.isGlobal,
        })
      })

      return categorized
    }

    // If category specified, return flat list
    return permissions.map((permission) => ({
      id: permission._id,
      key: permission.key,
      description: permission.description,
      category: permission.category,
      isGlobal: permission.isGlobal,
    }))
  } catch (error) {
    console.error("Error getting permissions by category:", error)
    throw error
  }
}

/**
 * Get global permissions
 * @returns {Array} Global permissions
 */
export const getGlobalPermissions = async () => {
  try {
    const permissions = await Permission.find({ isGlobal: true })

    return permissions.map((permission) => ({
      id: permission._id,
      key: permission.key,
      description: permission.description,
      category: permission.category,
    }))
  } catch (error) {
    console.error("Error getting global permissions:", error)
    throw error
  }
}

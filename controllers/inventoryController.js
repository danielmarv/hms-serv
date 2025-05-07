import InventoryItem from "../models/Inventory.js"
import InventoryTransaction from "../models/InventoryTransaction.js"
import MenuItemIngredient from "../models/MenuItemIngredient.js"
import MenuItem from "../models/MenuItem.js"
import { ApiError } from "../utils/apiError.js"

// Get all inventory items with filtering, pagination, and sorting
export const getAllInventoryItems = async (req, res, next) => {
  try {
    const { search, category, stockStatus, supplier, isActive, page = 1, limit = 20, sort = "name" } = req.query

    // Build filter object
    const filter = {}

    // Search functionality
    if (search) {
      filter.$or = [
        { name: new RegExp(search, "i") },
        { description: new RegExp(search, "i") },
        { supplierName: new RegExp(search, "i") },
        { supplierCode: new RegExp(search, "i") },
      ]
    }

    if (category) filter.category = category
    if (supplier) filter.supplier = supplier
    if (isActive !== undefined) filter.isActive = isActive === "true"

    // Stock status filter
    if (stockStatus) {
      switch (stockStatus) {
        case "Critical":
          filter.currentStock = { $lte: "$minStockLevel" }
          break
        case "Low":
          filter.$and = [{ currentStock: { $gt: "$minStockLevel" } }, { currentStock: { $lte: "$reorderPoint" } }]
          break
        case "Adequate":
          filter.currentStock = { $gt: "$reorderPoint" }
          break
      }
    }

    // Calculate pagination
    const skip = (Number(page) - 1) * Number(limit)

    // Execute query with pagination and sorting
    const inventoryItems = await InventoryItem.find(filter)
      .populate("supplier", "name")
      .populate("createdBy", "full_name")
      .populate("updatedBy", "full_name")
      .sort(sort)
      .skip(skip)
      .limit(Number(limit))

    // Get total count for pagination
    const total = await InventoryItem.countDocuments(filter)

    res.status(200).json({
      success: true,
      count: inventoryItems.length,
      total,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
      data: inventoryItems,
    })
  } catch (error) {
    next(error)
  }
}

// Get inventory item by ID
export const getInventoryItemById = async (req, res, next) => {
  try {
    const inventoryItem = await InventoryItem.findById(req.params.id)
      .populate("supplier", "name contact_person email phone")
      .populate("createdBy", "full_name")
      .populate("updatedBy", "full_name")

    if (!inventoryItem) {
      return next(new ApiError("Inventory item not found", 404))
    }

    // Get menu items that use this inventory item
    const menuItemIngredients = await MenuItemIngredient.find({ inventoryItem: req.params.id }).populate(
      "menuItem",
      "name category price",
    )

    // Get recent transactions
    const recentTransactions = await InventoryTransaction.find({ item: req.params.id })
      .sort("-createdAt")
      .limit(10)
      .populate("createdBy", "full_name")

    res.status(200).json({
      success: true,
      data: {
        inventoryItem,
        menuItems: menuItemIngredients.map((mi) => mi.menuItem),
        recentTransactions,
      },
    })
  } catch (error) {
    next(error)
  }
}

// Create new inventory item
export const createInventoryItem = async (req, res, next) => {
  try {
    const {
      name,
      category,
      unit,
      unitPrice,
      currentStock,
      minStockLevel,
      reorderPoint,
      reorderQuantity,
      location,
      supplier,
      supplierName,
      supplierCode,
      expiryDate,
      isPerishable,
      description,
      notes,
      isActive,
    } = req.body

    // Check if inventory item with same name already exists
    const existingItem = await InventoryItem.findOne({ name })
    if (existingItem) {
      return next(new ApiError("Inventory item with this name already exists", 400))
    }

    // Create inventory item
    const inventoryItem = await InventoryItem.create({
      name,
      category,
      unit,
      unitPrice,
      currentStock: currentStock || 0,
      minStockLevel: minStockLevel || 10,
      reorderPoint: reorderPoint || 20,
      reorderQuantity: reorderQuantity || 50,
      location: location || "Main Storage",
      supplier,
      supplierName,
      supplierCode,
      expiryDate,
      isPerishable: isPerishable !== undefined ? isPerishable : false,
      description,
      notes,
      isActive: isActive !== undefined ? isActive : true,
      createdBy: req.user.id,
      updatedBy: req.user.id,
    })

    // Create initial inventory transaction if stock is not zero
    if (inventoryItem.currentStock > 0) {
      await InventoryTransaction.create({
        item: inventoryItem._id,
        transactionType: "Adjustment",
        quantity: inventoryItem.currentStock,
        unitPrice: inventoryItem.unitPrice,
        totalPrice: inventoryItem.currentStock * inventoryItem.unitPrice,
        previousStock: 0,
        newStock: inventoryItem.currentStock,
        reference: "Initial Stock",
        referenceType: "Adjustment",
        notes: "Initial inventory setup",
        createdBy: req.user.id,
        updatedBy: req.user.id,
      })
    }

    res.status(201).json({
      success: true,
      data: inventoryItem,
    })
  } catch (error) {
    next(error)
  }
}

// Update inventory item
export const updateInventoryItem = async (req, res, next) => {
  try {
    const {
      name,
      category,
      unit,
      unitPrice,
      minStockLevel,
      reorderPoint,
      reorderQuantity,
      location,
      supplier,
      supplierName,
      supplierCode,
      expiryDate,
      isPerishable,
      description,
      notes,
      isActive,
    } = req.body

    const inventoryItem = await InventoryItem.findById(req.params.id)
    if (!inventoryItem) {
      return next(new ApiError("Inventory item not found", 404))
    }

    // Check if name is being changed and if it's already in use
    if (name && name !== inventoryItem.name) {
      const existingItem = await InventoryItem.findOne({ name, _id: { $ne: req.params.id } })
      if (existingItem) {
        return next(new ApiError("Inventory item with this name already exists", 400))
      }
    }

    // Update inventory item
    const updatedInventoryItem = await InventoryItem.findByIdAndUpdate(
      req.params.id,
      {
        name,
        category,
        unit,
        unitPrice,
        minStockLevel,
        reorderPoint,
        reorderQuantity,
        location,
        supplier,
        supplierName,
        supplierCode,
        expiryDate,
        isPerishable,
        description,
        notes,
        isActive,
        updatedBy: req.user.id,
      },
      { new: true, runValidators: true },
    )

    res.status(200).json({
      success: true,
      data: updatedInventoryItem,
    })
  } catch (error) {
    next(error)
  }
}

// Delete inventory item
export const deleteInventoryItem = async (req, res, next) => {
  try {
    const inventoryItem = await InventoryItem.findById(req.params.id)
    if (!inventoryItem) {
      return next(new ApiError("Inventory item not found", 404))
    }

    // Check if inventory item is used in any menu items
    const menuItemCount = await MenuItemIngredient.countDocuments({ inventoryItem: req.params.id })
    if (menuItemCount > 0) {
      return next(
        new ApiError(
          `Cannot delete inventory item. It is used in ${menuItemCount} menu items. Consider marking as inactive instead.`,
          400,
        ),
      )
    }

    await inventoryItem.deleteOne()

    res.status(200).json({
      success: true,
      message: "Inventory item deleted successfully",
    })
  } catch (error) {
    next(error)
  }
}

// Update inventory stock
export const updateInventoryStock = async (req, res, next) => {
  try {
    const { quantity, transactionType, unitPrice, reference, referenceType, referenceId, supplier, notes } = req.body

    if (!quantity || !transactionType) {
      return next(new ApiError("Quantity and transaction type are required", 400))
    }

    const inventoryItem = await InventoryItem.findById(req.params.id)
    if (!inventoryItem) {
      return next(new ApiError("Inventory item not found", 404))
    }

    // Calculate new stock based on transaction type
    const previousStock = inventoryItem.currentStock
    let newStock = previousStock

    switch (transactionType) {
      case "Purchase":
      case "Adjustment":
      case "Return":
        newStock = previousStock + Number(quantity)
        break
      case "Usage":
      case "Waste":
      case "Transfer":
        if (previousStock < Number(quantity)) {
          return next(new ApiError("Insufficient stock for this transaction", 400))
        }
        newStock = previousStock - Number(quantity)
        break
      default:
        return next(new ApiError("Invalid transaction type", 400))
    }

    // Update inventory item stock
    inventoryItem.currentStock = newStock
    if (transactionType === "Purchase") {
      inventoryItem.lastOrderDate = new Date()
      inventoryItem.lastReceivedDate = new Date()
    }
    inventoryItem.lastCountDate = new Date()
    inventoryItem.updatedBy = req.user.id
    await inventoryItem.save()

    // Create inventory transaction
    const transaction = await InventoryTransaction.create({
      item: inventoryItem._id,
      transactionType,
      quantity: Number(quantity),
      unitPrice: unitPrice || inventoryItem.unitPrice,
      totalPrice: Number(quantity) * (unitPrice || inventoryItem.unitPrice),
      previousStock,
      newStock,
      reference,
      referenceType,
      referenceId,
      supplier,
      notes,
      createdBy: req.user.id,
      updatedBy: req.user.id,
    })

    res.status(200).json({
      success: true,
      message: `Inventory stock updated successfully. New stock: ${newStock} ${inventoryItem.unit}`,
      data: {
        inventoryItem,
        transaction,
      },
    })
  } catch (error) {
    next(error)
  }
}

// Get inventory transactions
export const getInventoryTransactions = async (req, res, next) => {
  try {
    const { item, transactionType, startDate, endDate, page = 1, limit = 20, sort = "-createdAt" } = req.query

    // Build filter object
    const filter = {}

    if (item) filter.item = item
    if (transactionType) filter.transactionType = transactionType

    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {}
      if (startDate) filter.createdAt.$gte = new Date(startDate)
      if (endDate) {
        const endDateObj = new Date(endDate)
        endDateObj.setHours(23, 59, 59, 999)
        filter.createdAt.$lte = endDateObj
      }
    }

    // Calculate pagination
    const skip = (Number(page) - 1) * Number(limit)

    // Execute query with pagination and sorting
    const transactions = await InventoryTransaction.find(filter)
      .populate("item", "name unit category")
      .populate("supplier", "name")
      .populate("createdBy", "full_name")
      .sort(sort)
      .skip(skip)
      .limit(Number(limit))

    // Get total count for pagination
    const total = await InventoryTransaction.countDocuments(filter)

    res.status(200).json({
      success: true,
      count: transactions.length,
      total,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
      data: transactions,
    })
  } catch (error) {
    next(error)
  }
}

// Get inventory statistics
export const getInventoryStats = async (req, res, next) => {
  try {
    // Get inventory statistics
    const stats = await InventoryItem.aggregate([
      {
        $facet: {
          categoryStats: [
            {
              $group: {
                _id: "$category",
                count: { $sum: 1 },
                totalValue: { $sum: { $multiply: ["$currentStock", "$unitPrice"] } },
              },
            },
          ],
          stockStatusStats: [
            {
              $project: {
                name: 1,
                currentStock: 1,
                minStockLevel: 1,
                reorderPoint: 1,
                stockStatus: {
                  $cond: {
                    if: { $lte: ["$currentStock", "$minStockLevel"] },
                    then: "Critical",
                    else: {
                      $cond: {
                        if: { $lte: ["$currentStock", "$reorderPoint"] },
                        then: "Low",
                        else: "Adequate",
                      },
                    },
                  },
                },
              },
            },
            {
              $group: {
                _id: "$stockStatus",
                count: { $sum: 1 },
              },
            },
          ],
          totalStats: [
            {
              $group: {
                _id: null,
                totalItems: { $sum: 1 },
                totalValue: { $sum: { $multiply: ["$currentStock", "$unitPrice"] } },
                avgUnitPrice: { $avg: "$unitPrice" },
              },
            },
          ],
          lowStockItems: [
            {
              $match: {
                $expr: {
                  $lte: ["$currentStock", "$reorderPoint"],
                },
              },
            },
            {
              $project: {
                name: 1,
                category: 1,
                currentStock: 1,
                minStockLevel: 1,
                reorderPoint: 1,
                unit: 1,
                stockStatus: {
                  $cond: {
                    if: { $lte: ["$currentStock", "$minStockLevel"] },
                    then: "Critical",
                    else: "Low",
                  },
                },
              },
            },
            { $sort: { stockStatus: 1, currentStock: 1 } },
            { $limit: 10 },
          ],
        },
      },
    ])

    res.status(200).json({
      success: true,
      data: {
        byCategory: stats[0].categoryStats,
        byStockStatus: stats[0].stockStatusStats,
        totals: stats[0].totalStats[0] || {
          totalItems: 0,
          totalValue: 0,
          avgUnitPrice: 0,
        },
        lowStockItems: stats[0].lowStockItems,
      },
    })
  } catch (error) {
    next(error)
  }
}

// Link menu item to inventory items
export const linkMenuItemIngredients = async (req, res, next) => {
  try {
    const { menuItem, ingredients } = req.body

    if (!menuItem || !ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      return next(new ApiError("Menu item ID and ingredients array are required", 400))
    }

    // Check if menu item exists
    const menuItemExists = await MenuItem.findById(menuItem)
    if (!menuItemExists) {
      return next(new ApiError("Menu item not found", 404))
    }

    // Delete existing ingredients for this menu item
    await MenuItemIngredient.deleteMany({ menuItem })

    // Create new ingredients
    const ingredientPromises = ingredients.map(async (ingredient) => {
      const { inventoryItem, quantity, unit, isOptional, notes } = ingredient

      // Check if inventory item exists
      const inventoryItemExists = await InventoryItem.findById(inventoryItem)
      if (!inventoryItemExists) {
        throw new ApiError(`Inventory item with ID ${inventoryItem} not found`, 404)
      }

      return MenuItemIngredient.create({
        menuItem,
        inventoryItem,
        quantity,
        unit,
        isOptional: isOptional !== undefined ? isOptional : false,
        notes,
        createdBy: req.user.id,
        updatedBy: req.user.id,
      })
    })

    await Promise.all(ingredientPromises)

    // Get all ingredients for this menu item
    const menuItemIngredients = await MenuItemIngredient.find({ menuItem }).populate(
      "inventoryItem",
      "name unit category currentStock",
    )

    res.status(200).json({
      success: true,
      message: "Menu item ingredients updated successfully",
      data: menuItemIngredients,
    })
  } catch (error) {
    next(error)
  }
}

// Get menu item ingredients
export const getMenuItemIngredients = async (req, res, next) => {
  try {
    const menuItemIngredients = await MenuItemIngredient.find({ menuItem: req.params.id })
      .populate("inventoryItem", "name unit category currentStock unitPrice")
      .populate("menuItem", "name category price")

    res.status(200).json({
      success: true,
      count: menuItemIngredients.length,
      data: menuItemIngredients,
    })
  } catch (error) {
    next(error)
  }
}

export default {
  getAllInventoryItems,
  getInventoryItemById,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  updateInventoryStock,
  getInventoryTransactions,
  getInventoryStats,
  linkMenuItemIngredients,
  getMenuItemIngredients,
}

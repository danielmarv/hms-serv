import InventoryItem from "../models/Inventory.js"
import StockTransaction from "../models/StockTransaction.js"
import Supplier from "../models/Supplier.js"
import { ApiError } from "../utils/apiError.js"

// Get all inventory items with filtering, pagination, and sorting
export const getAllInventoryItems = async (req, res, next) => {
  try {
    const {
      search,
      category,
      supplier,
      minStock,
      maxStock,
      stockStatus,
      isActive,
      page = 1,
      limit = 20,
      sort = "name",
    } = req.query

    // Build filter object
    const filter = {}

    // Search functionality
    if (search) {
      filter.$or = [
        { name: new RegExp(search, "i") },
        { description: new RegExp(search, "i") },
        { sku: new RegExp(search, "i") },
        { barcode: new RegExp(search, "i") },
      ]
    }

    if (category) filter.category = category
    if (supplier) filter.supplier = supplier
    if (isActive !== undefined) filter.isActive = isActive === "true"

    // Stock level filters
    if (minStock) filter.currentStock = { $gte: Number(minStock) }
    if (maxStock) {
      filter.currentStock = { ...filter.currentStock, $lte: Number(maxStock) }
    }

    // Stock status filter
    if (stockStatus) {
      switch (stockStatus) {
        case "Low":
          filter.$expr = { $lte: ["$currentStock", "$minStockLevel"] }
          break
        case "Reorder":
          filter.$expr = { $lte: ["$currentStock", "$reorderPoint"] }
          break
        case "Overstocked":
          filter.$expr = { $gte: ["$currentStock", "$maxStockLevel"] }
          break
        case "Normal":
          filter.$and = [
            { $expr: { $gt: ["$currentStock", "$minStockLevel"] } },
            { $expr: { $lt: ["$currentStock", "$maxStockLevel"] } },
            { $expr: { $gt: ["$currentStock", "$reorderPoint"] } },
          ]
          break
      }
    }

    // Calculate pagination
    const skip = (Number(page) - 1) * Number(limit)

    // Execute query with pagination and sorting
    const items = await InventoryItem.find(filter)
      .populate("supplier", "name contact_person phone")
      .sort(sort)
      .skip(skip)
      .limit(Number(limit))

    // Get total count for pagination
    const total = await InventoryItem.countDocuments(filter)

    res.status(200).json({
      success: true,
      count: items.length,
      total,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
      data: items,
    })
  } catch (error) {
    next(error)
  }
}

// Get inventory item by ID
export const getInventoryItemById = async (req, res, next) => {
  try {
    const item = await InventoryItem.findById(req.params.id)
      .populate("supplier", "name contact_person phone email")
      .populate("createdBy", "full_name")
      .populate("updatedBy", "full_name")

    if (!item) {
      return next(new ApiError("Inventory item not found", 404))
    }

    res.status(200).json({
      success: true,
      data: item,
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
      description,
      category,
      sku,
      barcode,
      unit,
      unitPrice,
      currentStock,
      minStockLevel,
      maxStockLevel,
      reorderPoint,
      reorderQuantity,
      location,
      supplier,
      expiryDate,
      isPerishable,
      isActive,
      image,
      tags,
      notes,
    } = req.body

    // Check if SKU already exists
    if (sku) {
      const existingItem = await InventoryItem.findOne({ sku })
      if (existingItem) {
        return next(new ApiError("Item with this SKU already exists", 400))
      }
    }

    // Validate supplier if provided
    if (supplier) {
      const supplierExists = await Supplier.findById(supplier)
      if (!supplierExists) {
        return next(new ApiError("Supplier not found", 404))
      }
    }

    // Create inventory item
    const item = await InventoryItem.create({
      name,
      description,
      category,
      sku,
      barcode,
      unit,
      unitPrice,
      currentStock: currentStock || 0,
      minStockLevel: minStockLevel || 0,
      maxStockLevel: maxStockLevel || 0,
      reorderPoint: reorderPoint || 0,
      reorderQuantity: reorderQuantity || 0,
      location,
      supplier,
      expiryDate,
      isPerishable: isPerishable || false,
      isActive: isActive !== undefined ? isActive : true,
      image,
      tags,
      notes,
      createdBy: req.user.id,
      updatedBy: req.user.id,
    })

    // Create initial stock transaction if stock is provided
    if (currentStock && currentStock > 0) {
      await StockTransaction.create({
        item: item._id,
        type: "restock",
        quantity: currentStock,
        unit_price: unitPrice,
        transaction_date: new Date(),
        reason: "Initial stock",
        performedBy: req.user.id,
        status: "completed",
      })
    }

    res.status(201).json({
      success: true,
      data: item,
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
      description,
      category,
      sku,
      barcode,
      unit,
      unitPrice,
      minStockLevel,
      maxStockLevel,
      reorderPoint,
      reorderQuantity,
      location,
      supplier,
      expiryDate,
      isPerishable,
      isActive,
      image,
      tags,
      notes,
    } = req.body

    const item = await InventoryItem.findById(req.params.id)
    if (!item) {
      return next(new ApiError("Inventory item not found", 404))
    }

    // Check if SKU is being changed and if it's already in use
    if (sku && sku !== item.sku) {
      const existingItem = await InventoryItem.findOne({ sku, _id: { $ne: req.params.id } })
      if (existingItem) {
        return next(new ApiError("Item with this SKU already exists", 400))
      }
    }

    // Validate supplier if provided
    if (supplier) {
      const supplierExists = await Supplier.findById(supplier)
      if (!supplierExists) {
        return next(new ApiError("Supplier not found", 404))
      }
    }

    // Update inventory item
    const updatedItem = await InventoryItem.findByIdAndUpdate(
      req.params.id,
      {
        name,
        description,
        category,
        sku,
        barcode,
        unit,
        unitPrice,
        minStockLevel,
        maxStockLevel,
        reorderPoint,
        reorderQuantity,
        location,
        supplier,
        expiryDate,
        isPerishable,
        isActive,
        image,
        tags,
        notes,
        updatedBy: req.user.id,
      },
      { new: true, runValidators: true },
    )

    res.status(200).json({
      success: true,
      data: updatedItem,
    })
  } catch (error) {
    next(error)
  }
}

// Delete inventory item
export const deleteInventoryItem = async (req, res, next) => {
  try {
    const item = await InventoryItem.findById(req.params.id)
    if (!item) {
      return next(new ApiError("Inventory item not found", 404))
    }

    // Check if there are any transactions for this item
    const transactionCount = await StockTransaction.countDocuments({ item: req.params.id })
    if (transactionCount > 0) {
      return next(
        new ApiError("Cannot delete item with existing transactions. Consider marking as inactive instead.", 400),
      )
    }

    await item.deleteOne()

    res.status(200).json({
      success: true,
      message: "Inventory item deleted successfully",
    })
  } catch (error) {
    next(error)
  }
}

// Update stock level
export const updateStockLevel = async (req, res, next) => {
  try {
    const { quantity, type, reason, unit_price, transaction_date, department, reference_number } = req.body

    if (!quantity || !type) {
      return next(new ApiError("Quantity and transaction type are required", 400))
    }

    const item = await InventoryItem.findById(req.params.id)
    if (!item) {
      return next(new ApiError("Inventory item not found", 404))
    }

    // Create stock transaction
    const transaction = await StockTransaction.create({
      item: item._id,
      type,
      quantity: Number(quantity),
      unit_price: unit_price || item.unitPrice,
      transaction_date: transaction_date || new Date(),
      department,
      reference_number,
      reason,
      performedBy: req.user.id,
      status: "completed",
    })

    // Item stock is updated by the StockTransaction post-save hook

    // Fetch the updated item
    const updatedItem = await InventoryItem.findById(req.params.id)

    res.status(200).json({
      success: true,
      message: "Stock updated successfully",
      data: {
        transaction,
        currentStock: updatedItem.currentStock,
        stockStatus: updatedItem.stockStatus,
      },
    })
  } catch (error) {
    next(error)
  }
}

// Get stock transactions for an item
export const getItemTransactions = async (req, res, next) => {
  try {
    const { startDate, endDate, type, page = 1, limit = 20, sort = "-transaction_date" } = req.query

    const filter = { item: req.params.id }

    // Transaction type filter
    if (type) filter.type = type

    // Date range filter
    if (startDate || endDate) {
      filter.transaction_date = {}
      if (startDate) filter.transaction_date.$gte = new Date(startDate)
      if (endDate) {
        const endDateObj = new Date(endDate)
        endDateObj.setHours(23, 59, 59, 999)
        filter.transaction_date.$lte = endDateObj
      }
    }

    // Calculate pagination
    const skip = (Number(page) - 1) * Number(limit)

    // Execute query with pagination and sorting
    const transactions = await StockTransaction.find(filter)
      .populate("performedBy", "full_name")
      .populate("approvedBy", "full_name")
      .sort(sort)
      .skip(skip)
      .limit(Number(limit))

    // Get total count for pagination
    const total = await StockTransaction.countDocuments(filter)

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

// Get low stock items
export const getLowStockItems = async (req, res, next) => {
  try {
    const items = await InventoryItem.find({
      $expr: { $lte: ["$currentStock", "$reorderPoint"] },
      isActive: true,
    })
      .populate("supplier", "name contact_person phone email")
      .sort("name")

    res.status(200).json({
      success: true,
      count: items.length,
      data: items,
    })
  } catch (error) {
    next(error)
  }
}

// Get inventory statistics
export const getInventoryStats = async (req, res, next) => {
  try {
    const stats = await InventoryItem.aggregate([
      {
        $facet: {
          totalItems: [{ $count: "count" }],
          activeItems: [{ $match: { isActive: true } }, { $count: "count" }],
          totalValue: [
            { $match: { isActive: true } },
            { $group: { _id: null, value: { $sum: { $multiply: ["$currentStock", "$unitPrice"] } } } },
          ],
          categoryStats: [
            { $match: { isActive: true } },
            {
              $group: {
                _id: "$category",
                count: { $sum: 1 },
                value: { $sum: { $multiply: ["$currentStock", "$unitPrice"] } },
              },
            },
            { $sort: { value: -1 } },
          ],
          stockStatus: [
            { $match: { isActive: true } },
            {
              $group: {
                _id: {
                  $cond: [
                    { $lte: ["$currentStock", "$minStockLevel"] },
                    "Low",
                    {
                      $cond: [
                        { $lte: ["$currentStock", "$reorderPoint"] },
                        "Reorder",
                        {
                          $cond: [{ $gte: ["$currentStock", "$maxStockLevel"] }, "Overstocked", "Normal"],
                        },
                      ],
                    },
                  ],
                },
                count: { $sum: 1 },
              },
            },
          ],
        },
      },
    ])

    // Format the results
    const formattedStats = {
      totalItems: stats[0].totalItems[0]?.count || 0,
      activeItems: stats[0].activeItems[0]?.count || 0,
      totalValue: stats[0].totalValue[0]?.value || 0,
      categoryStats: stats[0].categoryStats,
      stockStatus: stats[0].stockStatus,
    }

    res.status(200).json({
      success: true,
      data: formattedStats,
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
  updateStockLevel,
  getItemTransactions,
  getLowStockItems,
  getInventoryStats,
}

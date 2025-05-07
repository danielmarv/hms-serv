import KitchenOrder from "../models/KitchenOrder.js"
import Order from "../models/Order.js"
import { ApiError } from "../utils/apiError.js"

// Get all kitchen orders with filtering, pagination, and sorting
export const getAllKitchenOrders = async (req, res, next) => {
  try {
    const { status, priority, orderType, startDate, endDate, page = 1, limit = 20, sort = "-createdAt" } = req.query

    // Build filter object
    const filter = {}

    if (status) filter.status = status
    if (priority) filter.priority = priority
    if (orderType) filter.orderType = orderType

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
    const kitchenOrders = await KitchenOrder.find(filter)
      .populate("order", "orderNumber orderStatus")
      .populate("table", "number section")
      .populate("room", "number")
      .populate("waiter", "full_name")
      .populate("chef", "full_name")
      .populate("items.menuItem", "name preparationTime category")
      .populate("items.assignedTo", "full_name")
      .sort(sort)
      .skip(skip)
      .limit(Number(limit))

    // Get total count for pagination
    const total = await KitchenOrder.countDocuments(filter)

    res.status(200).json({
      success: true,
      count: kitchenOrders.length,
      total,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
      data: kitchenOrders,
    })
  } catch (error) {
    next(error)
  }
}

// Get kitchen order by ID
export const getKitchenOrderById = async (req, res, next) => {
  try {
    const kitchenOrder = await KitchenOrder.findById(req.params.id)
      .populate("order", "orderNumber orderStatus items")
      .populate("table", "number section")
      .populate("room", "number")
      .populate("waiter", "full_name")
      .populate("chef", "full_name")
      .populate("items.menuItem", "name preparationTime category imageUrl")
      .populate("items.assignedTo", "full_name")
      .populate("createdBy", "full_name")
      .populate("updatedBy", "full_name")

    if (!kitchenOrder) {
      return next(new ApiError("Kitchen order not found", 404))
    }

    res.status(200).json({
      success: true,
      data: kitchenOrder,
    })
  } catch (error) {
    next(error)
  }
}

// Create new kitchen order
export const createKitchenOrder = async (req, res, next) => {
  try {
    const { orderNumber, order, table, room, items, priority, notes, orderType, waiter, chef } = req.body

    // Validate order
    if (!order) {
      return next(new ApiError("Order ID is required", 400))
    }

    // Check if order exists
    const existingOrder = await Order.findById(order)
    if (!existingOrder) {
      return next(new ApiError("Order not found", 404))
    }

    // Check if kitchen order already exists for this order
    const existingKitchenOrder = await KitchenOrder.findOne({ order })
    if (existingKitchenOrder) {
      return next(new ApiError("Kitchen order already exists for this order", 400))
    }

    // Create kitchen order
    const kitchenOrder = await KitchenOrder.create({
      orderNumber: orderNumber || existingOrder.orderNumber,
      order,
      table,
      room,
      items:
        items ||
        existingOrder.items.map((item) => ({
          menuItem: item.menuItem,
          name: item.name,
          quantity: item.quantity,
          notes: item.notes,
          modifiers: item.modifiers,
          status: "Pending",
        })),
      priority: priority || "Normal",
      status: "Pending",
      notes,
      orderType: orderType || existingOrder.orderType || "Dine In",
      waiter: waiter || existingOrder.waiter,
      chef,
      estimatedCompletionTime: new Date(Date.now() + 30 * 60000), // Default 30 minutes
      createdBy: req.user.id,
      updatedBy: req.user.id,
    })

    res.status(201).json({
      success: true,
      data: kitchenOrder,
    })
  } catch (error) {
    next(error)
  }
}

// Update kitchen order
export const updateKitchenOrder = async (req, res, next) => {
  try {
    const { priority, notes, chef, estimatedCompletionTime } = req.body

    const kitchenOrder = await KitchenOrder.findById(req.params.id)
    if (!kitchenOrder) {
      return next(new ApiError("Kitchen order not found", 404))
    }

    // Only allow updating orders that are not completed or cancelled
    if (kitchenOrder.status === "Completed" || kitchenOrder.status === "Cancelled") {
      return next(new ApiError(`Cannot update kitchen order with status: ${kitchenOrder.status}`, 400))
    }

    // Update kitchen order
    const updatedKitchenOrder = await KitchenOrder.findByIdAndUpdate(
      req.params.id,
      {
        priority,
        notes,
        chef,
        estimatedCompletionTime,
        isModified: true,
        modificationNotes: "Kitchen order modified",
        updatedBy: req.user.id,
      },
      { new: true, runValidators: true },
    )

    res.status(200).json({
      success: true,
      data: updatedKitchenOrder,
    })
  } catch (error) {
    next(error)
  }
}

// Update kitchen order status
export const updateKitchenOrderStatus = async (req, res, next) => {
  try {
    const { status, cancellationReason } = req.body

    if (!status) {
      return next(new ApiError("Status is required", 400))
    }

    const kitchenOrder = await KitchenOrder.findById(req.params.id)
    if (!kitchenOrder) {
      return next(new ApiError("Kitchen order not found", 404))
    }

    // Handle status-specific logic
    if (status === "Cancelled" && !cancellationReason) {
      return next(new ApiError("Cancellation reason is required", 400))
    }

    // Update kitchen order status
    kitchenOrder.status = status

    // Set timestamps based on status
    if (status === "In Progress" && !kitchenOrder.startedAt) {
      kitchenOrder.startedAt = new Date()
    } else if (status === "Completed" && !kitchenOrder.completedAt) {
      kitchenOrder.completedAt = new Date()
      kitchenOrder.actualCompletionTime = new Date()
    } else if (status === "Cancelled" && !kitchenOrder.cancelledAt) {
      kitchenOrder.cancelledAt = new Date()
      kitchenOrder.cancellationReason = cancellationReason
    }

    kitchenOrder.updatedBy = req.user.id
    await kitchenOrder.save()

    // Update order status if kitchen order is completed or cancelled
    if (kitchenOrder.status === "Completed" || kitchenOrder.status === "Cancelled") {
      await Order.findByIdAndUpdate(kitchenOrder.order, {
        orderStatus: status === "Completed" ? "Served" : "Cancelled",
        completedAt: status === "Completed" ? new Date() : undefined,
        cancelledAt: status === "Cancelled" ? new Date() : undefined,
        cancellationReason: status === "Cancelled" ? cancellationReason : undefined,
        updatedBy: req.user.id,
      })
    }

    res.status(200).json({
      success: true,
      message: `Kitchen order status updated to ${status}`,
      data: kitchenOrder,
    })
  } catch (error) {
    next(error)
  }
}

// Update kitchen order item status
export const updateKitchenOrderItemStatus = async (req, res, next) => {
  try {
    const { itemId, status, assignedTo } = req.body

    if (!itemId || !status) {
      return next(new ApiError("Item ID and status are required", 400))
    }

    const kitchenOrder = await KitchenOrder.findById(req.params.id)
    if (!kitchenOrder) {
      return next(new ApiError("Kitchen order not found", 404))
    }

    // Find the item in the kitchen order
    const item = kitchenOrder.items.id(itemId)
    if (!item) {
      return next(new ApiError("Item not found in kitchen order", 404))
    }

    // Update item status
    item.status = status
    if (assignedTo) item.assignedTo = assignedTo

    // Set timestamps based on status
    if (status === "Cooking" && !item.startedAt) {
      item.startedAt = new Date()
    } else if (status === "Ready" && !item.completedAt) {
      item.completedAt = new Date()
    }

    kitchenOrder.updatedBy = req.user.id
    await kitchenOrder.save()

    // Update corresponding order item status
    await Order.findOneAndUpdate(
      { _id: kitchenOrder.order, "items._id": item.menuItem },
      {
        $set: {
          "items.$.status": status,
          "items.$.preparedBy": req.user.full_name,
          "items.$.servedAt": status === "Served" ? new Date() : undefined,
        },
      },
    )

    res.status(200).json({
      success: true,
      message: `Item status updated to ${status}`,
      data: kitchenOrder,
    })
  } catch (error) {
    next(error)
  }
}

// Assign chef to kitchen order
export const assignChef = async (req, res, next) => {
  try {
    const { chef } = req.body

    if (!chef) {
      return next(new ApiError("Chef ID is required", 400))
    }

    const kitchenOrder = await KitchenOrder.findById(req.params.id)
    if (!kitchenOrder) {
      return next(new ApiError("Kitchen order not found", 404))
    }

    // Update chef assignment
    kitchenOrder.chef = chef
    kitchenOrder.updatedBy = req.user.id
    await kitchenOrder.save()

    res.status(200).json({
      success: true,
      message: "Chef assigned successfully",
      data: kitchenOrder,
    })
  } catch (error) {
    next(error)
  }
}

// Get kitchen order statistics
export const getKitchenStats = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query

    // Date range filter
    const dateFilter = {}
    if (startDate) dateFilter.createdAt = { $gte: new Date(startDate) }
    if (endDate) {
      const endDateObj = new Date(endDate)
      endDateObj.setHours(23, 59, 59, 999)
      dateFilter.createdAt = { ...dateFilter.createdAt, $lte: endDateObj }
    }

    // Get kitchen order statistics
    const stats = await KitchenOrder.aggregate([
      { $match: dateFilter },
      {
        $facet: {
          statusStats: [
            {
              $group: {
                _id: "$status",
                count: { $sum: 1 },
              },
            },
          ],
          priorityStats: [
            {
              $group: {
                _id: "$priority",
                count: { $sum: 1 },
              },
            },
          ],
          typeStats: [
            {
              $group: {
                _id: "$orderType",
                count: { $sum: 1 },
              },
            },
          ],
          hourlyStats: [
            {
              $group: {
                _id: { $hour: "$createdAt" },
                count: { $sum: 1 },
              },
            },
            { $sort: { _id: 1 } },
          ],
          preparationTimeStats: [
            {
              $match: {
                startedAt: { $exists: true },
                completedAt: { $exists: true },
              },
            },
            {
              $project: {
                preparationTime: {
                  $divide: [
                    { $subtract: ["$completedAt", "$startedAt"] },
                    60000, // Convert ms to minutes
                  ],
                },
              },
            },
            {
              $group: {
                _id: null,
                avgPreparationTime: { $avg: "$preparationTime" },
                minPreparationTime: { $min: "$preparationTime" },
                maxPreparationTime: { $max: "$preparationTime" },
              },
            },
          ],
          totalStats: [
            {
              $group: {
                _id: null,
                totalOrders: { $sum: 1 },
                completedOrders: {
                  $sum: {
                    $cond: [{ $eq: ["$status", "Completed"] }, 1, 0],
                  },
                },
                cancelledOrders: {
                  $sum: {
                    $cond: [{ $eq: ["$status", "Cancelled"] }, 1, 0],
                  },
                },
              },
            },
          ],
        },
      },
    ])

    res.status(200).json({
      success: true,
      data: {
        byStatus: stats[0].statusStats,
        byPriority: stats[0].priorityStats,
        byType: stats[0].typeStats,
        hourly: stats[0].hourlyStats,
        preparationTime: stats[0].preparationTimeStats[0] || {
          avgPreparationTime: 0,
          minPreparationTime: 0,
          maxPreparationTime: 0,
        },
        totals: stats[0].totalStats[0] || {
          totalOrders: 0,
          completedOrders: 0,
          cancelledOrders: 0,
        },
      },
    })
  } catch (error) {
    next(error)
  }
}

export default {
  getAllKitchenOrders,
  getKitchenOrderById,
  createKitchenOrder,
  updateKitchenOrder,
  updateKitchenOrderStatus,
  updateKitchenOrderItemStatus,
  assignChef,
  getKitchenStats,
}

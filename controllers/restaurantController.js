import MenuItem from "../models/MenuItem.js"
import Order from "../models/Order.js"
import Table from "../models/Table.js"
import KitchenOrder from "../models/KitchenOrder.js"
import { ApiError } from "../utils/apiError.js"

// ===== Menu Item Controller =====

// Get all menu items with filtering, pagination, and sorting
export const getAllMenuItems = async (req, res, next) => {
  try {
    const {
      search,
      category,
      subcategory,
      availability,
      isVegetarian,
      isVegan,
      isGlutenFree,
      featured,
      minPrice,
      maxPrice,
      menuSection,
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
        { ingredients: { $in: [new RegExp(search, "i")] } },
        { tags: { $in: [new RegExp(search, "i")] } },
      ]
    }

    if (category) filter.category = category
    if (subcategory) filter.subcategory = new RegExp(subcategory, "i")
    if (availability !== undefined) filter.availability = availability === "true"
    if (isVegetarian !== undefined) filter.isVegetarian = isVegetarian === "true"
    if (isVegan !== undefined) filter.isVegan = isVegan === "true"
    if (isGlutenFree !== undefined) filter.isGlutenFree = isGlutenFree === "true"
    if (featured !== undefined) filter.featured = featured === "true"
    if (menuSection) filter.menuSections = menuSection

    // Price range filter
    if (minPrice || maxPrice) {
      filter.price = {}
      if (minPrice) filter.price.$gte = Number(minPrice)
      if (maxPrice) filter.price.$lte = Number(maxPrice)
    }

    // Calculate pagination
    const skip = (Number(page) - 1) * Number(limit)

    // Execute query with pagination and sorting
    const menuItems = await MenuItem.find(filter).sort(sort).skip(skip).limit(Number(limit))

    // Get total count for pagination
    const total = await MenuItem.countDocuments(filter)

    res.status(200).json({
      success: true,
      count: menuItems.length,
      total,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
      data: menuItems,
    })
  } catch (error) {
    next(error)
  }
}

// Get menu item by ID
export const getMenuItemById = async (req, res, next) => {
  try {
    const menuItem = await MenuItem.findById(req.params.id)
      .populate("createdBy", "full_name")
      .populate("updatedBy", "full_name")

    if (!menuItem) {
      return next(new ApiError("Menu item not found", 404))
    }

    res.status(200).json({
      success: true,
      data: menuItem,
    })
  } catch (error) {
    next(error)
  }
}

// Create new menu item
export const createMenuItem = async (req, res, next) => {
  try {
    const {
      name,
      description,
      price,
      cost,
      category,
      subcategory,
      imageUrl,
      availability,
      preparationTime,
      isVegetarian,
      isVegan,
      isGlutenFree,
      allergens,
      spicyLevel,
      calories,
      ingredients,
      tags,
      featured,
      menuSections,
      availableDays,
      availableTimeStart,
      availableTimeEnd,
      discountPercentage,
      isDiscounted,
    } = req.body

    // Check if menu item with same name already exists
    const existingItem = await MenuItem.findOne({ name })
    if (existingItem) {
      return next(new ApiError("Menu item with this name already exists", 400))
    }

    // Create menu item
    const menuItem = await MenuItem.create({
      name,
      description,
      price,
      cost,
      category,
      subcategory,
      imageUrl,
      availability: availability !== undefined ? availability : true,
      preparationTime,
      isVegetarian,
      isVegan,
      isGlutenFree,
      allergens,
      spicyLevel,
      calories,
      ingredients,
      tags,
      featured,
      menuSections,
      availableDays,
      availableTimeStart,
      availableTimeEnd,
      discountPercentage,
      isDiscounted,
      createdBy: req.user.id,
      updatedBy: req.user.id,
    })

    res.status(201).json({
      success: true,
      data: menuItem,
    })
  } catch (error) {
    next(error)
  }
}

// Update menu item
export const updateMenuItem = async (req, res, next) => {
  try {
    const {
      name,
      description,
      price,
      cost,
      category,
      subcategory,
      imageUrl,
      availability,
      preparationTime,
      isVegetarian,
      isVegan,
      isGlutenFree,
      allergens,
      spicyLevel,
      calories,
      ingredients,
      tags,
      featured,
      menuSections,
      availableDays,
      availableTimeStart,
      availableTimeEnd,
      discountPercentage,
      isDiscounted,
    } = req.body

    const menuItem = await MenuItem.findById(req.params.id)
    if (!menuItem) {
      return next(new ApiError("Menu item not found", 404))
    }

    // Check if name is being changed and if it's already in use
    if (name && name !== menuItem.name) {
      const existingItem = await MenuItem.findOne({ name, _id: { $ne: req.params.id } })
      if (existingItem) {
        return next(new ApiError("Menu item with this name already exists", 400))
      }
    }

    // Update menu item
    const updatedMenuItem = await MenuItem.findByIdAndUpdate(
      req.params.id,
      {
        name,
        description,
        price,
        cost,
        category,
        subcategory,
        imageUrl,
        availability,
        preparationTime,
        isVegetarian,
        isVegan,
        isGlutenFree,
        allergens,
        spicyLevel,
        calories,
        ingredients,
        tags,
        featured,
        menuSections,
        availableDays,
        availableTimeStart,
        availableTimeEnd,
        discountPercentage,
        isDiscounted,
        updatedBy: req.user.id,
      },
      { new: true, runValidators: true },
    )

    res.status(200).json({
      success: true,
      data: updatedMenuItem,
    })
  } catch (error) {
    next(error)
  }
}

// Delete menu item
export const deleteMenuItem = async (req, res, next) => {
  try {
    const menuItem = await MenuItem.findById(req.params.id)
    if (!menuItem) {
      return next(new ApiError("Menu item not found", 404))
    }

    // Check if menu item is used in any orders
    const orderCount = await Order.countDocuments({ "items.menuItem": req.params.id })
    if (orderCount > 0) {
      return next(
        new ApiError(
          `Cannot delete menu item. It is used in ${orderCount} orders. Consider marking as unavailable instead.`,
          400,
        ),
      )
    }

    await menuItem.deleteOne()

    res.status(200).json({
      success: true,
      message: "Menu item deleted successfully",
    })
  } catch (error) {
    next(error)
  }
}

// Toggle menu item availability
export const toggleAvailability = async (req, res, next) => {
  try {
    const menuItem = await MenuItem.findById(req.params.id)
    if (!menuItem) {
      return next(new ApiError("Menu item not found", 404))
    }

    menuItem.availability = !menuItem.availability
    menuItem.updatedBy = req.user.id
    await menuItem.save()

    res.status(200).json({
      success: true,
      message: `Menu item ${menuItem.availability ? "is now available" : "is now unavailable"}`,
      data: { availability: menuItem.availability },
    })
  } catch (error) {
    next(error)
  }
}

// Toggle menu item featured status
export const toggleFeatured = async (req, res, next) => {
  try {
    const menuItem = await MenuItem.findById(req.params.id)
    if (!menuItem) {
      return next(new ApiError("Menu item not found", 404))
    }

    menuItem.featured = !menuItem.featured
    menuItem.updatedBy = req.user.id
    await menuItem.save()

    res.status(200).json({
      success: true,
      message: `Menu item ${menuItem.featured ? "is now featured" : "is no longer featured"}`,
      data: { featured: menuItem.featured },
    })
  } catch (error) {
    next(error)
  }
}

// ===== Table Controller =====

// Get all tables with filtering
export const getAllTables = async (req, res, next) => {
  try {
    const { section, status, capacity, isActive } = req.query

    // Build filter object
    const filter = {}

    if (section) filter.section = section
    if (status) filter.status = status
    if (capacity) filter.capacity = { $gte: Number(capacity) }
    if (isActive !== undefined) filter.isActive = isActive === "true"

    // Execute query
    const tables = await Table.find(filter).sort("number")

    res.status(200).json({
      success: true,
      count: tables.length,
      data: tables,
    })
  } catch (error) {
    next(error)
  }
}

// Get table by ID
export const getTableById = async (req, res, next) => {
  try {
    const table = await Table.findById(req.params.id)
      .populate("currentOrder", "orderNumber orderStatus items")
      .populate("createdBy", "full_name")
      .populate("updatedBy", "full_name")

    if (!table) {
      return next(new ApiError("Table not found", 404))
    }

    res.status(200).json({
      success: true,
      data: table,
    })
  } catch (error) {
    next(error)
  }
}

// Create new table
export const createTable = async (req, res, next) => {
  try {
    const {
      number,
      section,
      capacity,
      minCapacity,
      shape,
      width,
      length,
      positionX,
      positionY,
      rotation,
      status,
      isActive,
      notes,
    } = req.body

    // Check if table with same number already exists
    const existingTable = await Table.findOne({ number })
    if (existingTable) {
      return next(new ApiError("Table with this number already exists", 400))
    }

    // Create table
    const table = await Table.create({
      number,
      section,
      capacity,
      minCapacity,
      shape,
      width,
      length,
      positionX,
      positionY,
      rotation,
      status: status || "Available",
      isActive: isActive !== undefined ? isActive : true,
      notes,
      createdBy: req.user.id,
      updatedBy: req.user.id,
    })

    res.status(201).json({
      success: true,
      data: table,
    })
  } catch (error) {
    next(error)
  }
}

// Update table
export const updateTable = async (req, res, next) => {
  try {
    const {
      number,
      section,
      capacity,
      minCapacity,
      shape,
      width,
      length,
      positionX,
      positionY,
      rotation,
      isActive,
      notes,
    } = req.body

    const table = await Table.findById(req.params.id)
    if (!table) {
      return next(new ApiError("Table not found", 404))
    }

    // Check if number is being changed and if it's already in use
    if (number && number !== table.number) {
      const existingTable = await Table.findOne({ number, _id: { $ne: req.params.id } })
      if (existingTable) {
        return next(new ApiError("Table with this number already exists", 400))
      }
    }

    // Update table
    const updatedTable = await Table.findByIdAndUpdate(
      req.params.id,
      {
        number,
        section,
        capacity,
        minCapacity,
        shape,
        width,
        length,
        positionX,
        positionY,
        rotation,
        isActive,
        notes,
        updatedBy: req.user.id,
      },
      { new: true, runValidators: true },
    )

    res.status(200).json({
      success: true,
      data: updatedTable,
    })
  } catch (error) {
    next(error)
  }
}

// Delete table
export const deleteTable = async (req, res, next) => {
  try {
    const table = await Table.findById(req.params.id)
    if (!table) {
      return next(new ApiError("Table not found", 404))
    }

    // Check if table is currently occupied or has an active order
    if (table.status === "Occupied" || table.currentOrder) {
      return next(new ApiError("Cannot delete table that is currently in use", 400))
    }

    await table.deleteOne()

    res.status(200).json({
      success: true,
      message: "Table deleted successfully",
    })
  } catch (error) {
    next(error)
  }
}

// Update table status
export const updateTableStatus = async (req, res, next) => {
  try {
    const { status, currentGuests, reservationName, reservationPhone, reservationTime, notes } = req.body

    if (!status) {
      return next(new ApiError("Status is required", 400))
    }

    const table = await Table.findById(req.params.id)
    if (!table) {
      return next(new ApiError("Table not found", 404))
    }

    // Update table
    table.status = status
    if (currentGuests !== undefined) table.currentGuests = currentGuests
    if (reservationName) table.reservationName = reservationName
    if (reservationPhone) table.reservationPhone = reservationPhone
    if (reservationTime) table.reservationTime = new Date(reservationTime)
    if (notes) table.notes = notes

    // Update timestamps based on status
    if (status === "Occupied" && table.status !== "Occupied") {
      table.lastOccupiedAt = new Date()
    } else if (status === "Cleaning" && table.status !== "Cleaning") {
      table.lastCleanedAt = new Date()
    }

    table.updatedBy = req.user.id
    await table.save()

    res.status(200).json({
      success: true,
      message: `Table status updated to ${status}`,
      data: table,
    })
  } catch (error) {
    next(error)
  }
}

// ===== Order Controller =====

// Get all orders with filtering, pagination, and sorting
export const getAllOrders = async (req, res, next) => {
  try {
    const {
      table,
      room,
      guest,
      orderStatus,
      paymentStatus,
      orderType,
      startDate,
      endDate,
      page = 1,
      limit = 20,
      sort = "-orderedAt",
    } = req.query

    // Build filter object
    const filter = {}

    if (table) filter.table = table
    if (room) filter.room = room
    if (guest) filter.guest = guest
    if (orderStatus) filter.orderStatus = orderStatus
    if (paymentStatus) filter.paymentStatus = paymentStatus
    if (orderType) filter.orderType = orderType

    // Date range filter
    if (startDate || endDate) {
      filter.orderedAt = {}
      if (startDate) filter.orderedAt.$gte = new Date(startDate)
      if (endDate) {
        const endDateObj = new Date(endDate)
        endDateObj.setHours(23, 59, 59, 999)
        filter.orderedAt.$lte = endDateObj
      }
    }

    // Calculate pagination
    const skip = (Number(page) - 1) * Number(limit)

    // Execute query with pagination and sorting
    const orders = await Order.find(filter)
      .populate("table", "number section")
      .populate("room", "number")
      .populate("guest", "full_name")
      .populate("booking", "confirmation_number")
      .populate("waiter", "full_name")
      .sort(sort)
      .skip(skip)
      .limit(Number(limit))

    // Get total count for pagination
    const total = await Order.countDocuments(filter)

    res.status(200).json({
      success: true,
      count: orders.length,
      total,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
      data: orders,
    })
  } catch (error) {
    next(error)
  }
}

// Get order by ID
export const getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("table", "number section")
      .populate("room", "number")
      .populate("guest", "full_name email phone")
      .populate("booking", "confirmation_number")
      .populate("waiter", "full_name")
      .populate("items.menuItem", "name price category preparationTime")
      .populate("createdBy", "full_name")
      .populate("updatedBy", "full_name")

    if (!order) {
      return next(new ApiError("Order not found", 404))
    }

    res.status(200).json({
      success: true,
      data: order,
    })
  } catch (error) {
    next(error)
  }
}

// Create new order
export const createOrder = async (req, res, next) => {
  try {
    const {
      table,
      room,
      guest,
      booking,
      waiter,
      items,
      subtotal,
      taxRate,
      discountPercentage,
      serviceChargePercentage,
      orderType,
      priority,
      notes,
      customerName,
      customerPhone,
      deliveryAddress,
      deliveryNotes,
    } = req.body

    // Validate items
    if (!items || !Array.isArray(items) || items.length === 0) {
      return next(new ApiError("Order must contain at least one item", 400))
    }

    // Validate menu items and calculate totals
    const menuItemIds = items.map((item) => item.menuItem)
    const menuItems = await MenuItem.find({ _id: { $in: menuItemIds } })

    if (menuItems.length !== menuItemIds.length) {
      return next(new ApiError("One or more menu items not found", 404))
    }

    // Create order items with details from menu items
    const orderItems = items.map((item) => {
      const menuItem = menuItems.find((mi) => mi._id.toString() === item.menuItem.toString())
      return {
        menuItem: menuItem._id,
        name: menuItem.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice || menuItem.price,
        totalPrice: (item.unitPrice || menuItem.price) * item.quantity,
        notes: item.notes,
        modifiers: item.modifiers,
        status: "Pending",
      }
    })

    // Calculate totals
    const calculatedSubtotal = orderItems.reduce((sum, item) => sum + item.totalPrice, 0)
    const taxAmount = (calculatedSubtotal * (taxRate || 0)) / 100
    const discountAmount = (calculatedSubtotal * (discountPercentage || 0)) / 100
    const serviceChargeAmount = (calculatedSubtotal * (serviceChargePercentage || 0)) / 100
    const totalAmount = calculatedSubtotal + taxAmount + serviceChargeAmount - discountAmount

    // Create order
    const order = await Order.create({
      table,
      room,
      guest,
      booking,
      waiter: waiter || req.user.id,
      items: orderItems,
      subtotal: calculatedSubtotal,
      taxRate: taxRate || 0,
      taxAmount,
      discountPercentage: discountPercentage || 0,
      discountAmount,
      serviceChargePercentage: serviceChargePercentage || 0,
      serviceChargeAmount,
      totalAmount,
      orderType: orderType || "Dine In",
      orderStatus: "New",
      paymentStatus: "Pending",
      priority: priority || "Normal",
      notes,
      customerName,
      customerPhone,
      deliveryAddress,
      deliveryNotes,
      orderedAt: new Date(),
      createdBy: req.user.id,
      updatedBy: req.user.id,
    })

    // Update table status if table is provided
    if (table) {
      await Table.findByIdAndUpdate(table, {
        status: "Occupied",
        currentOrder: order._id,
        currentGuests: order.items.reduce((sum, item) => sum + item.quantity, 0),
        lastOccupiedAt: new Date(),
        updatedBy: req.user.id,
      })
    }

    // Create kitchen order
    await KitchenOrder.create({
      orderNumber: order.orderNumber,
      order: order._id,
      table,
      room,
      items: orderItems.map((item) => ({
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
      orderType: orderType || "Dine In",
      waiter: waiter || req.user.id,
      createdBy: req.user.id,
      updatedBy: req.user.id,
    })

    res.status(201).json({
      success: true,
      data: order,
    })
  } catch (error) {
    next(error)
  }
}

// Update order
export const updateOrder = async (req, res, next) => {
  try {
    const { items, priority, notes, customerName, customerPhone, deliveryAddress, deliveryNotes } = req.body

    const order = await Order.findById(req.params.id)
    if (!order) {
      return next(new ApiError("Order not found", 404))
    }

    // Only allow updating orders that are not completed or cancelled
    if (order.orderStatus === "Completed" || order.orderStatus === "Cancelled") {
      return next(new ApiError(`Cannot update order with status: ${order.orderStatus}`, 400))
    }

    // Update order
    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      {
        priority,
        notes,
        customerName,
        customerPhone,
        deliveryAddress,
        deliveryNotes,
        isModified: true,
        modificationNotes: "Order modified",
        updatedBy: req.user.id,
      },
      { new: true, runValidators: true },
    )

    // If items are being updated, handle separately
    if (items && Array.isArray(items) && items.length > 0) {
      // This would require more complex logic to update items, kitchen orders, etc.
      // For simplicity, we're not implementing full item updates in this example
    }

    res.status(200).json({
      success: true,
      data: updatedOrder,
    })
  } catch (error) {
    next(error)
  }
}

// Update order status
export const updateOrderStatus = async (req, res, next) => {
  try {
    const { status, cancellationReason } = req.body

    if (!status) {
      return next(new ApiError("Status is required", 400))
    }

    const order = await Order.findById(req.params.id)
    if (!order) {
      return next(new ApiError("Order not found", 404))
    }

    // Handle status-specific logic
    if (status === "Cancelled" && !cancellationReason) {
      return next(new ApiError("Cancellation reason is required", 400))
    }

    // Update order status
    order.orderStatus = status

    // Set timestamps based on status
    if (status === "Completed" && !order.completedAt) {
      order.completedAt = new Date()
    } else if (status === "Cancelled" && !order.cancelledAt) {
      order.cancelledAt = new Date()
      order.cancellationReason = cancellationReason
    }

    order.updatedBy = req.user.id
    await order.save()

    // Update table status if order is completed or cancelled
    if ((status === "Completed" || status === "Cancelled") && order.table) {
      await Table.findByIdAndUpdate(order.table, {
        status: "Available",
        currentOrder: null,
        currentGuests: 0,
        updatedBy: req.user.id,
      })
    }

    // Update kitchen order status
    if (order.orderStatus === "Completed" || order.orderStatus === "Cancelled") {
      await KitchenOrder.findOneAndUpdate(
        { order: order._id },
        {
          status: status === "Completed" ? "Completed" : "Cancelled",
          completedAt: status === "Completed" ? new Date() : undefined,
          cancelledAt: status === "Cancelled" ? new Date() : undefined,
          updatedBy: req.user.id,
        },
      )
    }

    res.status(200).json({
      success: true,
      message: `Order status updated to ${status}`,
      data: order,
    })
  } catch (error) {
    next(error)
  }
}

// Update order payment status
export const updatePaymentStatus = async (req, res, next) => {
  try {
    const { status } = req.body

    if (!status) {
      return next(new ApiError("Payment status is required", 400))
    }

    const order = await Order.findById(req.params.id)
    if (!order) {
      return next(new ApiError("Order not found", 404))
    }

    // Update payment status
    order.paymentStatus = status
    order.updatedBy = req.user.id
    await order.save()

    res.status(200).json({
      success: true,
      message: `Order payment status updated to ${status}`,
      data: order,
    })
  } catch (error) {
    next(error)
  }
}

// Get order statistics
export const getOrderStats = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query

    // Date range filter
    const dateFilter = {}
    if (startDate) dateFilter.orderedAt = { $gte: new Date(startDate) }
    if (endDate) {
      const endDateObj = new Date(endDate)
      endDateObj.setHours(23, 59, 59, 999)
      dateFilter.orderedAt = { ...dateFilter.orderedAt, $lte: endDateObj }
    }

    // Get order statistics
    const stats = await Order.aggregate([
      { $match: dateFilter },
      {
        $facet: {
          statusStats: [
            {
              $group: {
                _id: "$orderStatus",
                count: { $sum: 1 },
                revenue: { $sum: "$totalAmount" },
              },
            },
          ],
          typeStats: [
            {
              $group: {
                _id: "$orderType",
                count: { $sum: 1 },
                revenue: { $sum: "$totalAmount" },
              },
            },
          ],
          dailyStats: [
            {
              $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$orderedAt" } },
                count: { $sum: 1 },
                revenue: { $sum: "$totalAmount" },
              },
            },
            { $sort: { _id: 1 } },
          ],
          hourlyStats: [
            {
              $group: {
                _id: { $hour: "$orderedAt" },
                count: { $sum: 1 },
                revenue: { $sum: "$totalAmount" },
              },
            },
            { $sort: { _id: 1 } },
          ],
          totalStats: [
            {
              $group: {
                _id: null,
                totalOrders: { $sum: 1 },
                totalRevenue: { $sum: "$totalAmount" },
                avgOrderValue: { $avg: "$totalAmount" },
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
        byType: stats[0].typeStats,
        daily: stats[0].dailyStats,
        hourly: stats[0].hourlyStats,
        totals: stats[0].totalStats[0] || {
          totalOrders: 0,
          totalRevenue: 0,
          avgOrderValue: 0,
        },
      },
    })
  } catch (error) {
    next(error)
  }
}

export default {
  // Menu Item Controller
  getAllMenuItems,
  getMenuItemById,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  toggleAvailability,
  toggleFeatured,

  // Table Controller
  getAllTables,
  getTableById,
  createTable,
  updateTable,
  deleteTable,
  updateTableStatus,

  // Order Controller
  getAllOrders,
  getOrderById,
  createOrder,
  updateOrder,
  updateOrderStatus,
  updatePaymentStatus,
  getOrderStats,
}

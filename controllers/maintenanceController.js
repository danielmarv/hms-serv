import Maintenance from "../models/Maintenance.js"
import Room from "../models/Room.js"
import { validationResult } from "express-validator"

// Get all maintenance requests with optional filtering
export const getAllMaintenanceRequests = async (req, res) => {
  try {
    const {
      room,
      status,
      assigned_to,
      reported_by,
      startDate,
      endDate,
      sort = "-createdAt",
      limit = 50,
      page = 1,
    } = req.query

    // Build filter object
    const filter = {}

    if (room) filter.room = room
    if (status) filter.status = status
    if (assigned_to) filter.assigned_to = assigned_to
    if (reported_by) filter.reported_by = reported_by

    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {}
      if (startDate) filter.createdAt.$gte = new Date(startDate)
      if (endDate) filter.createdAt.$lte = new Date(endDate)
    }

    // Calculate pagination
    const skip = (Number.parseInt(page) - 1) * Number.parseInt(limit)

    // Execute query with pagination and sorting
    const maintenanceRequests = await Maintenance.find(filter)
      .populate("room", "number floor building")
      .populate("reported_by", "name")
      .populate("assigned_to", "name")
      .sort(sort)
      .skip(skip)
      .limit(Number.parseInt(limit))

    // Get total count for pagination
    const total = await Maintenance.countDocuments(filter)

    res.status(200).json({
      success: true,
      count: maintenanceRequests.length,
      total,
      pagination: {
        page: Number.parseInt(page),
        limit: Number.parseInt(limit),
        totalPages: Math.ceil(total / Number.parseInt(limit)),
      },
      data: maintenanceRequests,
    })
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch maintenance requests", error: error.message })
  }
}

// Get maintenance request by ID
export const getMaintenanceRequestById = async (req, res) => {
  try {
    const maintenanceRequest = await Maintenance.findById(req.params.id)
      .populate("room", "number floor building status")
      .populate("reported_by", "name")
      .populate("assigned_to", "name")
      .populate("createdBy", "name")
      .populate("updatedBy", "name")

    if (!maintenanceRequest) {
      return res.status(404).json({ success: false, message: "Maintenance request not found" })
    }

    res.status(200).json({ success: true, data: maintenanceRequest })
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch maintenance request", error: error.message })
  }
}

// Create new maintenance request
export const createMaintenanceRequest = async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() })
  }

  try {
    // Verify room exists
    const room = await Room.findById(req.body.room)
    if (!room) {
      return res.status(400).json({ success: false, message: "Invalid room" })
    }

    const newMaintenanceRequest = new Maintenance({
      ...req.body,
      reported_by: req.body.reported_by || req.user.id,
      createdBy: req.user.id,
      updatedBy: req.user.id,
    })

    const savedMaintenanceRequest = await newMaintenanceRequest.save()

    // Update room status to maintenance if it's currently available
    if (room.status === "available") {
      room.status = "maintenance"
      room.updatedBy = req.user.id
      await room.save()
    }

    res.status(201).json({ success: true, data: savedMaintenanceRequest })
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to create maintenance request", error: error.message })
  }
}

// Update maintenance request
export const updateMaintenanceRequest = async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() })
  }

  try {
    const maintenanceRequest = await Maintenance.findById(req.params.id)
    if (!maintenanceRequest) {
      return res.status(404).json({ success: false, message: "Maintenance request not found" })
    }

    // If status is being updated to resolved, set resolved_at
    if (req.body.status === "resolved" && maintenanceRequest.status !== "resolved") {
      req.body.resolved_at = new Date()
    }

    const updatedMaintenanceRequest = await Maintenance.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        updatedBy: req.user.id,
      },
      { new: true, runValidators: true },
    )

    // If status changed to resolved, update room status back to available
    if (req.body.status === "resolved" && maintenanceRequest.status !== "resolved") {
      const room = await Room.findById(maintenanceRequest.room)
      if (room && room.status === "maintenance") {
        room.status = "available"
        room.updatedBy = req.user.id
        await room.save()
      }
    }

    res.status(200).json({ success: true, data: updatedMaintenanceRequest })
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update maintenance request", error: error.message })
  }
}

// Delete maintenance request
export const deleteMaintenanceRequest = async (req, res) => {
  try {
    const maintenanceRequest = await Maintenance.findById(req.params.id)
    if (!maintenanceRequest) {
      return res.status(404).json({ success: false, message: "Maintenance request not found" })
    }

    await maintenanceRequest.deleteOne()
    res.status(200).json({ success: true, message: "Maintenance request deleted successfully" })
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to delete maintenance request", error: error.message })
  }
}

// Assign maintenance request
export const assignMaintenanceRequest = async (req, res) => {
  const { assignedTo } = req.body

  if (!assignedTo) {
    return res.status(400).json({ success: false, message: "Assigned user ID is required" })
  }

  try {
    const maintenanceRequest = await Maintenance.findById(req.params.id)
    if (!maintenanceRequest) {
      return res.status(404).json({ success: false, message: "Maintenance request not found" })
    }

    maintenanceRequest.assigned_to = assignedTo
    maintenanceRequest.status = "in_progress"
    maintenanceRequest.updatedBy = req.user.id

    await maintenanceRequest.save()

    res.status(200).json({ success: true, data: maintenanceRequest })
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to assign maintenance request", error: error.message })
  }
}

// Get maintenance statistics
export const getMaintenanceStats = async (req, res) => {
  try {
    const stats = await Maintenance.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          avgCost: { $avg: "$actual_cost" },
        },
      },
    ])

    // Transform to a more user-friendly format
    const formattedStats = {
      total: 0,
      pending: 0,
      in_progress: 0,
      resolved: 0,
      unresolved: 0,
      totalCost: 0,
      avgCost: 0,
    }

    let totalCost = 0
    let totalWithCost = 0

    stats.forEach((stat) => {
      formattedStats[stat._id] = stat.count
      formattedStats.total += stat.count

      if (stat.avgCost) {
        totalCost += stat.avgCost * stat.count
        totalWithCost += stat.count
      }
    })

    formattedStats.totalCost = totalCost
    formattedStats.avgCost = totalWithCost > 0 ? totalCost / totalWithCost : 0

    res.status(200).json({ success: true, data: formattedStats })
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch maintenance statistics", error: error.message })
  }
}

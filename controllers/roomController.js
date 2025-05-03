import Room from "../models/Room.js"
import RoomType from "../models/RoomType.js"
import mongoose from "mongoose"
import { validationResult } from "express-validator"

// Get all rooms with optional filtering
export const getAllRooms = async (req, res) => {
  try {
    const {
      status,
      floor,
      building,
      view,
      is_smoking_allowed,
      is_accessible,
      roomType,
      branch,
      has_smart_lock,
      sort = "number",
      limit = 100,
      page = 1,
    } = req.query

    // Build filter object
    const filter = {}

    if (status) filter.status = status
    if (floor) filter.floor = floor
    if (building) filter.building = building
    if (view) filter.view = view
    if (is_smoking_allowed !== undefined) filter.is_smoking_allowed = is_smoking_allowed === "true"
    if (is_accessible !== undefined) filter.is_accessible = is_accessible === "true"
    if (roomType) filter.roomType = roomType
    if (branch) filter.branch = branch
    if (has_smart_lock !== undefined) filter.has_smart_lock = has_smart_lock === "true"

    // Calculate pagination
    const skip = (Number.parseInt(page) - 1) * Number.parseInt(limit)

    // Execute query with pagination and sorting
    const rooms = await Room.find(filter)
      .populate("roomType", "name basePice category")
      .sort(sort)
      .skip(skip)
      .limit(Number.parseInt(limit))

    // Get total count for pagination
    const total = await Room.countDocuments(filter)

    res.status(200).json({
      success: true,
      count: rooms.length,
      total,
      pagination: {
        page: Number.parseInt(page),
        limit: Number.parseInt(limit),
        totalPages: Math.ceil(total / Number.parseInt(limit)),
      },
      data: rooms,
    })
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch rooms", error: error.message })
  }
}

// Get room by ID
export const getRoomById = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id).populate("roomType")

    if (!room) {
      return res.status(404).json({ success: false, message: "Room not found" })
    }

    res.status(200).json({ success: true, data: room })
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch room", error: error.message })
  }
}

// Create new room
export const createRoom = async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() })
  }

  try {
    // Verify room type exists
    const roomType = await RoomType.findById(req.body.roomType)
    if (!roomType) {
      return res.status(400).json({ success: false, message: "Invalid room type" })
    }

    const newRoom = new Room({
      ...req.body,
      createdBy: req.user.id,
      updatedBy: req.user.id,
    })

    const savedRoom = await newRoom.save()
    res.status(201).json({ success: true, data: savedRoom })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: "Room with this number already exists" })
    }
    res.status(500).json({ success: false, message: "Failed to create room", error: error.message })
  }
}

// Update room
export const updateRoom = async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() })
  }

  try {
    // If roomType is being updated, verify it exists
    if (req.body.roomType) {
      const roomType = await RoomType.findById(req.body.roomType)
      if (!roomType) {
        return res.status(400).json({ success: false, message: "Invalid room type" })
      }
    }

    const updatedRoom = await Room.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        updatedBy: req.user.id,
      },
      { new: true, runValidators: true },
    )

    if (!updatedRoom) {
      return res.status(404).json({ success: false, message: "Room not found" })
    }

    res.status(200).json({ success: true, data: updatedRoom })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: "Room with this number already exists" })
    }
    res.status(500).json({ success: false, message: "Failed to update room", error: error.message })
  }
}

// Delete room
export const deleteRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id)
    if (!room) {
      return res.status(404).json({ success: false, message: "Room not found" })
    }

    // Check if room is currently occupied or reserved
    if (room.status === "occupied" || room.status === "reserved") {
      return res.status(400).json({
        success: false,
        message: `Cannot delete room. Current status is ${room.status}.`,
      })
    }

    await room.deleteOne()
    res.status(200).json({ success: true, message: "Room deleted successfully" })
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to delete room", error: error.message })
  }
}

// Update room status
export const updateRoomStatus = async (req, res) => {
  const { status } = req.body

  if (!status) {
    return res.status(400).json({ success: false, message: "Status is required" })
  }

  const validStatuses = ["available", "occupied", "maintenance", "cleaning", "reserved", "out_of_order"]
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: "Invalid status" })
  }

  try {
    const room = await Room.findById(req.params.id)
    if (!room) {
      return res.status(404).json({ success: false, message: "Room not found" })
    }

    room.status = status
    room.updatedBy = req.user.id

    await room.save()

    res.status(200).json({ success: true, data: room })
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update room status", error: error.message })
  }
}

// Get room statistics
export const getRoomStats = async (req, res) => {
  try {
    const stats = await Room.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ])

    // Transform to a more user-friendly format
    const formattedStats = {
      total: 0,
      available: 0,
      occupied: 0,
      maintenance: 0,
      cleaning: 0,
      reserved: 0,
      out_of_order: 0,
    }

    stats.forEach((stat) => {
      formattedStats[stat._id] = stat.count
      formattedStats.total += stat.count
    })

    res.status(200).json({ success: true, data: formattedStats })
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch room statistics", error: error.message })
  }
}

// Connect rooms (for adjoining rooms)
export const connectRooms = async (req, res) => {
  const { roomIds } = req.body

  if (!roomIds || !Array.isArray(roomIds) || roomIds.length < 2) {
    return res.status(400).json({ success: false, message: "At least two valid room IDs are required" })
  }

  const session = await mongoose.startSession()
  session.startTransaction()

  try {
    // Verify all rooms exist
    const rooms = await Room.find({ _id: { $in: roomIds } })

    if (rooms.length !== roomIds.length) {
      await session.abortTransaction()
      session.endSession()
      return res.status(400).json({ success: false, message: "One or more rooms not found" })
    }

    // Update each room to connect to all others
    const updatePromises = rooms.map((room) => {
      const otherRoomIds = roomIds.filter((id) => id.toString() !== room._id.toString())
      return Room.findByIdAndUpdate(
        room._id,
        {
          connected_rooms: otherRoomIds,
          updatedBy: req.user.id,
        },
        { session },
      )
    })

    await Promise.all(updatePromises)
    await session.commitTransaction()
    session.endSession()

    res.status(200).json({ success: true, message: "Rooms connected successfully" })
  } catch (error) {
    await session.abortTransaction()
    session.endSession()
    res.status(500).json({ success: false, message: "Failed to connect rooms", error: error.message })
  }
}

// Disconnect rooms
export const disconnectRooms = async (req, res) => {
  const { roomId, disconnectFromId } = req.body

  if (!roomId || !disconnectFromId) {
    return res.status(400).json({ success: false, message: "Both roomId and disconnectFromId are required" })
  }

  const session = await mongoose.startSession()
  session.startTransaction()

  try {
    // Remove disconnectFromId from roomId's connected_rooms
    await Room.findByIdAndUpdate(
      roomId,
      {
        $pull: { connected_rooms: disconnectFromId },
        updatedBy: req.user.id,
      },
      { session },
    )

    // Remove roomId from disconnectFromId's connected_rooms
    await Room.findByIdAndUpdate(
      disconnectFromId,
      {
        $pull: { connected_rooms: roomId },
        updatedBy: req.user.id,
      },
      { session },
    )

    await session.commitTransaction()
    session.endSession()

    res.status(200).json({ success: true, message: "Rooms disconnected successfully" })
  } catch (error) {
    await session.abortTransaction()
    session.endSession()
    res.status(500).json({ success: false, message: "Failed to disconnect rooms", error: error.message })
  }
}

// Get available rooms for a date range
export const getAvailableRooms = async (req, res) => {
  const { startDate, endDate, roomType, floor, building, view, isAccessible, isSmokingAllowed } = req.query

  if (!startDate || !endDate) {
    return res.status(400).json({ success: false, message: "Start date and end date are required" })
  }

  try {
    // Build filter object
    const filter = { status: "available" }

    if (roomType) filter.roomType = roomType
    if (floor) filter.floor = floor
    if (building) filter.building = building
    if (view) filter.view = view
    if (isAccessible !== undefined) filter.is_accessible = isAccessible === "true"
    if (isSmokingAllowed !== undefined) filter.is_smoking_allowed = isSmokingAllowed === "true"

    // Find rooms that match the criteria
    const availableRooms = await Room.find(filter).populate("roomType", "name base_price category max_occupancy")

    res.status(200).json({
      success: true,
      count: availableRooms.length,
      data: availableRooms,
    })
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch available rooms", error: error.message })
  }
}

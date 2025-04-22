import RoomType from "../models/RoomType.js"
import { validationResult } from "express-validator"
import mongoose from "mongoose" // Import mongoose

// Get all room types
export const getAllRoomTypes = async (req, res) => {
  try {
    const roomTypes = await RoomType.find()
    res.status(200).json({ success: true, data: roomTypes })
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch room types", error: error.message })
  }
}

// Get room type by ID
export const getRoomTypeById = async (req, res) => {
  try {
    const roomType = await RoomType.findById(req.params.id)
    if (!roomType) {
      return res.status(404).json({ success: false, message: "Room type not found" })
    }
    res.status(200).json({ success: true, data: roomType })
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch room type", error: error.message })
  }
}

// Create new room type
export const createRoomType = async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() })
  }

  try {
    const newRoomType = new RoomType({
      ...req.body,
      createdBy: req.user.id,
      updatedBy: req.user.id,
    })

    const savedRoomType = await newRoomType.save()
    res.status(201).json({ success: true, data: savedRoomType })
  } catch (error) {
    if (error.code === 11000) {
      // Duplicate key error
      return res.status(400).json({ success: false, message: "Room type with this name already exists" })
    }
    res.status(500).json({ success: false, message: "Failed to create room type", error: error.message })
  }
}

// Update room type
export const updateRoomType = async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() })
  }

  try {
    const updatedRoomType = await RoomType.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        updatedBy: req.user.id,
      },
      { new: true, runValidators: true },
    )

    if (!updatedRoomType) {
      return res.status(404).json({ success: false, message: "Room type not found" })
    }

    res.status(200).json({ success: true, data: updatedRoomType })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: "Room type with this name already exists" })
    }
    res.status(500).json({ success: false, message: "Failed to update room type", error: error.message })
  }
}

// Delete room type
export const deleteRoomType = async (req, res) => {
  try {
    const roomType = await RoomType.findById(req.params.id)
    if (!roomType) {
      return res.status(404).json({ success: false, message: "Room type not found" })
    }

    // Check if any rooms are using this room type
    const Room = mongoose.model("Room")
    const roomCount = await Room.countDocuments({ room_type: req.params.id })

    if (roomCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete room type. It is currently assigned to ${roomCount} rooms.`,
      })
    }

    await roomType.deleteOne()
    res.status(200).json({ success: true, message: "Room type deleted successfully" })
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to delete room type", error: error.message })
  }
}

// Get room type statistics
export const getRoomTypeStats = async (req, res) => {
  try {
    const Room = mongoose.model("Room")

    const stats = await RoomType.aggregate([
      {
        $lookup: {
          from: "rooms",
          localField: "_id",
          foreignField: "room_type",
          as: "rooms",
        },
      },
      {
        $project: {
          name: 1,
          base_price: 1,
          category: 1,
          total_rooms: { $size: "$rooms" },
          available_rooms: {
            $size: {
              $filter: {
                input: "$rooms",
                as: "room",
                cond: { $eq: ["$$room.status", "available"] },
              },
            },
          },
        },
      },
    ])

    res.status(200).json({ success: true, data: stats })
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch room type statistics", error: error.message })
  }
}

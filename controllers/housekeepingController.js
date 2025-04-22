import HousekeepingSchedule from "../models/HousekeepingSchedule.js"
import Room from "../models/Room.js"
import { validationResult } from "express-validator"

// Get all housekeeping schedules with optional filtering
export const getAllHousekeepingSchedules = async (req, res) => {
  try {
    const {
      room,
      assigned_to,
      status,
      date,
      startDate,
      endDate,
      sort = "schedule_date",
      limit = 50,
      page = 1,
    } = req.query

    // Build filter object
    const filter = {}

    if (room) filter.room = room
    if (assigned_to) filter.assigned_to = assigned_to
    if (status) filter.status = status

    // Single date filter
    if (date) {
      const selectedDate = new Date(date)
      const nextDay = new Date(selectedDate)
      nextDay.setDate(nextDay.getDate() + 1)

      filter.schedule_date = {
        $gte: selectedDate,
        $lt: nextDay,
      }
    }
    // Date range filter
    else if (startDate || endDate) {
      filter.schedule_date = {}
      if (startDate) filter.schedule_date.$gte = new Date(startDate)
      if (endDate) {
        const endDateObj = new Date(endDate)
        endDateObj.setDate(endDateObj.getDate() + 1)
        filter.schedule_date.$lt = endDateObj
      }
    }

    // Calculate pagination
    const skip = (Number.parseInt(page) - 1) * Number.parseInt(limit)

    // Execute query with pagination and sorting
    const schedules = await HousekeepingSchedule.find(filter)
      .populate("room", "number floor building status")
      .populate("assigned_to", "name")
      .sort(sort)
      .skip(skip)
      .limit(Number.parseInt(limit))

    // Get total count for pagination
    const total = await HousekeepingSchedule.countDocuments(filter)

    res.status(200).json({
      success: true,
      count: schedules.length,
      total,
      pagination: {
        page: Number.parseInt(page),
        limit: Number.parseInt(limit),
        totalPages: Math.ceil(total / Number.parseInt(limit)),
      },
      data: schedules,
    })
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch housekeeping schedules", error: error.message })
  }
}

// Get housekeeping schedule by ID
export const getHousekeepingScheduleById = async (req, res) => {
  try {
    const schedule = await HousekeepingSchedule.findById(req.params.id)
      .populate("room", "number floor building status")
      .populate("assigned_to", "name")

    if (!schedule) {
      return res.status(404).json({ success: false, message: "Housekeeping schedule not found" })
    }

    res.status(200).json({ success: true, data: schedule })
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch housekeeping schedule", error: error.message })
  }
}

// Create new housekeeping schedule
export const createHousekeepingSchedule = async (req, res) => {
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

    const newSchedule = new HousekeepingSchedule({
      ...req.body,
      createdBy: req.user.id,
      updatedBy: req.user.id,
    })

    const savedSchedule = await newSchedule.save()

    // Update room status to cleaning if needed
    if (req.body.updateRoomStatus && room.status === "available") {
      room.status = "cleaning"
      room.updatedBy = req.user.id
      await room.save()
    }

    res.status(201).json({ success: true, data: savedSchedule })
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to create housekeeping schedule", error: error.message })
  }
}

// Update housekeeping schedule
export const updateHousekeepingSchedule = async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() })
  }

  try {
    const schedule = await HousekeepingSchedule.findById(req.params.id)
    if (!schedule) {
      return res.status(404).json({ success: false, message: "Housekeeping schedule not found" })
    }

    const updatedSchedule = await HousekeepingSchedule.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        updatedBy: req.user.id,
      },
      { new: true, runValidators: true },
    )

    // If status changed to completed, update room status back to available
    if (req.body.status === "completed" && schedule.status !== "completed") {
      const room = await Room.findById(schedule.room)
      if (room && room.status === "cleaning") {
        room.status = "available"
        room.updatedBy = req.user.id
        await room.save()
      }
    }

    res.status(200).json({ success: true, data: updatedSchedule })
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update housekeeping schedule", error: error.message })
  }
}

// Delete housekeeping schedule
export const deleteHousekeepingSchedule = async (req, res) => {
  try {
    const schedule = await HousekeepingSchedule.findById(req.params.id)
    if (!schedule) {
      return res.status(404).json({ success: false, message: "Housekeeping schedule not found" })
    }

    await schedule.deleteOne()
    res.status(200).json({ success: true, message: "Housekeeping schedule deleted successfully" })
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to delete housekeeping schedule", error: error.message })
  }
}

// Assign housekeeping schedule
export const assignHousekeepingSchedule = async (req, res) => {
  const { assignedTo } = req.body

  if (!assignedTo) {
    return res.status(400).json({ success: false, message: "Assigned user ID is required" })
  }

  try {
    const schedule = await HousekeepingSchedule.findById(req.params.id)
    if (!schedule) {
      return res.status(404).json({ success: false, message: "Housekeeping schedule not found" })
    }

    schedule.assigned_to = assignedTo
    schedule.updatedBy = req.user.id

    await schedule.save()

    res.status(200).json({ success: true, data: schedule })
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to assign housekeeping schedule", error: error.message })
  }
}

// Bulk create housekeeping schedules
export const bulkCreateHousekeepingSchedules = async (req, res) => {
  const { schedules } = req.body

  if (!schedules || !Array.isArray(schedules) || schedules.length === 0) {
    return res.status(400).json({ success: false, message: "Valid schedules array is required" })
  }

  try {
    // Prepare schedules with user info
    const preparedSchedules = schedules.map((schedule) => ({
      ...schedule,
      createdBy: req.user.id,
      updatedBy: req.user.id,
    }))

    const createdSchedules = await HousekeepingSchedule.insertMany(preparedSchedules)

    res.status(201).json({
      success: true,
      count: createdSchedules.length,
      data: createdSchedules,
    })
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to create housekeeping schedules", error: error.message })
  }
}

// Get housekeeping statistics
export const getHousekeepingStats = async (req, res) => {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const stats = await HousekeepingSchedule.aggregate([
      {
        $facet: {
          byStatus: [
            {
              $group: {
                _id: "$status",
                count: { $sum: 1 },
              },
            },
          ],
          today: [
            {
              $match: {
                schedule_date: {
                  $gte: today,
                  $lt: tomorrow,
                },
              },
            },
            {
              $group: {
                _id: "$status",
                count: { $sum: 1 },
              },
            },
          ],
        },
      },
    ])

    // Transform to a more user-friendly format
    const formattedStats = {
      total: 0,
      pending: 0,
      in_progress: 0,
      completed: 0,
      today: {
        total: 0,
        pending: 0,
        in_progress: 0,
        completed: 0,
      },
    }

    // Process overall stats
    stats[0].byStatus.forEach((stat) => {
      formattedStats[stat._id] = stat.count
      formattedStats.total += stat.count
    })

    // Process today's stats
    stats[0].today.forEach((stat) => {
      formattedStats.today[stat._id] = stat.count
      formattedStats.today.total += stat.count
    })

    res.status(200).json({ success: true, data: formattedStats })
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch housekeeping statistics", error: error.message })
  }
}

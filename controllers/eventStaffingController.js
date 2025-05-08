import EventStaffing from "../models/EventStaffing.js"
import EventBooking from "../models/EventBooking.js"
import User from "../models/User.js"
import { successResponse, errorResponse } from "../utils/responseHandler.js"

/**
 * Get all staff assignments
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getAllStaffAssignments = async (req, res) => {
  try {
    const { hotel, event, staff, date, status, limit = 20, page = 1 } = req.query
    const skip = (page - 1) * limit

    const query = {}
    if (hotel) query.hotel = hotel
    if (event) query.event = event
    if (staff) query.staff = staff
    if (status) query.status = status

    if (date) {
      const searchDate = new Date(date)
      query.date = {
        $gte: new Date(searchDate.setHours(0, 0, 0, 0)),
        $lte: new Date(searchDate.setHours(23, 59, 59, 999)),
      }
    }

    const staffAssignments = await EventStaffing.find(query)
      .populate("event", "eventName startDate endDate venue")
      .populate("staff", "firstName lastName email role")
      .sort({ date: 1, startTime: 1 })
      .skip(skip)
      .limit(Number.parseInt(limit))

    const total = await EventStaffing.countDocuments(query)

    return successResponse(res, {
      staffAssignments,
      pagination: {
        total,
        page: Number.parseInt(page),
        pages: Math.ceil(total / limit),
        limit: Number.parseInt(limit),
      },
    })
  } catch (error) {
    return errorResponse(res, "Failed to fetch staff assignments", 500, error)
  }
}

/**
 * Get staff assignment by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getStaffAssignmentById = async (req, res) => {
  try {
    const staffAssignment = await EventStaffing.findById(req.params.id)
      .populate("event", "eventName startDate endDate venue status")
      .populate({
        path: "event",
        populate: {
          path: "venue",
          select: "name location",
        },
      })
      .populate("staff", "firstName lastName email phone role")
      .populate("createdBy", "firstName lastName")
      .populate("updatedBy", "firstName lastName")

    if (!staffAssignment) {
      return errorResponse(res, "Staff assignment not found", 404)
    }

    return successResponse(res, { staffAssignment })
  } catch (error) {
    return errorResponse(res, "Failed to fetch staff assignment", 500, error)
  }
}

/**
 * Create new staff assignment
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const createStaffAssignment = async (req, res) => {
  try {
    const { event, staff, date, startTime, endTime, role, notes } = req.body

    // Validate event exists
    const eventExists = await EventBooking.findById(event)
    if (!eventExists) {
      return errorResponse(res, "Event not found", 404)
    }

    // Validate staff exists
    const staffExists = await User.findById(staff)
    if (!staffExists) {
      return errorResponse(res, "Staff member not found", 404)
    }

    // Check for scheduling conflicts
    const conflictingAssignment = await EventStaffing.findOne({
      staff,
      date,
      $or: [
        {
          startTime: { $lte: startTime },
          endTime: { $gt: startTime },
        },
        {
          startTime: { $lt: endTime },
          endTime: { $gte: endTime },
        },
        {
          startTime: { $gte: startTime },
          endTime: { $lte: endTime },
        },
      ],
    })

    if (conflictingAssignment) {
      return errorResponse(res, "Staff member already has an assignment during this time", 400)
    }

    const newStaffAssignment = new EventStaffing({
      event,
      staff,
      hotel: eventExists.hotel,
      date,
      startTime,
      endTime,
      role,
      notes,
      createdBy: req.user._id,
    })

    await newStaffAssignment.save()

    return successResponse(res, { staffAssignment: newStaffAssignment }, 201)
  } catch (error) {
    return errorResponse(res, "Failed to create staff assignment", 500, error)
  }
}

/**
 * Update staff assignment
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const updateStaffAssignment = async (req, res) => {
  try {
    const { staff, date, startTime, endTime } = req.body

    // Check for scheduling conflicts if changing staff, date, or time
    if (staff || date || startTime || endTime) {
      const currentAssignment = await EventStaffing.findById(req.params.id)
      if (!currentAssignment) {
        return errorResponse(res, "Staff assignment not found", 404)
      }

      const conflictQuery = {
        staff: staff || currentAssignment.staff,
        date: date || currentAssignment.date,
        _id: { $ne: req.params.id },
        $or: [
          {
            startTime: { $lte: startTime || currentAssignment.startTime },
            endTime: { $gt: startTime || currentAssignment.startTime },
          },
          {
            startTime: { $lt: endTime || currentAssignment.endTime },
            endTime: { $gte: endTime || currentAssignment.endTime },
          },
          {
            startTime: { $gte: startTime || currentAssignment.startTime },
            endTime: { $lte: endTime || currentAssignment.endTime },
          },
        ],
      }

      const conflictingAssignment = await EventStaffing.findOne(conflictQuery)

      if (conflictingAssignment) {
        return errorResponse(res, "Staff member already has an assignment during this time", 400)
      }
    }

    // Add user ID to updated by field
    req.body.updatedBy = req.user._id

    const staffAssignment = await EventStaffing.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true },
    )
      .populate("event", "eventName startDate endDate")
      .populate("staff", "firstName lastName email")

    if (!staffAssignment) {
      return errorResponse(res, "Staff assignment not found", 404)
    }

    return successResponse(res, { staffAssignment })
  } catch (error) {
    return errorResponse(res, "Failed to update staff assignment", 500, error)
  }
}

/**
 * Delete staff assignment
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const deleteStaffAssignment = async (req, res) => {
  try {
    const staffAssignment = await EventStaffing.findByIdAndDelete(req.params.id)

    if (!staffAssignment) {
      return errorResponse(res, "Staff assignment not found", 404)
    }

    return successResponse(res, { message: "Staff assignment deleted successfully" })
  } catch (error) {
    return errorResponse(res, "Failed to delete staff assignment", 500, error)
  }
}

/**
 * Get staff schedule
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getStaffSchedule = async (req, res) => {
  try {
    const { staffId } = req.params
    const { startDate, endDate } = req.query

    if (!startDate || !endDate) {
      return errorResponse(res, "Start date and end date are required", 400)
    }

    const schedule = await EventStaffing.find({
      staff: staffId,
      date: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    })
      .populate("event", "eventName startDate endDate venue")
      .populate({
        path: "event",
        populate: {
          path: "venue",
          select: "name location",
        },
      })
      .sort({ date: 1, startTime: 1 })

    // Group by date
    const scheduleByDate = {}
    schedule.forEach((assignment) => {
      const dateStr = assignment.date.toISOString().split("T")[0]
      if (!scheduleByDate[dateStr]) {
        scheduleByDate[dateStr] = []
      }
      scheduleByDate[dateStr].push(assignment)
    })

    return successResponse(res, {
      staffId,
      dateRange: {
        startDate,
        endDate,
      },
      schedule: scheduleByDate,
    })
  } catch (error) {
    return errorResponse(res, "Failed to fetch staff schedule", 500, error)
  }
}

/**
 * Get event staffing
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getEventStaffing = async (req, res) => {
  try {
    const { eventId } = req.params

    const staffing = await EventStaffing.find({ event: eventId })
      .populate("staff", "firstName lastName email phone role")
      .sort({ date: 1, startTime: 1 })

    // Get event details
    const event = await EventBooking.findById(eventId).populate("venue", "name location").populate("eventType", "name")

    if (!event) {
      return errorResponse(res, "Event not found", 404)
    }

    // Group by date and role
    const staffingByDate = {}
    staffing.forEach((assignment) => {
      const dateStr = assignment.date.toISOString().split("T")[0]
      if (!staffingByDate[dateStr]) {
        staffingByDate[dateStr] = {}
      }

      if (!staffingByDate[dateStr][assignment.role]) {
        staffingByDate[dateStr][assignment.role] = []
      }

      staffingByDate[dateStr][assignment.role].push(assignment)
    })

    return successResponse(res, {
      event: {
        _id: event._id,
        eventName: event.eventName,
        startDate: event.startDate,
        endDate: event.endDate,
        venue: event.venue,
        eventType: event.eventType,
      },
      staffing: staffingByDate,
    })
  } catch (error) {
    return errorResponse(res, "Failed to fetch event staffing", 500, error)
  }
}

/**
 * Update staff assignment status
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const updateAssignmentStatus = async (req, res) => {
  try {
    const { status, checkInTime, checkOutTime, notes } = req.body

    if (!status) {
      return errorResponse(res, "Status is required", 400)
    }

    const updateData = {
      status,
      updatedBy: req.user._id,
    }

    if (status === "checked-in" && !checkInTime) {
      updateData.checkInTime = new Date()
    } else if (checkInTime) {
      updateData.checkInTime = checkInTime
    }

    if (status === "completed" && !checkOutTime) {
      updateData.checkOutTime = new Date()
    } else if (checkOutTime) {
      updateData.checkOutTime = checkOutTime
    }

    if (notes) {
      updateData.notes = notes
    }

    const staffAssignment = await EventStaffing.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true },
    )

    if (!staffAssignment) {
      return errorResponse(res, "Staff assignment not found", 404)
    }

    return successResponse(res, { staffAssignment })
  } catch (error) {
    return errorResponse(res, "Failed to update assignment status", 500, error)
  }
}

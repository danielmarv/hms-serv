import EventStaffing from "../models/EventStaffing.js"
import User from "../models/User.js"
import Event from "../models/Event.js"
import { successResponse, errorResponse } from "../utils/responseHandler.js"

// Get all staff assignments
export const getAllStaffAssignments = async (req, res) => {
  try {
    const staffing = await EventStaffing.find()
      .populate("event", "name startDate endDate")
      .populate("staff", "name email role")
      .populate("assignedBy", "name email")

    return successResponse(res, {
      message: "Staff assignments retrieved successfully",
      data: staffing,
    })
  } catch (error) {
    return errorResponse(res, "Failed to retrieve staff assignments", 500, error)
  }
}

// Get staff assignment by ID
export const getStaffAssignmentById = async (req, res) => {
  try {
    const staffing = await EventStaffing.findById(req.params.id)
      .populate("event", "name startDate endDate")
      .populate("staff", "name email role")
      .populate("assignedBy", "name email")

    if (!staffing) {
      return errorResponse(res, "Staff assignment not found", 404)
    }

    return successResponse(res, {
      message: "Staff assignment retrieved successfully",
      data: staffing,
    })
  } catch (error) {
    return errorResponse(res, "Failed to retrieve staff assignment", 500, error)
  }
}

// Create new staff assignment
export const createStaffAssignment = async (req, res) => {
  try {
    const { event, staff, role, startTime, endTime, notes } = req.body

    // Verify the event exists
    const eventExists = await Event.findById(event)
    if (!eventExists) {
      return errorResponse(res, "Event not found", 404)
    }

    // Verify the staff member exists
    const staffExists = await User.findById(staff)
    if (!staffExists) {
      return errorResponse(res, "Staff member not found", 404)
    }

    const staffing = await EventStaffing.create({
      event,
      staff,
      role,
      startTime,
      endTime,
      notes,
      assignedBy: req.user.id,
    })

    return successResponse(
      res,
      {
        message: "Staff assigned successfully",
        data: staffing,
      },
      201,
    )
  } catch (error) {
    return errorResponse(res, "Failed to create staff assignment", 500, error)
  }
}

// Update staff assignment
export const updateStaffAssignment = async (req, res) => {
  try {
    const { role, startTime, endTime, notes, status } = req.body

    const staffing = await EventStaffing.findById(req.params.id)

    if (!staffing) {
      return errorResponse(res, "Staff assignment not found", 404)
    }

    staffing.role = role || staffing.role
    staffing.startTime = startTime || staffing.startTime
    staffing.endTime = endTime || staffing.endTime
    staffing.notes = notes || staffing.notes
    staffing.status = status || staffing.status

    await staffing.save()

    return successResponse(res, {
      message: "Staff assignment updated successfully",
      data: staffing,
    })
  } catch (error) {
    return errorResponse(res, "Failed to update staff assignment", 500, error)
  }
}

// Delete staff assignment
export const deleteStaffAssignment = async (req, res) => {
  try {
    const staffing = await EventStaffing.findById(req.params.id)

    if (!staffing) {
      return errorResponse(res, "Staff assignment not found", 404)
    }

    await staffing.deleteOne()

    return successResponse(res, {
      message: "Staff assignment deleted successfully",
    })
  } catch (error) {
    return errorResponse(res, "Failed to delete staff assignment", 500, error)
  }
}

// Get all staff assignments for a specific event
export const getEventStaffing = async (req, res) => {
  try {
    const { eventId } = req.params

    const staffing = await EventStaffing.find({ event: eventId })
      .populate("staff", "name email role")
      .populate("assignedBy", "name email")

    return successResponse(res, {
      message: "Event staffing retrieved successfully",
      data: staffing,
    })
  } catch (error) {
    return errorResponse(res, "Failed to retrieve event staffing", 500, error)
  }
}

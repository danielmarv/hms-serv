const EventType = require("../models/EventType")
const EventBooking = require("../models/EventBooking")
const { successResponse, errorResponse } = require("../utils/responseHandler")
const mongoose = require("mongoose")

/**
 * Get all event types
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getAllEventTypes = async (req, res) => {
  try {
    const { isActive, hotel, sortBy, limit = 20, page = 1 } = req.query
    const skip = (page - 1) * limit

    // Build query
    const query = {}
    if (isActive !== undefined) query.isActive = isActive === "true"
    if (hotel) query.hotel = hotel

    // Build sort options
    const sortOptions = {}
    if (sortBy) {
      const [field, order] = sortBy.split(":")
      sortOptions[field] = order === "desc" ? -1 : 1
    } else {
      sortOptions.name = 1 // Default sort by name ascending
    }

    const eventTypes = await EventType.find(query).sort(sortOptions).skip(skip).limit(Number.parseInt(limit))

    const total = await EventType.countDocuments(query)

    return successResponse(res, {
      eventTypes,
      pagination: {
        total,
        page: Number.parseInt(page),
        pages: Math.ceil(total / limit),
        limit: Number.parseInt(limit),
      },
    })
  } catch (error) {
    return errorResponse(res, "Failed to fetch event types", 500, error)
  }
}

/**
 * Get event type by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getEventTypeById = async (req, res) => {
  try {
    const eventType = await EventType.findById(req.params.id)

    if (!eventType) {
      return errorResponse(res, "Event type not found", 404)
    }

    return successResponse(res, { eventType })
  } catch (error) {
    return errorResponse(res, "Failed to fetch event type", 500, error)
  }
}

/**
 * Create new event type
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.createEventType = async (req, res) => {
  try {
    // Add user ID to created by field
    req.body.createdBy = req.user._id

    const newEventType = new EventType(req.body)
    await newEventType.save()

    return successResponse(res, { eventType: newEventType }, 201)
  } catch (error) {
    return errorResponse(res, "Failed to create event type", 500, error)
  }
}

/**
 * Update event type
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.updateEventType = async (req, res) => {
  try {
    // Add user ID to updated by field
    req.body.updatedBy = req.user._id

    const eventType = await EventType.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true },
    )

    if (!eventType) {
      return errorResponse(res, "Event type not found", 404)
    }

    return successResponse(res, { eventType })
  } catch (error) {
    return errorResponse(res, "Failed to update event type", 500, error)
  }
}

/**
 * Delete event type
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.deleteEventType = async (req, res) => {
  try {
    // Check if event type is used in any bookings
    const bookings = await EventBooking.find({
      eventType: req.params.id,
      status: { $in: ["confirmed", "pending"] },
    })

    if (bookings.length > 0) {
      return errorResponse(res, "Cannot delete event type as it is used in active bookings", 400)
    }

    const eventType = await EventType.findByIdAndDelete(req.params.id)

    if (!eventType) {
      return errorResponse(res, "Event type not found", 404)
    }

    return successResponse(res, { message: "Event type deleted successfully" })
  } catch (error) {
    return errorResponse(res, "Failed to delete event type", 500, error)
  }
}

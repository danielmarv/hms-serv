const EventVenue = require("../models/EventVenue")
const EventBooking = require("../models/EventBooking")
const { successResponse, errorResponse } = require("../utils/responseHandler")

/**
 * Get all event venues
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getAllEventVenues = async (req, res) => {
  try {
    const { venueType, capacity, isActive, hotel, sortBy, limit = 20, page = 1 } = req.query

    const skip = (page - 1) * limit

    // Build query
    const query = {}
    if (venueType) query.venueType = venueType
    if (capacity) query.capacity = { $gte: Number.parseInt(capacity) }
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

    const venues = await EventVenue.find(query).sort(sortOptions).skip(skip).limit(Number.parseInt(limit))

    const total = await EventVenue.countDocuments(query)

    return successResponse(res, {
      venues,
      pagination: {
        total,
        page: Number.parseInt(page),
        pages: Math.ceil(total / limit),
        limit: Number.parseInt(limit),
      },
    })
  } catch (error) {
    return errorResponse(res, "Failed to fetch event venues", 500, error)
  }
}

/**
 * Get event venue by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getEventVenueById = async (req, res) => {
  try {
    const venue = await EventVenue.findById(req.params.id)

    if (!venue) {
      return errorResponse(res, "Event venue not found", 404)
    }

    return successResponse(res, { venue })
  } catch (error) {
    return errorResponse(res, "Failed to fetch event venue", 500, error)
  }
}

/**
 * Create new event venue
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.createEventVenue = async (req, res) => {
  try {
    // Add user ID to created by field
    req.body.createdBy = req.user._id

    const newVenue = new EventVenue(req.body)
    await newVenue.save()

    return successResponse(res, { venue: newVenue }, 201)
  } catch (error) {
    return errorResponse(res, "Failed to create event venue", 500, error)
  }
}

/**
 * Update event venue
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.updateEventVenue = async (req, res) => {
  try {
    // Add user ID to updated by field
    req.body.updatedBy = req.user._id

    const venue = await EventVenue.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true },
    )

    if (!venue) {
      return errorResponse(res, "Event venue not found", 404)
    }

    return successResponse(res, { venue })
  } catch (error) {
    return errorResponse(res, "Failed to update event venue", 500, error)
  }
}

/**
 * Delete event venue
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.deleteEventVenue = async (req, res) => {
  try {
    // Check if venue has any bookings
    const bookings = await EventBooking.find({
      venue: req.params.id,
      status: { $in: ["confirmed", "pending"] },
    })

    if (bookings.length > 0) {
      return errorResponse(res, "Cannot delete venue as it has active bookings", 400)
    }

    const venue = await EventVenue.findByIdAndDelete(req.params.id)

    if (!venue) {
      return errorResponse(res, "Event venue not found", 404)
    }

    return successResponse(res, { message: "Event venue deleted successfully" })
  } catch (error) {
    return errorResponse(res, "Failed to delete event venue", 500, error)
  }
}

/**
 * Get venue availability
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getVenueAvailability = async (req, res) => {
  try {
    const { id } = req.params
    const { startDate, endDate } = req.query

    // Validate date range
    if (!startDate || !endDate) {
      return errorResponse(res, "Start date and end date are required", 400)
    }

    const start = new Date(startDate)
    const end = new Date(endDate)

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return errorResponse(res, "Invalid date format", 400)
    }

    if (start > end) {
      return errorResponse(res, "Start date must be before end date", 400)
    }

    // Find venue
    const venue = await EventVenue.findById(id)
    if (!venue) {
      return errorResponse(res, "Event venue not found", 404)
    }

    // Find bookings in the date range
    const bookings = await EventBooking.find({
      venue: id,
      status: { $in: ["confirmed", "pending"] },
      $or: [
        // Booking starts during the range
        { startTime: { $gte: start, $lte: end } },
        // Booking ends during the range
        { endTime: { $gte: start, $lte: end } },
        // Booking spans the entire range
        { startTime: { $lte: start }, endTime: { $gte: end } },
      ],
    }).populate("eventType")

    // Generate availability slots (1-hour increments)
    const slots = []
    const currentDate = new Date(start)

    while (currentDate < end) {
      const slotStart = new Date(currentDate)
      const slotEnd = new Date(currentDate)
      slotEnd.setHours(slotEnd.getHours() + 1)

      // Check if slot is available
      const isAvailable = !bookings.some((booking) => {
        return (
          (slotStart >= booking.startTime && slotStart < booking.endTime) ||
          (slotEnd > booking.startTime && slotEnd <= booking.endTime) ||
          (slotStart <= booking.startTime && slotEnd >= booking.endTime)
        )
      })

      slots.push({
        start: slotStart,
        end: slotEnd,
        isAvailable,
      })

      // Move to next hour
      currentDate.setHours(currentDate.getHours() + 1)
    }

    return successResponse(res, {
      venue: {
        id: venue._id,
        name: venue.name,
        capacity: venue.capacity,
      },
      bookings: bookings.map((booking) => ({
        id: booking._id,
        eventType: booking.eventType.name,
        start: booking.startTime,
        end: booking.endTime,
        status: booking.status,
      })),
      availability: slots,
    })
  } catch (error) {
    return errorResponse(res, "Failed to get venue availability", 500, error)
  }
}

/**
 * Get venue bookings
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getVenueBookings = async (req, res) => {
  try {
    const { id } = req.params
    const { status, startDate, endDate } = req.query

    // Build query
    const query = { venue: id }

    if (status) {
      query.status = status
    }

    if (startDate && endDate) {
      const start = new Date(startDate)
      const end = new Date(endDate)

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return errorResponse(res, "Invalid date format", 400)
      }

      query.$or = [
        // Booking starts during the range
        { startTime: { $gte: start, $lte: end } },
        // Booking ends during the range
        { endTime: { $gte: start, $lte: end } },
        // Booking spans the entire range
        { startTime: { $lte: start }, endTime: { $gte: end } },
      ]
    }

    const bookings = await EventBooking.find(query).populate("eventType").populate("customer").sort({ startTime: 1 })

    return successResponse(res, { bookings })
  } catch (error) {
    return errorResponse(res, "Failed to get venue bookings", 500, error)
  }
}

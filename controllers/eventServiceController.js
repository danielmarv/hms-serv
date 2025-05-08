const EventService = require("../models/EventService")
const EventBooking = require("../models/EventBooking")
const { successResponse, errorResponse } = require("../utils/responseHandler")
const mongoose = require("mongoose")

/**
 * Get all event services
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getAllEventServices = async (req, res) => {
  try {
    const { category, available, sortBy, limit = 20, page = 1 } = req.query
    const skip = (page - 1) * limit

    // Build query
    const query = {}
    if (category) query.category = category
    if (available === "true") query.isAvailable = true

    // Build sort options
    const sortOptions = {}
    if (sortBy) {
      const [field, order] = sortBy.split(":")
      sortOptions[field] = order === "desc" ? -1 : 1
    } else {
      sortOptions.name = 1 // Default sort by name ascending
    }

    const services = await EventService.find(query).sort(sortOptions).skip(skip).limit(Number.parseInt(limit))

    const total = await EventService.countDocuments(query)

    return successResponse(res, {
      services,
      pagination: {
        total,
        page: Number.parseInt(page),
        pages: Math.ceil(total / limit),
        limit: Number.parseInt(limit),
      },
    })
  } catch (error) {
    return errorResponse(res, "Failed to fetch event services", 500, error)
  }
}

/**
 * Get event service by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getEventServiceById = async (req, res) => {
  try {
    const service = await EventService.findById(req.params.id)

    if (!service) {
      return errorResponse(res, "Event service not found", 404)
    }

    return successResponse(res, { service })
  } catch (error) {
    return errorResponse(res, "Failed to fetch event service", 500, error)
  }
}

/**
 * Create new event service
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.createEventService = async (req, res) => {
  try {
    const newService = new EventService(req.body)
    await newService.save()

    return successResponse(res, { service: newService }, 201)
  } catch (error) {
    return errorResponse(res, "Failed to create event service", 500, error)
  }
}

/**
 * Update event service
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.updateEventService = async (req, res) => {
  try {
    const service = await EventService.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true },
    )

    if (!service) {
      return errorResponse(res, "Event service not found", 404)
    }

    return successResponse(res, { service })
  } catch (error) {
    return errorResponse(res, "Failed to update event service", 500, error)
  }
}

/**
 * Delete event service
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.deleteEventService = async (req, res) => {
  try {
    // Check if service is used in any active bookings
    const activeBookings = await EventBooking.find({
      "services.service": req.params.id,
      status: { $in: ["confirmed", "pending"] },
    })

    if (activeBookings.length > 0) {
      return errorResponse(res, "Cannot delete service as it is used in active bookings", 400)
    }

    const service = await EventService.findByIdAndDelete(req.params.id)

    if (!service) {
      return errorResponse(res, "Event service not found", 404)
    }

    return successResponse(res, { message: "Event service deleted successfully" })
  } catch (error) {
    return errorResponse(res, "Failed to delete event service", 500, error)
  }
}

/**
 * Get services by category
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getServicesByCategory = async (req, res) => {
  try {
    const { category } = req.params
    const services = await EventService.find({ category })

    return successResponse(res, { services })
  } catch (error) {
    return errorResponse(res, "Failed to fetch services by category", 500, error)
  }
}

/**
 * Add service to event booking
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.addServiceToBooking = async (req, res) => {
  try {
    const { bookingId } = req.params
    const { serviceId, quantity, specialRequests } = req.body

    // Validate inputs
    if (!serviceId || !quantity) {
      return errorResponse(res, "Service ID and quantity are required", 400)
    }

    // Start a session for transaction
    const session = await mongoose.startSession()
    session.startTransaction()

    try {
      // Find the service
      const service = await EventService.findById(serviceId).session(session)
      if (!service) {
        await session.abortTransaction()
        session.endSession()
        return errorResponse(res, "Service not found", 404)
      }

      if (!service.isAvailable) {
        await session.abortTransaction()
        session.endSession()
        return errorResponse(res, "Service is not available", 400)
      }

      // Find the booking
      const booking = await EventBooking.findById(bookingId).session(session)
      if (!booking) {
        await session.abortTransaction()
        session.endSession()
        return errorResponse(res, "Booking not found", 404)
      }

      // Check if service already exists in booking
      const existingServiceIndex = booking.services.findIndex((s) => s.service.toString() === serviceId)

      if (existingServiceIndex !== -1) {
        // Update existing service
        booking.services[existingServiceIndex].quantity += Number.parseInt(quantity)
        booking.services[existingServiceIndex].specialRequests = specialRequests
      } else {
        // Add new service
        booking.services.push({
          service: serviceId,
          quantity: Number.parseInt(quantity),
          price: service.price,
          specialRequests,
        })
      }

      // Recalculate total price
      booking.totalAmount = booking.basePrice + booking.services.reduce((total, s) => total + s.price * s.quantity, 0)

      await booking.save({ session })

      await session.commitTransaction()
      session.endSession()

      // Return updated booking with populated services
      const updatedBooking = await EventBooking.findById(bookingId)
        .populate("venue")
        .populate("eventType")
        .populate("customer")
        .populate("services.service")

      return successResponse(res, { booking: updatedBooking })
    } catch (error) {
      await session.abortTransaction()
      session.endSession()
      throw error
    }
  } catch (error) {
    return errorResponse(res, "Failed to add service to booking", 500, error)
  }
}

/**
 * Remove service from event booking
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.removeServiceFromBooking = async (req, res) => {
  try {
    const { bookingId, serviceId } = req.params

    // Find the booking
    const booking = await EventBooking.findById(bookingId)
    if (!booking) {
      return errorResponse(res, "Booking not found", 404)
    }

    // Check if booking is already completed
    if (booking.status === "completed") {
      return errorResponse(res, "Cannot modify a completed booking", 400)
    }

    // Find the service in the booking
    const serviceIndex = booking.services.findIndex((s) => s.service.toString() === serviceId)

    if (serviceIndex === -1) {
      return errorResponse(res, "Service not found in this booking", 404)
    }

    // Remove the service
    booking.services.splice(serviceIndex, 1)

    // Recalculate total price
    booking.totalAmount = booking.basePrice + booking.services.reduce((total, s) => total + s.price * s.quantity, 0)

    await booking.save()

    // Return updated booking with populated services
    const updatedBooking = await EventBooking.findById(bookingId)
      .populate("venue")
      .populate("eventType")
      .populate("customer")
      .populate("services.service")

    return successResponse(res, { booking: updatedBooking })
  } catch (error) {
    return errorResponse(res, "Failed to remove service from booking", 500, error)
  }
}

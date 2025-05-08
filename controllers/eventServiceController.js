// Convert to ES modules and standardize error handling
import EventService from "../models/EventService.js"
import EventBooking from "../models/EventBooking.js"
import { ApiError } from "../utils/apiError.js"
import { ApiResponse } from "../utils/apiResponse.js"
import mongoose from "mongoose"

/**
 * @desc    Get all event services
 * @route   GET /api/events/services
 * @access  Private
 */
export const getAllEventServices = async (req, res, next) => {
  try {
    const { category, available, sortBy, limit = 20, page = 1 } = req.query
    const skip = (page - 1) * limit

    // Build query
    const query = { isDeleted: false }
    if (category) query.category = category
    if (available === "true") query.status = "active"

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

    res.status(200).json(
      new ApiResponse(
        200,
        {
          services,
          pagination: {
            total,
            page: Number.parseInt(page),
            pages: Math.ceil(total / limit),
            limit: Number.parseInt(limit),
          },
        },
        "Event services retrieved successfully",
      ),
    )
  } catch (error) {
    next(error)
  }
}

/**
 * @desc    Get event service by ID
 * @route   GET /api/events/services/:id
 * @access  Private
 */
export const getEventServiceById = async (req, res, next) => {
  try {
    const service = await EventService.findOne({ _id: req.params.id, isDeleted: false })

    if (!service) {
      throw new ApiError("Event service not found", 404)
    }

    res.status(200).json(new ApiResponse(200, { service }, "Event service retrieved successfully"))
  } catch (error) {
    next(error)
  }
}

/**
 * @desc    Create new event service
 * @route   POST /api/events/services
 * @access  Private
 */
export const createEventService = async (req, res, next) => {
  try {
    // Add user ID to created by field
    req.body.createdBy = req.user._id

    const newService = new EventService(req.body)
    await newService.save()

    res.status(201).json(new ApiResponse(201, { service: newService }, "Event service created successfully"))
  } catch (error) {
    next(error)
  }
}

/**
 * @desc    Update event service
 * @route   PUT /api/events/services/:id
 * @access  Private
 */
export const updateEventService = async (req, res, next) => {
  try {
    // Add user ID to updated by field
    req.body.updatedBy = req.user._id

    const service = await EventService.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      { $set: req.body },
      { new: true, runValidators: true },
    )

    if (!service) {
      throw new ApiError("Event service not found", 404)
    }

    res.status(200).json(new ApiResponse(200, { service }, "Event service updated successfully"))
  } catch (error) {
    next(error)
  }
}

/**
 * @desc    Delete event service
 * @route   DELETE /api/events/services/:id
 * @access  Private
 */
export const deleteEventService = async (req, res, next) => {
  try {
    // Check if service is used in any active bookings
    const activeBookings = await EventBooking.find({
      "services.service": req.params.id,
      status: { $in: ["confirmed", "pending"] },
      isDeleted: false,
    })

    if (activeBookings.length > 0) {
      throw new ApiError("Cannot delete service as it is used in active bookings", 400)
    }

    // Soft delete
    const service = await EventService.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      { isDeleted: true, updatedBy: req.user._id },
      { new: true },
    )

    if (!service) {
      throw new ApiError("Event service not found", 404)
    }

    res.status(200).json(new ApiResponse(200, null, "Event service deleted successfully"))
  } catch (error) {
    next(error)
  }
}

/**
 * @desc    Get services by category
 * @route   GET /api/events/services/category/:category
 * @access  Private
 */
export const getServicesByCategory = async (req, res, next) => {
  try {
    const { category } = req.params
    const services = await EventService.find({ category, isDeleted: false })

    res.status(200).json(new ApiResponse(200, { services }, "Services retrieved successfully"))
  } catch (error) {
    next(error)
  }
}

/**
 * @desc    Add service to event booking
 * @route   POST /api/events/bookings/:bookingId/services
 * @access  Private
 */
export const addServiceToBooking = async (req, res, next) => {
  // Start a session for transaction
  const session = await mongoose.startSession()
  session.startTransaction()

  try {
    const { bookingId } = req.params
    const { serviceId, quantity, specialRequests } = req.body

    // Validate inputs
    if (!serviceId || !quantity) {
      throw new ApiError("Service ID and quantity are required", 400)
    }

    // Find the service
    const service = await EventService.findOne({ _id: serviceId, isDeleted: false }).session(session)
    if (!service) {
      await session.abortTransaction()
      session.endSession()
      throw new ApiError("Service not found", 404)
    }

    if (service.status !== "active") {
      await session.abortTransaction()
      session.endSession()
      throw new ApiError("Service is not available", 400)
    }

    // Find the booking
    const booking = await EventBooking.findOne({ _id: bookingId, isDeleted: false }).session(session)
    if (!booking) {
      await session.abortTransaction()
      session.endSession()
      throw new ApiError("Booking not found", 404)
    }

    // Check if booking is already completed or cancelled
    if (booking.status === "completed" || booking.status === "cancelled") {
      await session.abortTransaction()
      session.endSession()
      throw new ApiError(`Cannot modify a ${booking.status} booking`, 400)
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
    const servicesCost = booking.services.reduce((total, s) => total + s.price * s.quantity, 0)
    booking.pricing.servicesCost = servicesCost
    booking.pricing.totalBeforeTax =
      booking.pricing.venuePrice + servicesCost + booking.pricing.equipmentCost + booking.pricing.cateringCost
    booking.pricing.taxAmount = booking.pricing.totalBeforeTax * booking.pricing.taxRate
    booking.pricing.grandTotal = booking.pricing.totalBeforeTax + booking.pricing.taxAmount

    // Update payment balance
    booking.payment.balance = booking.pricing.grandTotal - booking.payment.amountPaid

    await booking.save({ session })

    await session.commitTransaction()
    session.endSession()

    // Return updated booking with populated services
    const updatedBooking = await EventBooking.findById(bookingId)
      .populate("venue", "name type")
      .populate("eventType", "name category")
      .populate("customer", "firstName lastName email phone")
      .populate("services.service", "name category price")

    res.status(200).json(new ApiResponse(200, { booking: updatedBooking }, "Service added to booking successfully"))
  } catch (error) {
    await session.abortTransaction()
    session.endSession()
    next(error)
  }
}

/**
 * @desc    Remove service from event booking
 * @route   DELETE /api/events/bookings/:bookingId/services/:serviceId
 * @access  Private
 */
export const removeServiceFromBooking = async (req, res, next) => {
  try {
    const { bookingId, serviceId } = req.params

    // Find the booking
    const booking = await EventBooking.findOne({ _id: bookingId, isDeleted: false })
    if (!booking) {
      throw new ApiError("Booking not found", 404)
    }

    // Check if booking is already completed or cancelled
    if (booking.status === "completed" || booking.status === "cancelled") {
      throw new ApiError(`Cannot modify a ${booking.status} booking`, 400)
    }

    // Find the service in the booking
    const serviceIndex = booking.services.findIndex((s) => s.service.toString() === serviceId)

    if (serviceIndex === -1) {
      throw new ApiError("Service not found in this booking", 404)
    }

    // Remove the service
    booking.services.splice(serviceIndex, 1)

    // Recalculate total price
    const servicesCost = booking.services.reduce((total, s) => total + s.price * s.quantity, 0)
    booking.pricing.servicesCost = servicesCost
    booking.pricing.totalBeforeTax =
      booking.pricing.venuePrice + servicesCost + booking.pricing.equipmentCost + booking.pricing.cateringCost
    booking.pricing.taxAmount = booking.pricing.totalBeforeTax * booking.pricing.taxRate
    booking.pricing.grandTotal = booking.pricing.totalBeforeTax + booking.pricing.taxAmount

    // Update payment balance
    booking.payment.balance = booking.pricing.grandTotal - booking.payment.amountPaid

    await booking.save()

    // Return updated booking with populated services
    const updatedBooking = await EventBooking.findById(bookingId)
      .populate("venue", "name type")
      .populate("eventType", "name category")
      .populate("customer", "firstName lastName email phone")
      .populate("services.service", "name category price")

    res.status(200).json(new ApiResponse(200, { booking: updatedBooking }, "Service removed from booking successfully"))
  } catch (error) {
    next(error)
  }
}

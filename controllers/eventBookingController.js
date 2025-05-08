import EventBooking from "../models/EventBooking.js"
import EventVenue from "../models/EventVenue.js"
import EventType from "../models/EventType.js"
import EventService from "../models/EventService.js"
import { ApiError } from "../utils/apiError.js"
import { ApiResponse } from "../utils/apiResponse.js"
import asyncHandler from "../utils/asyncHandler.js"
import mongoose from "mongoose"
import Event from "../models/Event.js"
// Guest model is used for customers
const Guest = mongoose.model("Guest")
import { successResponse, errorResponse } from "../utils/responseHandler.js"

/**
 * @desc    Create a new event booking
 * @route   POST /api/events/bookings
 * @access  Private
 */
export const createEventBooking = asyncHandler(async (req, res) => {
  const {
    hotel,
    venue,
    eventType,
    customer,
    title,
    description,
    startTime,
    endTime,
    attendees,
    services,
    venueSetup,
    catering,
    equipment,
  } = req.body

  // Validate required fields
  if (!hotel || !venue || !eventType || !customer || !title || !startTime || !endTime || !attendees) {
    throw new ApiError("Please provide all required fields", 400)
  }

  // Check if venue exists and is available
  const venueExists = await EventVenue.findOne({ _id: venue, isDeleted: false })
  if (!venueExists) {
    throw new ApiError("Venue not found", 404)
  }

  // Check venue availability
  try {
    await EventVenue.checkAvailability(venue, startTime, endTime)
  } catch (error) {
    throw new ApiError(error.message, error.statusCode || 400)
  }

  // Check if event type exists
  const eventTypeExists = await EventType.findOne({ _id: eventType, isActive: true, isDeleted: false })
  if (!eventTypeExists) {
    throw new ApiError("Event type not found", 404)
  }

  // Check if customer exists
  const customerExists = await Guest.findById(customer)
  if (!customerExists) {
    throw new ApiError("Customer not found", 404)
  }

  // Process services if provided
  const processedServices = []
  if (services && services.length > 0) {
    for (const service of services) {
      const serviceExists = await EventService.findOne({
        _id: service.service,
        hotel: hotel,
        status: "active",
        isDeleted: false,
      })

      if (!serviceExists) {
        throw new ApiError(`Service ${service.service} not found or not available`, 404)
      }

      processedServices.push({
        service: serviceExists._id,
        quantity: service.quantity || 1,
        specialRequests: service.specialRequests || "",
        price: serviceExists.price,
      })
    }
  }

  // Calculate venue pricing
  const startDate = new Date(startTime)
  const endDate = new Date(endTime)
  const durationHours = (endDate - startDate) / (1000 * 60 * 60)
  const venuePrice = venueExists.basePrice + venueExists.pricePerHour * durationHours

  // Calculate services cost
  const servicesCost = processedServices.reduce((total, service) => total + service.price * service.quantity, 0)

  // Calculate equipment cost (placeholder)
  let equipmentCost = 0
  if (equipment && equipment.length > 0) {
    equipmentCost = equipment.reduce((total, item) => total + item.price * item.quantity, 0)
  }

  // Calculate catering cost (placeholder)
  let cateringCost = 0
  if (catering && catering.isRequired && catering.headCount) {
    cateringCost = catering.headCount * 25 // Placeholder calculation
  }

  // Calculate tax
  let taxRate = 0.1 // Default 10%
  const Hotel = mongoose.model("Hotel")
  const hotelData = await Hotel.findById(hotel)
  if (hotelData && hotelData.configuration && hotelData.configuration.taxRate) {
    taxRate = hotelData.configuration.taxRate / 100
  }

  const totalBeforeTax = venuePrice + servicesCost + equipmentCost + cateringCost
  const taxAmount = totalBeforeTax * taxRate
  const grandTotal = totalBeforeTax + taxAmount

  // Create booking
  const booking = await EventBooking.create({
    hotel,
    venue,
    eventType,
    customer,
    title,
    description,
    startTime,
    endTime,
    attendees: {
      expected: attendees.expected,
    },
    services: processedServices,
    venueSetup: venueSetup || { layout: "theater" },
    catering: catering || { isRequired: false },
    equipment: equipment || [],
    pricing: {
      venuePrice,
      servicesCost,
      equipmentCost,
      cateringCost,
      taxRate,
      taxAmount,
      totalBeforeTax,
      grandTotal,
      additionalCosts: [],
      discounts: [],
    },
    payment: {
      status: "pending",
      depositRequired: true,
      depositAmount: grandTotal * 0.3, // 30% deposit
      depositPaid: false,
      amountPaid: 0,
      balance: grandTotal,
      transactions: [],
    },
    status: "pending",
    createdBy: req.user._id,
  })

  res.status(201).json(new ApiResponse(201, booking, "Event booking created successfully"))
})

/**
 * @desc    Get all event bookings
 * @route   GET /api/events/bookings
 * @access  Private
 */
export const getEventBookings = asyncHandler(async (req, res) => {
  const { hotel, venue, customer, status, startDate, endDate, paymentStatus, search } = req.query

  const page = Number.parseInt(req.query.page) || 1
  const limit = Number.parseInt(req.query.limit) || 10

  // Build query
  const query = { isDeleted: false }

  if (hotel) query.hotel = hotel
  if (venue) query.venue = venue
  if (customer) query.customer = customer
  if (status) query.status = status
  if (paymentStatus) query["payment.status"] = paymentStatus

  if (startDate && endDate) {
    query.$or = [
      {
        startTime: { $gte: new Date(startDate), $lte: new Date(endDate) },
      },
      {
        endTime: { $gte: new Date(startDate), $lte: new Date(endDate) },
      },
      {
        $and: [{ startTime: { $lte: new Date(startDate) } }, { endTime: { $gte: new Date(endDate) } }],
      },
    ]
  } else if (startDate) {
    query.startTime = { $gte: new Date(startDate) }
  } else if (endDate) {
    query.endTime = { $lte: new Date(endDate) }
  }

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
      { bookingNumber: { $regex: search, $options: "i" } },
    ]
  }

  // Execute query with pagination
  const total = await EventBooking.countDocuments(query)
  const bookings = await EventBooking.find(query)
    .populate("hotel", "name location")
    .populate("venue", "name type")
    .populate("eventType", "name category")
    .populate("customer", "firstName lastName email phone")
    .populate("createdBy", "firstName lastName")
    .sort({ startTime: 1 })
    .skip((page - 1) * limit)
    .limit(limit)

  // Calculate pagination info
  const totalPages = Math.ceil(total / limit)
  const hasNextPage = page < totalPages
  const hasPrevPage = page > 1

  res.status(200).json(
    new ApiResponse(
      200,
      {
        bookings,
        pagination: {
          total,
          page,
          limit,
          totalPages,
          hasNextPage,
          hasPrevPage,
        },
      },
      "Event bookings retrieved successfully",
    ),
  )
})

/**
 * @desc    Get a single event booking
 * @route   GET /api/events/bookings/:id
 * @access  Private
 */
export const getEventBooking = asyncHandler(async (req, res) => {
  const { id } = req.params

  const booking = await EventBooking.findOne({ _id: id, isDeleted: false })
    .populate("hotel", "name location")
    .populate("venue", "name type capacity")
    .populate("eventType", "name category")
    .populate("customer", "firstName lastName email phone")
    .populate("services.service", "name category price")
    .populate("staffAssignments.staff", "firstName lastName email")
    .populate("payment.transactions")
    .populate("createdBy", "firstName lastName")
    .populate("updatedBy", "firstName lastName")
    .populate("notes.createdBy", "firstName lastName")

  if (!booking) {
    throw new ApiError("Event booking not found", 404)
  }

  res.status(200).json(new ApiResponse(200, booking, "Event booking retrieved successfully"))
})

/**
 * @desc    Update an event booking
 * @route   PUT /api/events/bookings/:id
 * @access  Private
 */
export const updateEventBooking = asyncHandler(async (req, res) => {
  const { id } = req.params
  const updateData = req.body

  // Find booking
  const booking = await EventBooking.findOne({ _id: id, isDeleted: false })
  if (!booking) {
    throw new ApiError("Event booking not found", 404)
  }

  // Check if status is being changed to confirmed
  if (updateData.status === "confirmed" && booking.status !== "confirmed") {
    // Check if deposit is paid
    if (booking.payment.depositRequired && !booking.payment.depositPaid) {
      throw new ApiError("Cannot confirm booking until deposit is paid", 400)
    }

    // Re-check venue availability
    try {
      const startTime = updateData.startTime || booking.startTime
      const endTime = updateData.endTime || booking.endTime
      const venueId = updateData.venue || booking.venue

      // Only check availability if dates or venue changed
      if (updateData.startTime || updateData.endTime || updateData.venue) {
        await EventVenue.checkAvailability(venueId, startTime, endTime)
      }
    } catch (error) {
      throw new ApiError(error.message, error.statusCode || 400)
    }
  }

  // Update booking
  Object.keys(updateData).forEach((key) => {
    // Handle nested objects
    if (key === "payment" || key === "pricing" || key === "venueSetup" || key === "catering") {
      booking[key] = { ...booking[key], ...updateData[key] }
    } else {
      booking[key] = updateData[key]
    }
  })

  // Update the updatedBy field
  booking.updatedBy = req.user._id

  await booking.save()

  res.status(200).json(new ApiResponse(200, booking, "Event booking updated successfully"))
})

/**
 * @desc    Cancel an event booking
 * @route   PUT /api/events/bookings/:id/cancel
 * @access  Private
 */
export const cancelEventBooking = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { cancellationReason, refundAmount } = req.body

  if (!cancellationReason) {
    throw new ApiError("Cancellation reason is required", 400)
  }

  // Find booking
  const booking = await EventBooking.findOne({ _id: id, isDeleted: false })
  if (!booking) {
    throw new ApiError("Event booking not found", 404)
  }

  // Check if booking can be cancelled
  if (booking.status === "completed" || booking.status === "cancelled" || booking.status === "no_show") {
    throw new ApiError(`Cannot cancel booking with status: ${booking.status}`, 400)
  }

  // Calculate cancellation fee based on policy and time until event
  let cancellationFee = 0
  const now = new Date()
  const eventStart = new Date(booking.startTime)
  const daysUntilEvent = Math.ceil((eventStart - now) / (1000 * 60 * 60 * 24))

  // Get venue for cancellation policy
  const venue = await EventVenue.findById(booking.venue)
  const policy = venue ? venue.cancellationPolicy : "moderate"

  // Calculate cancellation fee based on policy
  if (policy === "strict") {
    if (daysUntilEvent <= 7) {
      cancellationFee = booking.pricing.grandTotal * 0.5 // 50% fee if within 7 days
    } else if (daysUntilEvent <= 14) {
      cancellationFee = booking.pricing.grandTotal * 0.3 // 30% fee if within 14 days
    } else {
      cancellationFee = booking.pricing.grandTotal * 0.1 // 10% fee if more than 14 days
    }
  } else if (policy === "moderate") {
    if (daysUntilEvent <= 3) {
      cancellationFee = booking.pricing.grandTotal * 0.3 // 30% fee if within 3 days
    } else if (daysUntilEvent <= 7) {
      cancellationFee = booking.pricing.grandTotal * 0.2 // 20% fee if within 7 days
    } else {
      cancellationFee = booking.pricing.grandTotal * 0.05 // 5% fee if more than 7 days
    }
  } else {
    // flexible
    if (daysUntilEvent <= 1) {
      cancellationFee = booking.pricing.grandTotal * 0.2 // 20% fee if within 1 day
    } else if (daysUntilEvent <= 3) {
      cancellationFee = booking.pricing.grandTotal * 0.1 // 10% fee if within 3 days
    } else {
      cancellationFee = 0 // No fee if more than 3 days
    }
  }

  // Calculate refund amount if not provided
  const calculatedRefundAmount = booking.payment.amountPaid - cancellationFee
  const finalRefundAmount = refundAmount !== undefined ? refundAmount : Math.max(0, calculatedRefundAmount)

  // Update booking
  booking.status = "cancelled"
  booking.cancellation = {
    isCancelled: true,
    cancelledBy: req.user._id,
    cancellationDate: new Date(),
    cancellationReason,
    refundAmount: finalRefundAmount,
    cancellationFee,
  }
  booking.payment.status = "cancelled"
  booking.updatedBy = req.user._id

  await booking.save()

  res.status(200).json(new ApiResponse(200, booking, "Event booking cancelled successfully"))
})

/**
 * @desc    Add a note to an event booking
 * @route   POST /api/events/bookings/:id/notes
 * @access  Private
 */
export const addBookingNote = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { content, isInternal = true } = req.body

  if (!content) {
    throw new ApiError("Note content is required", 400)
  }

  // Find booking
  const booking = await EventBooking.findOne({ _id: id, isDeleted: false })
  if (!booking) {
    throw new ApiError("Event booking not found", 404)
  }

  // Add note
  booking.notes.push({
    content,
    createdBy: req.user._id,
    createdAt: new Date(),
    isInternal,
  })

  await booking.save()

  res.status(200).json(new ApiResponse(200, booking, "Note added successfully"))
})

/**
 * @desc    Delete an event booking
 * @route   DELETE /api/events/bookings/:id
 * @access  Private (Admin)
 */
export const deleteEventBooking = asyncHandler(async (req, res) => {
  const { id } = req.params

  // Find booking
  const booking = await EventBooking.findOne({ _id: id, isDeleted: false })
  if (!booking) {
    throw new ApiError("Event booking not found", 404)
  }

  // Soft delete
  booking.isDeleted = true
  await booking.save()

  res.status(200).json(new ApiResponse(200, null, "Event booking deleted successfully"))
})

/**
 * Get all event bookings
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getAllEventBookings = async (req, res) => {
  try {
    const { status, venue, eventType, customer, startDate, endDate, hotel, sortBy, limit = 20, page = 1 } = req.query

    const skip = (page - 1) * limit

    // Build query
    const query = {}
    if (status) query.status = status
    if (venue) query.venue = venue
    if (eventType) query.eventType = eventType
    if (customer) query.customer = customer
    if (hotel) query.hotel = hotel

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

    // Build sort options
    const sortOptions = {}
    if (sortBy) {
      const [field, order] = sortBy.split(":")
      sortOptions[field] = order === "desc" ? -1 : 1
    } else {
      sortOptions.startTime = 1 // Default sort by start time ascending
    }

    const bookings = await EventBooking.find(query)
      .populate("venue")
      .populate("eventType")
      .populate("customer")
      .sort(sortOptions)
      .skip(skip)
      .limit(Number.parseInt(limit))

    const total = await EventBooking.countDocuments(query)

    return successResponse(res, {
      bookings,
      pagination: {
        total,
        page: Number.parseInt(page),
        pages: Math.ceil(total / limit),
        limit: Number.parseInt(limit),
      },
    })
  } catch (error) {
    return errorResponse(res, "Failed to fetch event bookings", 500, error)
  }
}

/**
 * Get event booking by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getEventBookingById = async (req, res) => {
  try {
    const booking = await EventBooking.findById(req.params.id)
      .populate("venue")
      .populate("eventType")
      .populate("customer")
      .populate("services.service")

    if (!booking) {
      return errorResponse(res, "Event booking not found", 404)
    }

    return successResponse(res, { booking })
  } catch (error) {
    return errorResponse(res, "Failed to fetch event booking", 500, error)
  }
}

/**
 * Create new event booking
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const createEventBooking2 = async (req, res) => {
  // Start a session for transaction
  const session = await mongoose.startSession()
  session.startTransaction()

  try {
    const {
      venue: venueId,
      eventType: eventTypeId,
      customer: customerId,
      startTime,
      endTime,
      attendees,
      services,
      specialRequests,
      status,
    } = req.body

    // Check if venue exists
    const venue = await EventVenue.findById(venueId).session(session)
    if (!venue) {
      await session.abortTransaction()
      session.endSession()
      return errorResponse(res, "Venue not found", 404)
    }

    // Check if venue is active
    if (!venue.isActive) {
      await session.abortTransaction()
      session.endSession()
      return errorResponse(res, "Venue is not available for booking", 400)
    }

    // Check if event type exists
    const eventType = await EventType.findById(eventTypeId).session(session)
    if (!eventType) {
      await session.abortTransaction()
      session.endSession()
      return errorResponse(res, "Event type not found", 404)
    }

    // Check if customer exists
    const customerExists = await Guest.findById(customerId).session(session)
    if (!customerExists) {
      await session.abortTransaction()
      session.endSession()
      return errorResponse(res, "Customer not found", 404)
    }

    // Check venue capacity
    if (attendees > venue.capacity) {
      await session.abortTransaction()
      session.endSession()
      return errorResponse(
        res,
        `Venue capacity (${venue.capacity}) is less than requested attendees (${attendees})`,
        400,
      )
    }

    // Check for booking conflicts
    const start = new Date(startTime)
    const end = new Date(endTime)

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      await session.abortTransaction()
      session.endSession()
      return errorResponse(res, "Invalid date format", 400)
    }

    if (start >= end) {
      await session.abortTransaction()
      session.endSession()
      return errorResponse(res, "Start time must be before end time", 400)
    }

    const conflictingBookings = await EventBooking.find({
      venue: venueId,
      status: { $in: ["confirmed", "pending"] },
      $or: [
        // New booking starts during an existing booking
        { startTime: { $lte: start }, endTime: { $gt: start } },
        // New booking ends during an existing booking
        { startTime: { $lt: end }, endTime: { $gte: end } },
        // New booking contains an existing booking
        { startTime: { $gte: start, $lt: end } },
      ],
    }).session(session)

    if (conflictingBookings.length > 0) {
      await session.abortTransaction()
      session.endSession()
      return errorResponse(res, "Venue is already booked during the requested time", 400)
    }

    // Calculate duration in hours
    const durationHours = (end - start) / (1000 * 60 * 60)

    // Check minimum hours
    if (durationHours < venue.minimumHours) {
      await session.abortTransaction()
      session.endSession()
      return errorResponse(res, `Booking duration must be at least ${venue.minimumHours} hours`, 400)
    }

    // Calculate base price
    const basePrice = venue.pricePerHour * durationHours + eventType.basePrice

    // Create booking object
    const bookingData = {
      venue: venueId,
      eventType: eventTypeId,
      customer: customerId,
      startTime: start,
      endTime: end,
      attendees,
      basePrice,
      services: [],
      totalAmount: basePrice,
      specialRequests,
      status: status || "pending",
      hotel: venue.hotel,
      createdBy: req.user._id,
    }

    // Add services if provided
    if (services && services.length > 0) {
      // This would typically involve fetching service details and prices
      // For simplicity, we're assuming the client sends the correct service data
      bookingData.services = services

      // Calculate total amount including services
      const servicesTotal = services.reduce((total, service) => {
        return total + service.price * service.quantity
      }, 0)

      bookingData.totalAmount = basePrice + servicesTotal
    }

    // Create new booking
    const newBooking = new EventBooking(bookingData)
    await newBooking.save({ session })

    await session.commitTransaction()
    session.endSession()

    // Return booking with populated fields
    const createdBooking = await EventBooking.findById(newBooking._id)
      .populate("venue")
      .populate("eventType")
      .populate("customer")
      .populate("services.service")

    return successResponse(res, { booking: createdBooking }, 201)
  } catch (error) {
    await session.abortTransaction()
    session.endSession()
    return errorResponse(res, "Failed to create event booking", 500, error)
  }
}

/**
 * Update event booking
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const updateEventBooking2 = async (req, res) => {
  // Start a session for transaction
  const session = await mongoose.startSession()
  session.startTransaction()

  try {
    const { id } = req.params
    const updateData = { ...req.body }

    // Add user ID to updated by field
    updateData.updatedBy = req.user._id

    // Find existing booking
    const existingBooking = await EventBooking.findById(id).session(session)
    if (!existingBooking) {
      await session.abortTransaction()
      session.endSession()
      return errorResponse(res, "Event booking not found", 404)
    }

    // Check if booking is already completed or cancelled
    if (existingBooking.status === "completed" || existingBooking.status === "cancelled") {
      await session.abortTransaction()
      session.endSession()
      return errorResponse(res, `Cannot update a ${existingBooking.status} booking`, 400)
    }

    // If changing venue, event type, or times, need to validate
    if (
      updateData.venue ||
      updateData.eventType ||
      updateData.startTime ||
      updateData.endTime ||
      updateData.attendees
    ) {
      const venueId = updateData.venue || existingBooking.venue
      const eventTypeId = updateData.eventType || existingBooking.eventType
      const startTime = updateData.startTime ? new Date(updateData.startTime) : existingBooking.startTime
      const endTime = updateData.endTime ? new Date(updateData.endTime) : existingBooking.endTime
      const attendees = updateData.attendees || existingBooking.attendees

      // Check if venue exists
      const venue = await EventVenue.findById(venueId).session(session)
      if (!venue) {
        await session.abortTransaction()
        session.endSession()
        return errorResponse(res, "Venue not found", 404)
      }

      // Check if venue is active
      if (!venue.isActive) {
        await session.abortTransaction()
        session.endSession()
        return errorResponse(res, "Venue is not available for booking", 400)
      }

      // Check if event type exists
      const eventType = await EventType.findById(eventTypeId).session(session)
      if (!eventType) {
        await session.abortTransaction()
        session.endSession()
        return errorResponse(res, "Event type not found", 404)
      }

      // Check venue capacity
      if (attendees > venue.capacity) {
        await session.abortTransaction()
        session.endSession()
        return errorResponse(
          res,
          `Venue capacity (${venue.capacity}) is less than requested attendees (${attendees})`,
          400,
        )
      }

      // Check for booking conflicts
      if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
        await session.abortTransaction()
        session.endSession()
        return errorResponse(res, "Invalid date format", 400)
      }

      if (startTime >= endTime) {
        await session.abortTransaction()
        session.endSession()
        return errorResponse(res, "Start time must be before end time", 400)
      }

      // Find conflicting bookings (excluding the current booking)
      const conflictingBookings = await EventBooking.find({
        _id: { $ne: id },
        venue: venueId,
        status: { $in: ["confirmed", "pending"] },
        $or: [
          // New booking starts during an existing booking
          { startTime: { $lte: startTime }, endTime: { $gt: startTime } },
          // New booking ends during an existing booking
          { startTime: { $lt: endTime }, endTime: { $gte: endTime } },
          // New booking contains an existing booking
          { startTime: { $gte: startTime, $lt: endTime } },
        ],
      }).session(session)

      if (conflictingBookings.length > 0) {
        await session.abortTransaction()
        session.endSession()
        return errorResponse(res, "Venue is already booked during the requested time", 400)
      }

      // Calculate duration in hours
      const durationHours = (endTime - startTime) / (1000 * 60 * 60)

      // Check minimum hours
      if (durationHours < venue.minimumHours) {
        await session.abortTransaction()
        session.endSession()
        return errorResponse(res, `Booking duration must be at least ${venue.minimumHours} hours`, 400)
      }

      // Calculate base price
      const basePrice = venue.pricePerHour * durationHours + eventType.basePrice
      updateData.basePrice = basePrice

      // Recalculate total amount
      if (updateData.services) {
        const servicesTotal = updateData.services.reduce((total, service) => {
          return total + service.price * service.quantity
        }, 0)

        updateData.totalAmount = basePrice + servicesTotal
      } else if (existingBooking.services.length > 0) {
        const servicesTotal = existingBooking.services.reduce((total, service) => {
          return total + service.price * service.quantity
        }, 0)

        updateData.totalAmount = basePrice + servicesTotal
      } else {
        updateData.totalAmount = basePrice
      }
    }

    // Update booking
    const updatedBooking = await EventBooking.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true, session },
    )

    await session.commitTransaction()
    session.endSession()

    // Return booking with populated fields
    const populatedBooking = await EventBooking.findById(updatedBooking._id)
      .populate("venue")
      .populate("eventType")
      .populate("customer")
      .populate("services.service")

    return successResponse(res, { booking: populatedBooking })
  } catch (error) {
    await session.abortTransaction()
    session.endSession()
    return errorResponse(res, "Failed to update event booking", 500, error)
  }
}

/**
 * Delete event booking
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const deleteEventBooking2 = async (req, res) => {
  try {
    const { id } = req.params

    // Find booking
    const booking = await EventBooking.findById(id)
    if (!booking) {
      return errorResponse(res, "Event booking not found", 404)
    }

    // Check if booking is already completed
    if (booking.status === "completed") {
      return errorResponse(res, "Cannot delete a completed booking", 400)
    }

    // Delete booking
    await EventBooking.findByIdAndDelete(id)

    return successResponse(res, { message: "Event booking deleted successfully" })
  } catch (error) {
    return errorResponse(res, "Failed to delete event booking", 500, error)
  }
}

/**
 * Confirm event booking
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const confirmEventBooking = async (req, res) => {
  try {
    const { id } = req.params

    // Find booking
    const booking = await EventBooking.findById(id)
    if (!booking) {
      return errorResponse(res, "Event booking not found", 404)
    }

    // Check if booking is already confirmed, completed, or cancelled
    if (booking.status !== "pending") {
      return errorResponse(res, `Cannot confirm a booking with status: ${booking.status}`, 400)
    }

    // Update booking status
    booking.status = "confirmed"
    booking.updatedBy = req.user._id

    await booking.save()

    // Return updated booking with populated fields
    const updatedBooking = await EventBooking.findById(id)
      .populate("venue")
      .populate("eventType")
      .populate("customer")
      .populate("services.service")

    return successResponse(res, { booking: updatedBooking })
  } catch (error) {
    return errorResponse(res, "Failed to confirm event booking", 500, error)
  }
}

/**
 * Cancel event booking
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const cancelEventBooking2 = async (req, res) => {
  try {
    const { id } = req.params
    const { cancellationReason } = req.body

    // Find booking
    const booking = await EventBooking.findById(id)
    if (!booking) {
      return errorResponse(res, "Event booking not found", 404)
    }

    // Check if booking is already completed or cancelled
    if (booking.status === "completed" || booking.status === "cancelled") {
      return errorResponse(res, `Cannot cancel a booking with status: ${booking.status}`, 400)
    }

    // Update booking status
    booking.status = "cancelled"
    booking.cancellationReason = cancellationReason
    booking.updatedBy = req.user._id

    await booking.save()

    // Return updated booking with populated fields
    const updatedBooking = await EventBooking.findById(id)
      .populate("venue")
      .populate("eventType")
      .populate("customer")
      .populate("services.service")

    return successResponse(res, { booking: updatedBooking })
  } catch (error) {
    return errorResponse(res, "Failed to cancel event booking", 500, error)
  }
}

/**
 * Get bookings by date range
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getBookingsByDateRange = async (req, res) => {
  try {
    const { startDate, endDate, hotel } = req.query

    // Validate date range
    if (!startDate || !endDate) {
      return errorResponse(res, "Start date and end date are required", 400)
    }

    const start = new Date(startDate)
    const end = new Date(endDate)

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return errorResponse(res, "Invalid date format", 400)
    }

    // Build query
    const query = {
      status: { $in: ["confirmed", "pending"] },
      $or: [
        // Booking starts during the range
        { startTime: { $gte: start, $lte: end } },
        // Booking ends during the range
        { endTime: { $gte: start, $lte: end } },
        // Booking spans the entire range
        { startTime: { $lte: start }, endTime: { $gte: end } },
      ],
    }

    if (hotel) {
      query.hotel = hotel
    }

    const bookings = await EventBooking.find(query)
      .populate("venue")
      .populate("eventType")
      .populate("customer")
      .sort({ startTime: 1 })

    return successResponse(res, { bookings })
  } catch (error) {
    return errorResponse(res, "Failed to get bookings by date range", 500, error)
  }
}

/**
 * Get bookings by venue
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getBookingsByVenue = async (req, res) => {
  try {
    const { venueId } = req.params
    const { status, startDate, endDate } = req.query

    // Build query
    const query = { venue: venueId }

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

    const bookings = await EventBooking.find(query)
      .populate("venue")
      .populate("eventType")
      .populate("customer")
      .sort({ startTime: 1 })

    return successResponse(res, { bookings })
  } catch (error) {
    return errorResponse(res, "Failed to get bookings by venue", 500, error)
  }
}

/**
 * Get bookings by customer
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getBookingsByCustomer = async (req, res) => {
  try {
    const { customerId } = req.params
    const { status } = req.query

    // Build query
    const query = { customer: customerId }

    if (status) {
      query.status = status
    }

    const bookings = await EventBooking.find(query)
      .populate("venue")
      .populate("eventType")
      .populate("services.service")
      .sort({ startTime: 1 })

    return successResponse(res, { bookings })
  } catch (error) {
    return errorResponse(res, "Failed to get bookings by customer", 500, error)
  }
}
// Get all bookings
export const getAllBookings = asyncHandler(async (req, res) => {
  const {
    hotel_id,
    venue_id,
    status,
    start_date,
    end_date,
    customer_email,
    customer_id,
    page = 1,
    limit = 20,
    sort = "-createdAt",
  } = req.query

  // Build filter object
  const filter = { is_deleted: false }

  if (hotel_id) filter.hotel_id = hotel_id
  if (venue_id) filter.venue_id = venue_id
  if (status) filter.status = status
  if (customer_email) filter["customer.email"] = new RegExp(customer_email, "i")
  if (customer_id) filter["customer.customer_id"] = customer_id

  // Date range filter
  if (start_date && end_date) {
    filter.$or = [
      {
        start_date: { $gte: new Date(start_date), $lte: new Date(end_date) },
      },
      {
        end_date: { $gte: new Date(start_date), $lte: new Date(end_date) },
      },
      {
        start_date: { $lte: new Date(start_date) },
        end_date: { $gte: new Date(end_date) },
      },
    ]
  } else if (start_date) {
    filter.start_date = { $gte: new Date(start_date) }
  } else if (end_date) {
    filter.end_date = { $lte: new Date(end_date) }
  }

  // Calculate pagination
  const skip = (Number.parseInt(page) - 1) * Number.parseInt(limit)

  // Execute query with pagination
  const bookings = await EventBooking.find(filter)
    .sort(sort)
    .skip(skip)
    .limit(Number.parseInt(limit))
    .populate("venue_id", "name capacity")
    .populate("event_id", "title event_type_id")
    .lean()

  // Get total count for pagination
  const total = await EventBooking.countDocuments(filter)

  res.status(200).json({
    status: "success",
    results: bookings.length,
    total,
    page: Number.parseInt(page),
    pages: Math.ceil(total / Number.parseInt(limit)),
    data: bookings,
  })
})

// Get booking by ID
export const getBookingById = asyncHandler(async (req, res) => {
  const { id } = req.params

  const booking = await EventBooking.findOne({ _id: id, is_deleted: false })
    .populate("venue_id")
    .populate("event_id")
    .populate("services.service_id")
    .populate("packages.package_id")
    .populate("createdBy", "full_name email")
    .populate("updatedBy", "full_name email")

  if (!booking) {
    throw new ApiError("Booking not found", 404)
  }

  res.status(200).json({
    status: "success",
    data: booking,
  })
})

// Create booking
export const createBooking = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession()
  session.startTransaction()

  try {
    const {
      event_id,
      venue_id,
      hotel_id,
      customer,
      start_date,
      end_date,
      attendees,
      services,
      packages,
      pricing,
      notes,
    } = req.body

    // Check if venue exists
    const venue = await EventVenue.findOne({ _id: venue_id, hotel_id, is_deleted: false })
    if (!venue) {
      throw new ApiError("Venue not found", 404)
    }

    // Check venue availability
    const availability = await venue.checkAvailability(start_date, end_date)
    if (!availability.available) {
      throw new ApiError(`Venue not available: ${availability.reason}`, 400)
    }

    // Check if event exists
    const event = await Event.findOne({ _id: event_id, hotel_id, is_deleted: false })
    if (!event) {
      throw new ApiError("Event not found", 404)
    }

    // Create booking
    const newBooking = new EventBooking({
      event_id,
      venue_id,
      hotel_id,
      customer,
      start_date,
      end_date,
      attendees,
      services,
      packages,
      pricing: {
        ...pricing,
        venue_fee: venue.pricing.base_price || 0,
      },
      notes,
      createdBy: req.user._id,
      updatedBy: req.user._id,
      timeline: [
        {
          status: "inquiry",
          date: new Date(),
          user_id: req.user._id,
        },
      ],
    })

    // Calculate setup and teardown times
    if (venue.setup_time) {
      const setupStart = new Date(start_date)
      setupStart.setMinutes(setupStart.getMinutes() - venue.setup_time)
      newBooking.setup_start = setupStart
    }

    if (venue.teardown_time) {
      const teardownEnd = new Date(end_date)
      teardownEnd.setMinutes(teardownEnd.getMinutes() + venue.teardown_time)
      newBooking.teardown_end = teardownEnd
    }

    // Save booking
    await newBooking.save({ session })

    // Update event with booking reference
    event.bookings = event.bookings || []
    event.bookings.push(newBooking._id)
    await event.save({ session })

    await session.commitTransaction()

    res.status(201).json({
      status: "success",
      data: newBooking,
    })
  } catch (error) {
    await session.abortTransaction()
    throw error
  } finally {
    session.endSession()
  }
})

// Update booking
export const updateBooking = asyncHandler(async (req, res) => {
  const { id } = req.params
  const updateData = req.body

  // Find booking
  const booking = await EventBooking.findOne({ _id: id, is_deleted: false })
  if (!booking) {
    throw new ApiError("Booking not found", 404)
  }

  // Check if dates are being updated
  if (updateData.start_date && updateData.end_date) {
    // Check venue availability for new dates
    const venue = await EventVenue.findById(booking.venue_id)
    if (!venue) {
      throw new ApiError("Venue not found", 404)
    }

    const availability = await venue.checkAvailability(updateData.start_date, updateData.end_date)

    // Allow the current booking to overlap with itself
    if (
      !availability.available &&
      (!availability.conflicting_bookings || !availability.conflicting_bookings.some((b) => b._id.toString() === id))
    ) {
      throw new ApiError(`Venue not available: ${availability.reason}`, 400)
    }
  }

  // Add updatedBy
  updateData.updatedBy = req.user._id

  // Update booking
  const updatedBooking = await EventBooking.findByIdAndUpdate(id, updateData, { new: true, runValidators: true })

  res.status(200).json({
    status: "success",
    data: updatedBooking,
  })
})

// Delete booking
export const deleteBooking = asyncHandler(async (req, res) => {
  const { id } = req.params

  // Soft delete
  const booking = await EventBooking.findByIdAndUpdate(
    id,
    {
      is_deleted: true,
      updatedBy: req.user._id,
    },
    { new: true },
  )

  if (!booking) {
    throw new ApiError("Booking not found", 404)
  }

  res.status(200).json({
    status: "success",
    message: "Booking deleted successfully",
  })
})

// Update booking status
export const updateBookingStatus = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { status, notes } = req.body

  if (!["inquiry", "tentative", "confirmed", "in_progress", "completed", "cancelled", "no_show"].includes(status)) {
    throw new ApiError("Invalid status value", 400)
  }

  const booking = await EventBooking.findOne({ _id: id, is_deleted: false })
  if (!booking) {
    throw new ApiError("Booking not found", 404)
  }

  // Add status change to timeline
  booking.timeline.push({
    status,
    date: new Date(),
    user_id: req.user._id,
    notes,
  })

  booking.status = status
  booking.updatedBy = req.user._id

  if (notes) {
    booking.notes.internal = booking.notes.internal
      ? `${booking.notes.internal}\n${new Date().toISOString()}: ${notes}`
      : `${new Date().toISOString()}: ${notes}`
  }

  await booking.save()

  res.status(200).json({
    status: "success",
    data: booking,
  })
})

// Add booking payment
export const addBookingPayment = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { amount, method, reference, notes } = req.body

  if (!amount || amount <= 0) {
    throw new ApiError("Payment amount must be greater than zero", 400)
  }

  const booking = await EventBooking.findOne({ _id: id, is_deleted: false })
  if (!booking) {
    throw new ApiError("Booking not found", 404)
  }

  // Add payment transaction
  const transaction = {
    date: new Date(),
    amount,
    method,
    reference,
    notes,
  }

  booking.payment.transactions.push(transaction)

  // Update payment totals
  booking.payment.amount_paid += amount
  booking.payment.balance_due = booking.pricing.total - booking.payment.amount_paid

  // Update payment status
  if (booking.payment.balance_due <= 0) {
    booking.payment.status = "paid"
  } else if (booking.payment.amount_paid > 0) {
    booking.payment.status = "partial"
  }

  // Check if this is a deposit payment
  if (!booking.payment.deposit_paid && amount >= booking.pricing.deposit_required) {
    booking.payment.deposit_paid = true
    booking.payment.deposit_date = new Date()
    booking.payment.deposit_method = method
    booking.payment.deposit_reference = reference
  }

  booking.updatedBy = req.user._id

  await booking.save()

  res.status(200).json({
    status: "success",
    data: booking,
  })
})

// Confirm booking
export const confirmBooking = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { contract_signed, signed_by, terms_accepted } = req.body

  const booking = await EventBooking.findOne({ _id: id, is_deleted: false })
  if (!booking) {
    throw new ApiError("Booking not found", 404)
  }

  // Check if deposit is required but not paid
  if (booking.pricing.deposit_required > 0 && !booking.payment.deposit_paid) {
    throw new ApiError("Deposit payment is required before confirmation", 400)
  }

  // Update contract status if provided
  if (contract_signed) {
    booking.contract.status = "signed"
    booking.contract.signed_date = new Date()
    booking.contract.signed_by = signed_by
    booking.contract.terms_accepted = terms_accepted || false
  }

  // Update booking status
  booking.status = "confirmed"
  booking.updatedBy = req.user._id

  // Add to timeline
  booking.timeline.push({
    status: "confirmed",
    date: new Date(),
    user_id: req.user._id,
    notes: "Booking confirmed",
  })

  await booking.save()

  res.status(200).json({
    status: "success",
    data: booking,
  })
})

// Cancel booking
export const cancelBooking = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { reason, refund_amount } = req.body

  const booking = await EventBooking.findOne({ _id: id, is_deleted: false })
  if (!booking) {
    throw new ApiError("Booking not found", 404)
  }

  // Check if booking can be cancelled
  const cancellationCheck = booking.canCancel()
  if (!cancellationCheck.canCancel) {
    throw new ApiError(`Cannot cancel booking: ${cancellationCheck.reason}`, 400)
  }

  // Update booking status
  booking.status = "cancelled"
  booking.updatedBy = req.user._id

  // Add cancellation details to notes
  const cancellationNote = `Cancelled on ${new Date().toISOString()}. Reason: ${reason || "Not provided"}.`
  booking.notes.internal = booking.notes.internal ? `${booking.notes.internal}\n${cancellationNote}` : cancellationNote

  // Add to timeline
  booking.timeline.push({
    status: "cancelled",
    date: new Date(),
    user_id: req.user._id,
    notes: reason,
  })

  // Handle refund if provided
  if (refund_amount && refund_amount > 0) {
    booking.payment.transactions.push({
      date: new Date(),
      amount: -refund_amount, // Negative amount for refund
      method: "refund",
      reference: `Refund for cancellation: ${id}`,
      notes: reason,
    })

    booking.payment.amount_paid -= refund_amount
    booking.payment.balance_due = booking.pricing.total - booking.payment.amount_paid

    if (booking.payment.amount_paid <= 0) {
      booking.payment.status = "refunded"
    }
  }

  await booking.save()

  res.status(200).json({
    status: "success",
    data: booking,
    cancellation_policy: cancellationCheck.penalty
      ? {
          penalty: true,
          penalty_amount: cancellationCheck.penaltyAmount,
          reason: cancellationCheck.reason,
        }
      : {
          penalty: false,
        },
  })
})

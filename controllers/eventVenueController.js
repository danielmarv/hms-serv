import EventVenue from "../models/EventVenue.js"
import Event from "../models/Event.js"
import EventBooking from "../models/EventBooking.js"
import { ApiError } from "../utils/apiError.js"
import { ApiResponse } from "../utils/apiResponse.js"

/**
 * @desc    Get all venues
 * @route   GET /api/events/venues
 * @access  Private
 */
export const getAllVenues = async (req, res, next) => {
  try {
    const { hotel_id, status, type, capacity_min, capacity_max, search, page = 1, limit = 20 } = req.query

    // Build filter object
    const filter = { is_deleted: false }

    if (hotel_id) filter.hotel_id = hotel_id
    if (status) filter.status = status
    if (type) filter.type = type

    // Capacity filter
    if (capacity_min || capacity_max) {
      filter.capacity = {}
      if (capacity_min) filter.capacity.$gte = Number.parseInt(capacity_min)
      if (capacity_max) filter.capacity.$lte = Number.parseInt(capacity_max)
    }

    // Search filter
    if (search) {
      filter.$or = [{ name: { $regex: search, $options: "i" } }, { description: { $regex: search, $options: "i" } }]
    }

    // Calculate pagination
    const skip = (Number.parseInt(page) - 1) * Number.parseInt(limit)

    // Execute query with pagination
    const venues = await EventVenue.find(filter).sort({ name: 1 }).skip(skip).limit(Number.parseInt(limit)).lean()

    // Get total count for pagination
    const total = await EventVenue.countDocuments(filter)

    res.status(200).json(
      new ApiResponse(
        200,
        {
          venues,
          pagination: {
            total,
            page: Number.parseInt(page),
            pages: Math.ceil(total / Number.parseInt(limit)),
            limit: Number.parseInt(limit),
          },
        },
        "Venues retrieved successfully",
      ),
    )
  } catch (error) {
    next(error)
  }
}

/**
 * @desc    Get venue by ID
 * @route   GET /api/events/venues/:id
 * @access  Private
 */
export const getVenueById = async (req, res, next) => {
  try {
    const { id } = req.params

    const venue = await EventVenue.findOne({ _id: id, is_deleted: false })

    if (!venue) {
      throw new ApiError("Venue not found", 404)
    }

    res.status(200).json(new ApiResponse(200, venue, "Venue retrieved successfully"))
  } catch (error) {
    next(error)
  }
}

/**
 * @desc    Create a new venue
 * @route   POST /api/events/venues
 * @access  Private
 */
export const createVenue = async (req, res, next) => {
  try {
    const {
      name,
      description,
      hotel_id,
      type,
      capacity,
      area,
      location,
      amenities,
      features,
      pricing,
      availability,
      setup_time,
      teardown_time,
      minimum_hours,
      cancellation_policy,
      images,
      floor_plan,
      status,
    } = req.body

    // Validate required fields
    if (!name || !hotel_id || !type || !capacity) {
      throw new ApiError("Please provide all required fields", 400)
    }

    // Check for duplicate venue name in the same hotel
    const existingVenue = await EventVenue.findOne({ name, hotel_id, is_deleted: false })
    if (existingVenue) {
      throw new ApiError("A venue with this name already exists in this hotel", 400)
    }

    // Create venue
    const newVenue = new EventVenue({
      name,
      description,
      hotel_id,
      type,
      capacity,
      area,
      location,
      amenities,
      features,
      pricing: pricing || {
        base_price: 0,
        price_per_hour: 0,
        currency: "USD",
      },
      availability,
      setup_time: setup_time || 60, // Default 60 minutes
      teardown_time: teardown_time || 60, // Default 60 minutes
      minimum_hours: minimum_hours || 2, // Default 2 hours
      cancellation_policy: cancellation_policy || "moderate",
      images,
      floor_plan,
      status: status || "active",
      createdBy: req.user._id,
      updatedBy: req.user._id,
    })

    await newVenue.save()

    res.status(201).json(new ApiResponse(201, newVenue, "Venue created successfully"))
  } catch (error) {
    next(error)
  }
}

/**
 * @desc    Update a venue
 * @route   PUT /api/events/venues/:id
 * @access  Private
 */
export const updateVenue = async (req, res, next) => {
  try {
    const { id } = req.params
    const updateData = req.body

    // Find venue
    const venue = await EventVenue.findOne({ _id: id, is_deleted: false })
    if (!venue) {
      throw new ApiError("Venue not found", 404)
    }

    // Check for duplicate venue name in the same hotel
    if (updateData.name && updateData.name !== venue.name) {
      const existingVenue = await EventVenue.findOne({
        name: updateData.name,
        hotel_id: updateData.hotel_id || venue.hotel_id,
        _id: { $ne: id },
        is_deleted: false,
      })
      if (existingVenue) {
        throw new ApiError("A venue with this name already exists in this hotel", 400)
      }
    }

    // Add updatedBy
    updateData.updatedBy = req.user._id

    // Update venue
    const updatedVenue = await EventVenue.findByIdAndUpdate(id, updateData, { new: true, runValidators: true })

    res.status(200).json(new ApiResponse(200, updatedVenue, "Venue updated successfully"))
  } catch (error) {
    next(error)
  }
}

/**
 * @desc    Delete a venue
 * @route   DELETE /api/events/venues/:id
 * @access  Private
 */
export const deleteVenue = async (req, res, next) => {
  try {
    const { id } = req.params

    // Check if venue exists
    const venue = await EventVenue.findOne({ _id: id, is_deleted: false })
    if (!venue) {
      throw new ApiError("Venue not found", 404)
    }

    // Check if venue has future events
    const futureEvents = await Event.countDocuments({
      venue_id: id,
      is_deleted: false,
      status: { $nin: ["cancelled"] },
      end_date: { $gte: new Date() },
    })

    if (futureEvents > 0) {
      throw new ApiError("Cannot delete venue with future events", 400)
    }

    // Soft delete venue
    venue.is_deleted = true
    venue.updatedBy = req.user._id
    await venue.save()

    res.status(200).json(new ApiResponse(200, null, "Venue deleted successfully"))
  } catch (error) {
    next(error)
  }
}

/**
 * @desc    Get venue availability
 * @route   GET /api/events/venues/:id/availability
 * @access  Private
 */
export const getVenueAvailability = async (req, res, next) => {
  try {
    const { id } = req.params
    const { start_date, end_date } = req.query

    if (!start_date || !end_date) {
      throw new ApiError("Start date and end date are required", 400)
    }

    const startDateTime = new Date(start_date)
    const endDateTime = new Date(end_date)

    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
      throw new ApiError("Invalid date format", 400)
    }

    // Check if venue exists
    const venue = await EventVenue.findOne({ _id: id, is_deleted: false })
    if (!venue) {
      throw new ApiError("Venue not found", 404)
    }

    // Get events in the date range
    const events = await Event.find({
      venue_id: id,
      is_deleted: false,
      status: { $nin: ["cancelled"] },
      $or: [
        // Event starts during the range
        { start_date: { $gte: startDateTime, $lte: endDateTime } },
        // Event ends during the range
        { end_date: { $gte: startDateTime, $lte: endDateTime } },
        // Event spans the entire range
        { start_date: { $lte: startDateTime }, end_date: { $gte: endDateTime } },
      ],
    })
      .select("title start_date end_date status")
      .sort({ start_date: 1 })
      .lean()

    // Calculate available time slots
    const timeSlots = []
    const currentTime = new Date(startDateTime)

    while (currentTime < endDateTime) {
      const slotEnd = new Date(currentTime)
      slotEnd.setHours(currentTime.getHours() + 1)

      // Check if slot overlaps with any event
      const isAvailable = !events.some((event) => {
        const eventStart = new Date(event.start_date)
        const eventEnd = new Date(event.end_date)
        return (
          (currentTime >= eventStart && currentTime < eventEnd) ||
          (slotEnd > eventStart && slotEnd <= eventEnd) ||
          (currentTime <= eventStart && slotEnd >= eventEnd)
        )
      })

      if (isAvailable) {
        timeSlots.push({
          start: new Date(currentTime),
          end: new Date(slotEnd),
          available: true,
        })
      }

      // Move to next hour
      currentTime.setHours(currentTime.getHours() + 1)
    }

    res.status(200).json(
      new ApiResponse(
        200,
        {
          venue: {
            id: venue._id,
            name: venue.name,
            capacity: venue.capacity,
          },
          date_range: {
            start: startDateTime,
            end: endDateTime,
          },
          events,
          available_slots: timeSlots,
        },
        "Venue availability retrieved successfully",
      ),
    )
  } catch (error) {
    next(error)
  }
}

/**
 * @desc    Get venue bookings
 * @route   GET /api/events/venues/:id/bookings
 * @access  Private
 */
export const getVenueBookings = async (req, res, next) => {
  try {
    const { id } = req.params
    const { start_date, end_date, status, page = 1, limit = 20 } = req.query

    // Check if venue exists
    const venue = await EventVenue.findOne({ _id: id, is_deleted: false })
    if (!venue) {
      throw new ApiError("Venue not found", 404)
    }

    // Build filter
    const filter = {
      venue_id: id,
      is_deleted: false,
    }

    if (status) {
      filter.status = status
    }

    if (start_date && end_date) {
      const startDateTime = new Date(start_date)
      const endDateTime = new Date(end_date)

      if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
        throw new ApiError("Invalid date format", 400)
      }

      filter.$or = [
        // Booking starts during the range
        { start_date: { $gte: startDateTime, $lte: endDateTime } },
        // Booking ends during the range
        { end_date: { $gte: startDateTime, $lte: endDateTime } },
        // Booking spans the entire range
        { start_date: { $lte: startDateTime }, end_date: { $gte: endDateTime } },
      ]
    }

    // Calculate pagination
    const skip = (Number.parseInt(page) - 1) * Number.parseInt(limit)

    // Get bookings
    const bookings = await EventBooking.find(filter)
      .sort({ start_date: 1 })
      .skip(skip)
      .limit(Number.parseInt(limit))
      .populate("event_id", "title event_type_id")
      .populate("customer.customer_id", "firstName lastName email")
      .lean()

    // Get total count for pagination
    const total = await EventBooking.countDocuments(filter)

    res.status(200).json(
      new ApiResponse(
        200,
        {
          venue: {
            id: venue._id,
            name: venue.name,
          },
          bookings,
          pagination: {
            total,
            page: Number.parseInt(page),
            pages: Math.ceil(total / Number.parseInt(limit)),
            limit: Number.parseInt(limit),
          },
        },
        "Venue bookings retrieved successfully",
      ),
    )
  } catch (error) {
    next(error)
  }
}

/**
 * @desc    Get venue statistics
 * @route   GET /api/events/venues/:id/statistics
 * @access  Private
 */
export const getVenueStatistics = async (req, res, next) => {
  try {
    const { id } = req.params
    const { start_date, end_date } = req.query

    // Default to last 30 days if no date range provided
    const endDateTime = end_date ? new Date(end_date) : new Date()
    const startDateTime = start_date ? new Date(start_date) : new Date(endDateTime.getTime() - 30 * 24 * 60 * 60 * 1000)

    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
      throw new ApiError("Invalid date format", 400)
    }

    // Check if venue exists
    const venue = await EventVenue.findOne({ _id: id, is_deleted: false })
    if (!venue) {
      throw new ApiError("Venue not found", 404)
    }

    // Get all bookings for the venue in the date range
    const bookings = await EventBooking.find({
      venue_id: id,
      is_deleted: false,
      $or: [
        // Booking starts during the range
        { start_date: { $gte: startDateTime, $lte: endDateTime } },
        // Booking ends during the range
        { end_date: { $gte: startDateTime, $lte: endDateTime } },
        // Booking spans the entire range
        { start_date: { $lte: startDateTime }, end_date: { $gte: endDateTime } },
      ],
    }).lean()

    // Calculate statistics
    const totalBookings = bookings.length

    // Calculate confirmed bookings
    const confirmedBookings = bookings.filter(
      (booking) => booking.status === "confirmed" || booking.status === "completed",
    ).length

    // Calculate cancellation rate
    const cancelledBookings = bookings.filter((booking) => booking.status === "cancelled").length
    const cancellationRate = totalBookings > 0 ? (cancelledBookings / totalBookings) * 100 : 0

    // Calculate revenue
    const revenue = bookings.reduce((total, booking) => {
      if (booking.status === "confirmed" || booking.status === "completed") {
        return total + (booking.pricing?.total || 0)
      }
      return total
    }, 0)

    // Calculate average booking duration in hours
    const totalDuration = bookings.reduce((total, booking) => {
      const start = new Date(booking.start_date)
      const end = new Date(booking.end_date)
      const durationHours = (end - start) / (1000 * 60 * 60)
      return total + durationHours
    }, 0)
    const averageDuration = totalBookings > 0 ? totalDuration / totalBookings : 0

    // Calculate utilization rate (hours booked / total available hours)
    const totalHours = (endDateTime - startDateTime) / (1000 * 60 * 60)
    const bookedHours = bookings.reduce((total, booking) => {
      const start = Math.max(new Date(booking.start_date).getTime(), startDateTime.getTime())
      const end = Math.min(new Date(booking.end_date).getTime(), endDateTime.getTime())
      const hours = Math.max(0, (end - start) / (1000 * 60 * 60))
      return total + hours
    }, 0)
    const utilizationRate = totalHours > 0 ? (bookedHours / totalHours) * 100 : 0

    // Get popular event types
    const eventTypes = {}
    for (const booking of bookings) {
      if (booking.event_id && booking.event_id.event_type_id) {
        const typeId = booking.event_id.event_type_id.toString()
        eventTypes[typeId] = (eventTypes[typeId] || 0) + 1
      }
    }

    const popularEventTypes = Object.entries(eventTypes)
      .map(([id, count]) => ({ id, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    res.status(200).json(
      new ApiResponse(
        200,
        {
          venue: {
            id: venue._id,
            name: venue.name,
            capacity: venue.capacity,
          },
          date_range: {
            start: startDateTime,
            end: endDateTime,
          },
          statistics: {
            total_bookings: totalBookings,
            confirmed_bookings: confirmedBookings,
            cancelled_bookings: cancelledBookings,
            cancellation_rate: cancellationRate.toFixed(2) + "%",
            revenue: revenue.toFixed(2),
            average_duration: averageDuration.toFixed(2) + " hours",
            utilization_rate: utilizationRate.toFixed(2) + "%",
            popular_event_types: popularEventTypes,
          },
        },
        "Venue statistics retrieved successfully",
      ),
    )
  } catch (error) {
    next(error)
  }
}

/**
 * @desc    Get venues by hotel
 * @route   GET /api/events/venues/hotel/:hotelId
 * @access  Private
 */
export const getVenuesByHotel = async (req, res, next) => {
  try {
    const { hotelId } = req.params
    const { status, type } = req.query

    // Build filter
    const filter = {
      hotel_id: hotelId,
      is_deleted: false,
    }

    if (status) filter.status = status
    if (type) filter.type = type

    // Get venues
    const venues = await EventVenue.find(filter).sort({ name: 1 }).lean()

    res.status(200).json(new ApiResponse(200, venues, "Hotel venues retrieved successfully"))
  } catch (error) {
    next(error)
  }
}

/**
 * @desc    Add venue maintenance schedule
 * @route   POST /api/events/venues/:id/maintenance
 * @access  Private
 */
export const addMaintenanceSchedule = async (req, res, next) => {
  try {
    const { id } = req.params
    const { start_date, end_date, reason, notes } = req.body

    if (!start_date || !end_date || !reason) {
      throw new ApiError("Start date, end date, and reason are required", 400)
    }

    const startDateTime = new Date(start_date)
    const endDateTime = new Date(end_date)

    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
      throw new ApiError("Invalid date format", 400)
    }

    if (endDateTime <= startDateTime) {
      throw new ApiError("End date must be after start date", 400)
    }

    // Check if venue exists
    const venue = await EventVenue.findOne({ _id: id, is_deleted: false })
    if (!venue) {
      throw new ApiError("Venue not found", 404)
    }

    // Check for conflicting events
    const conflictingEvents = await Event.find({
      venue_id: id,
      is_deleted: false,
      status: { $nin: ["cancelled"] },
      $or: [
        // Maintenance starts during an existing event
        { start_date: { $lte: startDateTime }, end_date: { $gt: startDateTime } },
        // Maintenance ends during an existing event
        { start_date: { $lt: endDateTime }, end_date: { $gte: endDateTime } },
        // Maintenance contains an existing event
        { start_date: { $gte: startDateTime, $lt: endDateTime } },
      ],
    })

    if (conflictingEvents.length > 0) {
      throw new ApiError("Maintenance schedule conflicts with existing events", 400)
    }

    // Create maintenance event
    const maintenanceEvent = new Event({
      title: `Maintenance: ${venue.name}`,
      description: reason,
      event_type_id: null, // Special case for maintenance
      hotel_id: venue.hotel_id,
      start_date: startDateTime,
      end_date: endDateTime,
      all_day: true,
      venue_id: id,
      color: "#F39C12", // Orange for maintenance
      status: "confirmed",
      visibility: "staff_only",
      notes: notes || "",
      createdBy: req.user._id,
      updatedBy: req.user._id,
    })

    await maintenanceEvent.save()

    // Update venue status
    venue.status = "maintenance"
    venue.maintenance = {
      start_date: startDateTime,
      end_date: endDateTime,
      reason,
      scheduled_by: req.user._id,
    }
    venue.updatedBy = req.user._id

    await venue.save()

    res.status(201).json(
      new ApiResponse(
        201,
        {
          venue: {
            id: venue._id,
            name: venue.name,
            status: venue.status,
          },
          maintenance: {
            id: maintenanceEvent._id,
            start_date: startDateTime,
            end_date: endDateTime,
            reason,
          },
        },
        "Maintenance schedule added successfully",
      ),
    )
  } catch (error) {
    next(error)
  }
}

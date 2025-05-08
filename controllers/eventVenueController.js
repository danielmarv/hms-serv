import EventVenue from "../models/EventVenue.js"
import EventBooking from "../models/EventBooking.js"
import { ApiError } from "../utils/apiError.js"
import { ApiResponse } from "../utils/apiResponse.js"
import asyncHandler from "../utils/asyncHandler.js"

/**
 * @desc    Get all event venues
 * @route   GET /api/events/venues
 * @access  Private
 */
export const getAllVenues = asyncHandler(async (req, res) => {
  const {
    hotel,
    type,
    status,
    minCapacity,
    maxCapacity,
    search,
    sortBy = "name",
    sortOrder = "asc",
    page = 1,
    limit = 10,
  } = req.query

  // Build query
  const query = { isDeleted: false }

  if (hotel) query.hotel = hotel
  if (type) query.type = type
  if (status) query.status = status
  if (minCapacity) query["capacity.min"] = { $gte: Number.parseInt(minCapacity) }
  if (maxCapacity) query["capacity.max"] = { $gte: Number.parseInt(maxCapacity) }

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
      { "location.floor": { $regex: search, $options: "i" } },
      { "location.building": { $regex: search, $options: "i" } },
    ]
  }

  // Build sort options
  const sortOptions = {}
  sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1

  // Execute query with pagination
  const total = await EventVenue.countDocuments(query)
  const venues = await EventVenue.find(query)
    .populate("hotel", "name location")
    .sort(sortOptions)
    .skip((Number.parseInt(page) - 1) * Number.parseInt(limit))
    .limit(Number.parseInt(limit))

  // Calculate pagination info
  const totalPages = Math.ceil(total / Number.parseInt(limit))
  const hasNextPage = Number.parseInt(page) < totalPages
  const hasPrevPage = Number.parseInt(page) > 1

  res.status(200).json(
    new ApiResponse(
      200,
      {
        venues,
        pagination: {
          total,
          page: Number.parseInt(page),
          limit: Number.parseInt(limit),
          totalPages,
          hasNextPage,
          hasPrevPage,
        },
      },
      "Event venues retrieved successfully",
    ),
  )
})

/**
 * @desc    Get a single event venue
 * @route   GET /api/events/venues/:id
 * @access  Private
 */
export const getVenueById = asyncHandler(async (req, res) => {
  const { id } = req.params

  const venue = await EventVenue.findOne({ _id: id, isDeleted: false })
    .populate("hotel", "name location")
    .populate("createdBy", "firstName lastName")
    .populate("updatedBy", "firstName lastName")
    .populate("reviews.reviewer", "firstName lastName")

  if (!venue) {
    throw new ApiError("Event venue not found", 404)
  }

  res.status(200).json(new ApiResponse(200, venue, "Event venue retrieved successfully"))
})

/**
 * @desc    Create a new event venue
 * @route   POST /api/events/venues
 * @access  Private
 */
export const createVenue = asyncHandler(async (req, res) => {
  const {
    name,
    hotel,
    type,
    capacity,
    area,
    dimensions,
    basePrice,
    pricePerHour,
    description,
    features,
    amenities,
    images,
    floorPlan,
    layouts,
    availability,
    setupTime,
    cleanupTime,
    minimumBookingHours,
    cancellationPolicy,
    location,
    technicalSpecifications,
    restrictions,
    accessibility,
    status,
  } = req.body

  // Check if venue with same name already exists in the hotel
  const existingVenue = await EventVenue.findOne({ name, hotel, isDeleted: false })
  if (existingVenue) {
    throw new ApiError("Venue with this name already exists in this hotel", 400)
  }

  // Create venue
  const venue = await EventVenue.create({
    name,
    hotel,
    type,
    capacity,
    area,
    dimensions,
    basePrice,
    pricePerHour,
    description,
    features,
    amenities,
    images,
    floorPlan,
    layouts,
    availability,
    setupTime,
    cleanupTime,
    minimumBookingHours,
    cancellationPolicy,
    location,
    technicalSpecifications,
    restrictions,
    accessibility,
    status,
    createdBy: req.user._id,
  })

  res.status(201).json(new ApiResponse(201, venue, "Event venue created successfully"))
})

/**
 * @desc    Update an event venue
 * @route   PUT /api/events/venues/:id
 * @access  Private
 */
export const updateVenue = asyncHandler(async (req, res) => {
  const { id } = req.params
  const updateData = req.body

  // Find venue
  const venue = await EventVenue.findOne({ _id: id, isDeleted: false })
  if (!venue) {
    throw new ApiError("Event venue not found", 404)
  }

  // Check if updating name and if it already exists
  if (updateData.name && updateData.name !== venue.name) {
    const existingVenue = await EventVenue.findOne({
      name: updateData.name,
      hotel: venue.hotel,
      _id: { $ne: id },
      isDeleted: false,
    })
    if (existingVenue) {
      throw new ApiError("Venue with this name already exists in this hotel", 400)
    }
  }

  // Add updatedBy field
  updateData.updatedBy = req.user._id

  // Update venue
  const updatedVenue = await EventVenue.findByIdAndUpdate(id, updateData, { new: true, runValidators: true })

  res.status(200).json(new ApiResponse(200, updatedVenue, "Event venue updated successfully"))
})

/**
 * @desc    Delete an event venue
 * @route   DELETE /api/events/venues/:id
 * @access  Private
 */
export const deleteVenue = asyncHandler(async (req, res) => {
  const { id } = req.params

  // Find venue
  const venue = await EventVenue.findOne({ _id: id, isDeleted: false })
  if (!venue) {
    throw new ApiError("Event venue not found", 404)
  }

  // Check if venue has any upcoming bookings
  const upcomingBookings = await EventBooking.countDocuments({
    venue: id,
    startTime: { $gte: new Date() },
    status: { $in: ["confirmed", "pending"] },
    isDeleted: false,
  })

  if (upcomingBookings > 0) {
    throw new ApiError("Cannot delete venue with upcoming bookings", 400)
  }

  // Soft delete
  venue.isDeleted = true
  venue.updatedBy = req.user._id
  await venue.save()

  res.status(200).json(new ApiResponse(200, null, "Event venue deleted successfully"))
})

/**
 * @desc    Get venue availability
 * @route   GET /api/events/venues/:id/availability
 * @access  Private
 */
export const getVenueAvailability = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { startDate, endDate } = req.query

  if (!startDate || !endDate) {
    throw new ApiError("Start date and end date are required", 400)
  }

  // Find venue
  const venue = await EventVenue.findOne({ _id: id, isDeleted: false })
  if (!venue) {
    throw new ApiError("Event venue not found", 404)
  }

  // Parse dates
  const start = new Date(startDate)
  const end = new Date(endDate)

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new ApiError("Invalid date format", 400)
  }

  if (start >= end) {
    throw new ApiError("Start date must be before end date", 400)
  }

  // Get bookings in the date range
  const bookings = await EventBooking.find({
    venue: id,
    status: { $in: ["confirmed", "pending"] },
    $or: [
      { startTime: { $gte: start, $lte: end } },
      { endTime: { $gte: start, $lte: end } },
      { startTime: { $lte: start }, endTime: { $gte: end } },
    ],
    isDeleted: false,
  }).select("title startTime endTime status")

  // Get maintenance schedules in the date range
  const maintenanceSchedules = venue.maintenanceSchedule.filter(
    (schedule) => schedule.startDate <= end && schedule.endDate >= start,
  )

  // Generate availability slots (1-hour increments)
  const slots = []
  const currentDate = new Date(start)

  while (currentDate < end) {
    const slotStart = new Date(currentDate)
    const slotEnd = new Date(currentDate)
    slotEnd.setHours(slotEnd.getHours() + 1)

    // Check if slot is within venue operating hours
    const dayOfWeek = slotStart.toLocaleDateString("en-US", { weekday: "lowercase" })
    const isWithinOperatingHours =
      venue.availability[dayOfWeek].isAvailable &&
      isTimeWithinRange(slotStart, venue.availability[dayOfWeek].openTime, venue.availability[dayOfWeek].closeTime) &&
      isTimeWithinRange(slotEnd, venue.availability[dayOfWeek].openTime, venue.availability[dayOfWeek].closeTime)

    // Check if slot conflicts with existing bookings
    const hasBookingConflict = bookings.some(
      (booking) => slotStart < new Date(booking.endTime) && slotEnd > new Date(booking.startTime),
    )

    // Check if slot conflicts with maintenance schedules
    const hasMaintenanceConflict = maintenanceSchedules.some(
      (schedule) => slotStart < schedule.endDate && slotEnd > schedule.startDate,
    )

    slots.push({
      start: slotStart,
      end: slotEnd,
      isAvailable: isWithinOperatingHours && !hasBookingConflict && !hasMaintenanceConflict,
      hasBookingConflict,
      hasMaintenanceConflict,
      isWithinOperatingHours,
    })

    // Move to next hour
    currentDate.setHours(currentDate.getHours() + 1)
  }

  res.status(200).json(
    new ApiResponse(
      200,
      {
        venue: {
          id: venue._id,
          name: venue.name,
          type: venue.type,
          capacity: venue.capacity,
        },
        bookings,
        maintenanceSchedules,
        availability: slots,
      },
      "Venue availability retrieved successfully",
    ),
  )
})

/**
 * @desc    Add a review to a venue
 * @route   POST /api/events/venues/:id/reviews
 * @access  Private
 */
export const addVenueReview = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { rating, comment } = req.body

  if (!rating) {
    throw new ApiError("Rating is required", 400)
  }

  // Find venue
  const venue = await EventVenue.findOne({ _id: id, isDeleted: false })
  if (!venue) {
    throw new ApiError("Event venue not found", 404)
  }

  // Add review
  venue.reviews.push({
    rating,
    comment,
    reviewer: req.user._id,
    date: new Date(),
  })

  // Recalculate average rating
  const totalRating = venue.reviews.reduce((sum, review) => sum + review.rating, 0)
  venue.averageRating = totalRating / venue.reviews.length

  await venue.save()

  res.status(200).json(new ApiResponse(200, venue, "Review added successfully"))
})

/**
 * @desc    Add maintenance schedule to a venue
 * @route   POST /api/events/venues/:id/maintenance
 * @access  Private
 */
export const addMaintenanceSchedule = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { startDate, endDate, reason, notes } = req.body

  if (!startDate || !endDate) {
    throw new ApiError("Start date and end date are required", 400)
  }

  // Parse dates
  const start = new Date(startDate)
  const end = new Date(endDate)

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new ApiError("Invalid date format", 400)
  }

  if (start >= end) {
    throw new ApiError("Start date must be before end date", 400)
  }

  // Find venue
  const venue = await EventVenue.findOne({ _id: id, isDeleted: false })
  if (!venue) {
    throw new ApiError("Event venue not found", 404)
  }

  // Check for booking conflicts
  const bookingConflicts = await EventBooking.find({
    venue: id,
    status: { $in: ["confirmed", "pending"] },
    $or: [
      { startTime: { $gte: start, $lte: end } },
      { endTime: { $gte: start, $lte: end } },
      { startTime: { $lte: start }, endTime: { $gte: end } },
    ],
    isDeleted: false,
  })

  if (bookingConflicts.length > 0) {
    throw new ApiError("Maintenance schedule conflicts with existing bookings", 400)
  }

  // Add maintenance schedule
  venue.maintenanceSchedule.push({
    startDate: start,
    endDate: end,
    reason,
    notes,
  })

  await venue.save()

  res.status(200).json(new ApiResponse(200, venue, "Maintenance schedule added successfully"))
})

// Helper function to check if a time is within a range
function isTimeWithinRange(date, openTime, closeTime) {
  const hours = date.getHours()
  const minutes = date.getMinutes()
  const timeInMinutes = hours * 60 + minutes

  const [openHours, openMinutes] = openTime.split(":").map(Number)
  const [closeHours, closeMinutes] = closeTime.split(":").map(Number)

  const openTimeInMinutes = openHours * 60 + openMinutes
  const closeTimeInMinutes = closeHours * 60 + closeMinutes

  return timeInMinutes >= openTimeInMinutes && timeInMinutes <= closeTimeInMinutes
}

/**
 * @desc    Get venue statistics
 * @route   GET /api/events/venues/:id/stats
 * @access  Private
 */
export const getVenueStatistics = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { startDate, endDate } = req.query

  // Find venue
  const venue = await EventVenue.findOne({ _id: id, isDeleted: false })
  if (!venue) {
    throw new ApiError("Event venue not found", 404)
  }

  // Parse dates
  const start = startDate ? new Date(startDate) : new Date(new Date().setMonth(new Date().getMonth() - 3))
  const end = endDate ? new Date(endDate) : new Date()

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new ApiError("Invalid date format", 400)
  }

  // Get bookings in the date range
  const bookings = await EventBooking.find({
    venue: id,
    startTime: { $gte: start, $lte: end },
    isDeleted: false,
  })

  // Calculate statistics
  const totalBookings = bookings.length
  const confirmedBookings = bookings.filter((booking) => booking.status === "confirmed").length
  const completedBookings = bookings.filter((booking) => booking.status === "completed").length
  const cancelledBookings = bookings.filter((booking) => booking.status === "cancelled").length

  // Calculate revenue
  const totalRevenue = bookings.reduce((sum, booking) => {
    if (booking.status !== "cancelled") {
      return sum + booking.pricing.grandTotal
    }
    return sum
  }, 0)

  // Calculate average booking duration
  const totalDuration = bookings.reduce((sum, booking) => {
    const duration = (new Date(booking.endTime) - new Date(booking.startTime)) / (1000 * 60 * 60)
    return sum + duration
  }, 0)
  const averageDuration = totalBookings > 0 ? totalDuration / totalBookings : 0

  // Calculate average attendees
  const totalAttendees = bookings.reduce((sum, booking) => sum + booking.attendees.expected, 0)
  const averageAttendees = totalBookings > 0 ? totalAttendees / totalBookings : 0

  // Calculate utilization rate (booked hours / available hours)
  const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24))
  let availableHours = 0

  // Calculate available hours based on venue availability
  for (let i = 0; i < totalDays; i++) {
    const currentDate = new Date(start)
    currentDate.setDate(currentDate.getDate() + i)
    const dayOfWeek = currentDate.toLocaleDateString("en-US", { weekday: "lowercase" })

    if (venue.availability[dayOfWeek].isAvailable) {
      const [openHours, openMinutes] = venue.availability[dayOfWeek].openTime.split(":").map(Number)
      const [closeHours, closeMinutes] = venue.availability[dayOfWeek].closeTime.split(":").map(Number)

      const openTimeInMinutes = openHours * 60 + openMinutes
      const closeTimeInMinutes = closeHours * 60 + closeMinutes

      availableHours += (closeTimeInMinutes - openTimeInMinutes) / 60
    }
  }

  const utilizationRate = availableHours > 0 ? (totalDuration / availableHours) * 100 : 0

  // Get popular event types
  const eventTypeCounts = {}
  bookings.forEach((booking) => {
    const eventTypeId = booking.eventType.toString()
    eventTypeCounts[eventTypeId] = (eventTypeCounts[eventTypeId] || 0) + 1
  })

  // Convert to array and sort
  const popularEventTypes = Object.entries(eventTypeCounts)
    .map(([id, count]) => ({ id, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  res.status(200).json(
    new ApiResponse(
      200,
      {
        totalBookings,
        confirmedBookings,
        completedBookings,
        cancelledBookings,
        totalRevenue,
        averageDuration,
        averageAttendees,
        utilizationRate,
        popularEventTypes,
        timeRange: {
          start,
          end,
        },
      },
      "Venue statistics retrieved successfully",
    ),
  )
})

/**
 * @desc    Get all event venues for a hotel
 * @route   GET /api/events/venues/hotel/:hotelId
 * @access  Private
 */
export const getVenuesByHotel = asyncHandler(async (req, res) => {
  const { hotelId } = req.params
  const { status, type } = req.query

  // Build query
  const query = { hotel: hotelId, isDeleted: false }

  if (status) query.status = status
  if (type) query.type = type

  const venues = await EventVenue.find(query).sort({ name: 1 })

  res.status(200).json(new ApiResponse(200, venues, "Hotel venues retrieved successfully"))
})

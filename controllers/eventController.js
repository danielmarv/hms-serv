import Event from "../models/Event.js"
import EventVenue from "../models/EventVenue.js"
import EventType from "../models/EventType.js"
import EventBooking from "../models/EventBooking.js"
import { ApiError } from "../utils/apiError.js"
import { ApiResponse } from "../utils/apiResponse.js"
import asyncHandler from "../utils/asyncHandler.js"
import mongoose from "mongoose"

/**
 * @desc    Get all events
 * @route   GET /api/events
 * @access  Private
 */
export const getAllEvents = asyncHandler(async (req, res) => {
  const {
    hotel_id,
    venue_id,
    event_type_id,
    status,
    start_date,
    end_date,
    search,
    page = 1,
    limit = 20,
    sort = "-start_date",
  } = req.query

  // Build filter object
  const filter = { is_deleted: false }

  if (hotel_id) filter.hotel_id = hotel_id
  if (venue_id) filter.venue_id = venue_id
  if (event_type_id) filter.event_type_id = event_type_id
  if (status) filter.status = status

  // Date range filter
  if (start_date && end_date) {
    filter.$or = [
      // Event starts during the range
      { start_date: { $gte: new Date(start_date), $lte: new Date(end_date) } },
      // Event ends during the range
      { end_date: { $gte: new Date(start_date), $lte: new Date(end_date) } },
      // Event spans the entire range
      { start_date: { $lte: new Date(start_date) }, end_date: { $gte: new Date(end_date) } },
    ]
  } else if (start_date) {
    filter.start_date = { $gte: new Date(start_date) }
  } else if (end_date) {
    filter.end_date = { $lte: new Date(end_date) }
  }

  // Search filter
  if (search) {
    filter.$or = [{ title: { $regex: search, $options: "i" } }, { description: { $regex: search, $options: "i" } }]
  }

  // Calculate pagination
  const skip = (Number.parseInt(page) - 1) * Number.parseInt(limit)

  // Execute query with pagination
  const events = await Event.find(filter)
    .sort(sort)
    .skip(skip)
    .limit(Number.parseInt(limit))
    .populate("event_type_id", "name color")
    .populate("venue_id", "name capacity")
    .lean()

  // Get total count for pagination
  const total = await Event.countDocuments(filter)

  res.status(200).json(
    new ApiResponse(
      200,
      {
        events,
        pagination: {
          total,
          page: Number.parseInt(page),
          pages: Math.ceil(total / Number.parseInt(limit)),
          limit: Number.parseInt(limit),
        },
      },
      "Events retrieved successfully",
    ),
  )
})

/**
 * @desc    Get event by ID
 * @route   GET /api/events/:id
 * @access  Private
 */
export const getEventById = asyncHandler(async (req, res) => {
  const { id } = req.params

  const event = await Event.findOne({ _id: id, is_deleted: false })
    .populate("event_type_id")
    .populate("venue_id")
    .populate("bookings")
    .populate("services.service_id")
    .populate("staffing")
    .populate("createdBy", "firstName lastName email")
    .populate("updatedBy", "firstName lastName email")

  if (!event) {
    throw new ApiError("Event not found", 404)
  }

  res.status(200).json(new ApiResponse(200, event, "Event retrieved successfully"))
})

/**
 * @desc    Create a new event
 * @route   POST /api/events
 * @access  Private
 */
export const createEvent = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession()
  session.startTransaction()

  try {
    const {
      title,
      description,
      event_type_id,
      hotel_id,
      start_date,
      end_date,
      all_day,
      recurring,
      venue_id,
      organizer,
      attendees,
      color,
      status,
      visibility,
      services,
      notes,
    } = req.body

    // Validate required fields
    if (!title || !event_type_id || !hotel_id || !start_date || !end_date || !venue_id) {
      throw new ApiError("Please provide all required fields", 400)
    }

    // Check if venue exists
    const venue = await EventVenue.findOne({ _id: venue_id, hotel_id, is_deleted: false }).session(session)
    if (!venue) {
      throw new ApiError("Venue not found", 404)
    }

    // Check venue availability
    const startDateTime = new Date(start_date)
    const endDateTime = new Date(end_date)

    if (endDateTime <= startDateTime) {
      throw new ApiError("End date must be after start date", 400)
    }

    // Check for conflicting events
    const conflictingEvents = await Event.find({
      venue_id,
      is_deleted: false,
      status: { $nin: ["cancelled"] },
      $or: [
        // New event starts during an existing event
        { start_date: { $lte: startDateTime }, end_date: { $gt: startDateTime } },
        // New event ends during an existing event
        { start_date: { $lt: endDateTime }, end_date: { $gte: endDateTime } },
        // New event contains an existing event
        { start_date: { $gte: startDateTime, $lt: endDateTime } },
      ],
    }).session(session)

    if (conflictingEvents.length > 0) {
      throw new ApiError("Venue is already booked during the requested time", 400)
    }

    // Check if event type exists
    const eventType = await EventType.findOne({ _id: event_type_id, hotel_id, is_deleted: false }).session(session)
    if (!eventType) {
      throw new ApiError("Event type not found", 404)
    }

    // Create event
    const newEvent = new Event({
      title,
      description,
      event_type_id,
      hotel_id,
      start_date: startDateTime,
      end_date: endDateTime,
      all_day: all_day || false,
      recurring,
      venue_id,
      organizer,
      attendees: attendees || 0,
      color: color || eventType.color || "#3788d8",
      status: status || "draft",
      visibility: visibility || "private",
      services,
      notes,
      createdBy: req.user._id,
      updatedBy: req.user._id,
    })

    await newEvent.save({ session })

    // Generate recurring events if applicable
    if (recurring && recurring.is_recurring) {
      const recurringEvents = await newEvent.generateRecurringEvents()
      if (recurringEvents.length > 0) {
        await Event.insertMany(recurringEvents, { session })
      }
    }

    await session.commitTransaction()

    res.status(201).json(new ApiResponse(201, newEvent, "Event created successfully"))
  } catch (error) {
    await session.abortTransaction()
    throw error
  } finally {
    session.endSession()
  }
})

/**
 * @desc    Update an event
 * @route   PUT /api/events/:id
 * @access  Private
 */
export const updateEvent = asyncHandler(async (req, res) => {
  const { id } = req.params
  const updateData = req.body

  // Find event
  const event = await Event.findOne({ _id: id, is_deleted: false })
  if (!event) {
    throw new ApiError("Event not found", 404)
  }

  // Check if dates are being updated
  if (updateData.start_date && updateData.end_date) {
    const startDateTime = new Date(updateData.start_date)
    const endDateTime = new Date(updateData.end_date)

    if (endDateTime <= startDateTime) {
      throw new ApiError("End date must be after start date", 400)
    }

    // Check venue availability for new dates
    const venueId = updateData.venue_id || event.venue_id

    // Check for conflicting events (excluding this event)
    const conflictingEvents = await Event.find({
      _id: { $ne: id },
      venue_id: venueId,
      is_deleted: false,
      status: { $nin: ["cancelled"] },
      $or: [
        // Updated event starts during an existing event
        { start_date: { $lte: startDateTime }, end_date: { $gt: startDateTime } },
        // Updated event ends during an existing event
        { start_date: { $lt: endDateTime }, end_date: { $gte: endDateTime } },
        // Updated event contains an existing event
        { start_date: { $gte: startDateTime, $lt: endDateTime } },
      ],
    })

    if (conflictingEvents.length > 0) {
      throw new ApiError("Venue is already booked during the requested time", 400)
    }
  }

  // Add updatedBy
  updateData.updatedBy = req.user._id

  // Update event
  const updatedEvent = await Event.findByIdAndUpdate(id, updateData, { new: true, runValidators: true })

  res.status(200).json(new ApiResponse(200, updatedEvent, "Event updated successfully"))
})

/**
 * @desc    Delete an event
 * @route   DELETE /api/events/:id
 * @access  Private
 */
export const deleteEvent = asyncHandler(async (req, res) => {
  const { id } = req.params

  // Check if event has bookings
  const event = await Event.findOne({ _id: id, is_deleted: false })
  if (!event) {
    throw new ApiError("Event not found", 404)
  }

  if (event.bookings && event.bookings.length > 0) {
    // Check if any bookings are confirmed
    const confirmedBookings = await EventBooking.countDocuments({
      _id: { $in: event.bookings },
      status: { $in: ["confirmed", "in_progress"] },
    })

    if (confirmedBookings > 0) {
      throw new ApiError("Cannot delete event with confirmed bookings", 400)
    }

    // Soft delete associated bookings
    await EventBooking.updateMany({ _id: { $in: event.bookings } }, { is_deleted: true, updatedBy: req.user._id })
  }

  // Soft delete event
  event.is_deleted = true
  event.updatedBy = req.user._id
  await event.save()

  res.status(200).json(new ApiResponse(200, null, "Event deleted successfully"))
})

/**
 * @desc    Get calendar view of events
 * @route   GET /api/events/calendar/view
 * @access  Private
 */
export const getCalendarView = asyncHandler(async (req, res) => {
  const { hotel_id, start_date, end_date, venue_id, event_type_id } = req.query

  if (!start_date || !end_date) {
    throw new ApiError("Start date and end date are required", 400)
  }

  const startDateTime = new Date(start_date)
  const endDateTime = new Date(end_date)

  if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
    throw new ApiError("Invalid date format", 400)
  }

  // Build filter
  const filter = {
    is_deleted: false,
    $or: [
      // Event starts during the range
      { start_date: { $gte: startDateTime, $lte: endDateTime } },
      // Event ends during the range
      { end_date: { $gte: startDateTime, $lte: endDateTime } },
      // Event spans the entire range
      { start_date: { $lte: startDateTime }, end_date: { $gte: endDateTime } },
    ],
  }

  if (hotel_id) filter.hotel_id = hotel_id
  if (venue_id) filter.venue_id = venue_id
  if (event_type_id) filter.event_type_id = event_type_id

  // Get events
  const events = await Event.find(filter)
    .populate("event_type_id", "name color")
    .populate("venue_id", "name")
    .select("title start_date end_date all_day color status venue_id event_type_id")
    .lean()

  // Format for calendar
  const calendarEvents = events.map((event) => ({
    id: event._id,
    title: event.title,
    start: event.start_date,
    end: event.end_date,
    allDay: event.all_day,
    backgroundColor: event.color || event.event_type_id?.color || "#3788d8",
    borderColor: event.status === "confirmed" ? "#2C3E50" : "#E74C3C",
    textColor: "#FFFFFF",
    extendedProps: {
      status: event.status,
      venue: event.venue_id?.name,
      eventType: event.event_type_id?.name,
    },
  }))

  res.status(200).json(new ApiResponse(200, calendarEvents, "Calendar events retrieved successfully"))
})

/**
 * @desc    Check venue availability
 * @route   GET /api/events/calendar/availability
 * @access  Private
 */
export const checkAvailability = asyncHandler(async (req, res) => {
  const { venue_id, start_date, end_date, exclude_event_id } = req.query

  if (!venue_id || !start_date || !end_date) {
    throw new ApiError("Venue ID, start date, and end date are required", 400)
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
  const venue = await EventVenue.findOne({ _id: venue_id, is_deleted: false })
  if (!venue) {
    throw new ApiError("Venue not found", 404)
  }

  // Build filter for conflicting events
  const filter = {
    venue_id,
    is_deleted: false,
    status: { $nin: ["cancelled"] },
    $or: [
      // New event starts during an existing event
      { start_date: { $lte: startDateTime }, end_date: { $gt: startDateTime } },
      // New event ends during an existing event
      { start_date: { $lt: endDateTime }, end_date: { $gte: endDateTime } },
      // New event contains an existing event
      { start_date: { $gte: startDateTime, $lt: endDateTime } },
    ],
  }

  // Exclude current event if provided
  if (exclude_event_id) {
    filter._id = { $ne: exclude_event_id }
  }

  // Check for conflicting events
  const conflictingEvents = await Event.find(filter)
    .populate("event_type_id", "name")
    .select("title start_date end_date status")
    .lean()

  const isAvailable = conflictingEvents.length === 0

  res.status(200).json(
    new ApiResponse(
      200,
      {
        available: isAvailable,
        conflicting_events: isAvailable ? [] : conflictingEvents,
        venue: {
          id: venue._id,
          name: venue.name,
          capacity: venue.capacity,
        },
        requested_time: {
          start: startDateTime,
          end: endDateTime,
        },
      },
      isAvailable ? "Venue is available" : "Venue is not available",
    ),
  )
})

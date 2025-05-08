import Event from "../models/Event.js"
import EventVenue from "../models/EventVenue.js"
import { ApiError } from "../utils/apiError.js"
import { ApiResponse } from "../utils/apiResponse.js"
import asyncHandler from "../utils/asyncHandler.js"

/**
 * @desc    Get calendar events
 * @route   GET /api/events/calendar
 * @access  Private
 */
export const getCalendarEvents = asyncHandler(async (req, res) => {
  const { hotel_id, start_date, end_date, venue_id, event_type_id, status } = req.query

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
  if (status) filter.status = status

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
 * @desc    Get month events
 * @route   GET /api/events/calendar/month/:year/:month
 * @access  Private
 */
export const getMonthEvents = asyncHandler(async (req, res) => {
  const { year, month } = req.params
  const { hotel_id, venue_id, event_type_id, status } = req.query

  // Validate year and month
  const yearNum = Number.parseInt(year)
  const monthNum = Number.parseInt(month) - 1 // JavaScript months are 0-indexed

  if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 0 || monthNum > 11) {
    throw new ApiError("Invalid year or month", 400)
  }

  // Calculate start and end dates for the month
  const startDate = new Date(yearNum, monthNum, 1)
  const endDate = new Date(yearNum, monthNum + 1, 0, 23, 59, 59, 999) // Last day of month

  // Build filter
  const filter = {
    is_deleted: false,
    $or: [
      // Event starts during the month
      { start_date: { $gte: startDate, $lte: endDate } },
      // Event ends during the month
      { end_date: { $gte: startDate, $lte: endDate } },
      // Event spans the entire month
      { start_date: { $lte: startDate }, end_date: { $gte: endDate } },
    ],
  }

  if (hotel_id) filter.hotel_id = hotel_id
  if (venue_id) filter.venue_id = venue_id
  if (event_type_id) filter.event_type_id = event_type_id
  if (status) filter.status = status

  // Get events
  const events = await Event.find(filter)
    .populate("event_type_id", "name color")
    .populate("venue_id", "name")
    .select("title start_date end_date all_day color status venue_id event_type_id")
    .sort({ start_date: 1 })
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

  res.status(200).json(
    new ApiResponse(
      200,
      {
        year: yearNum,
        month: monthNum + 1,
        start_date: startDate,
        end_date: endDate,
        events: calendarEvents,
      },
      "Month events retrieved successfully",
    ),
  )
})

/**
 * @desc    Get week events
 * @route   GET /api/events/calendar/week/:year/:week
 * @access  Private
 */
export const getWeekEvents = asyncHandler(async (req, res) => {
  const { year, week } = req.params
  const { hotel_id, venue_id, event_type_id, status } = req.query

  // Validate year and week
  const yearNum = Number.parseInt(year)
  const weekNum = Number.parseInt(week)

  if (isNaN(yearNum) || isNaN(weekNum) || weekNum < 1 || weekNum > 53) {
    throw new ApiError("Invalid year or week", 400)
  }

  // Calculate start and end dates for the week
  // First day of the year
  const firstDayOfYear = new Date(yearNum, 0, 1)
  // Day of the week for the first day of the year (0 = Sunday, 1 = Monday, etc.)
  const dayOfWeek = firstDayOfYear.getDay()
  // Calculate the date of the first day of the first week
  const firstWeekStart = new Date(yearNum, 0, 1 - dayOfWeek + (dayOfWeek ? 1 : -6))
  // Calculate the start date of the requested week
  const startDate = new Date(firstWeekStart)
  startDate.setDate(firstWeekStart.getDate() + (weekNum - 1) * 7)
  // Calculate the end date of the requested week
  const endDate = new Date(startDate)
  endDate.setDate(startDate.getDate() + 6)
  endDate.setHours(23, 59, 59, 999)

  // Build filter
  const filter = {
    is_deleted: false,
    $or: [
      // Event starts during the week
      { start_date: { $gte: startDate, $lte: endDate } },
      // Event ends during the week
      { end_date: { $gte: startDate, $lte: endDate } },
      // Event spans the entire week
      { start_date: { $lte: startDate }, end_date: { $gte: endDate } },
    ],
  }

  if (hotel_id) filter.hotel_id = hotel_id
  if (venue_id) filter.venue_id = venue_id
  if (event_type_id) filter.event_type_id = event_type_id
  if (status) filter.status = status

  // Get events
  const events = await Event.find(filter)
    .populate("event_type_id", "name color")
    .populate("venue_id", "name")
    .select("title start_date end_date all_day color status venue_id event_type_id")
    .sort({ start_date: 1 })
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

  res.status(200).json(
    new ApiResponse(
      200,
      {
        year: yearNum,
        week: weekNum,
        start_date: startDate,
        end_date: endDate,
        events: calendarEvents,
      },
      "Week events retrieved successfully",
    ),
  )
})

/**
 * @desc    Get day events
 * @route   GET /api/events/calendar/day/:year/:month/:day
 * @access  Private
 */
export const getDayEvents = asyncHandler(async (req, res) => {
  const { year, month, day } = req.params
  const { hotel_id, venue_id, event_type_id, status } = req.query

  // Validate year, month, and day
  const yearNum = Number.parseInt(year)
  const monthNum = Number.parseInt(month) - 1 // JavaScript months are 0-indexed
  const dayNum = Number.parseInt(day)

  if (
    isNaN(yearNum) ||
    isNaN(monthNum) ||
    isNaN(dayNum) ||
    monthNum < 0 ||
    monthNum > 11 ||
    dayNum < 1 ||
    dayNum > 31
  ) {
    throw new ApiError("Invalid date", 400)
  }

  // Calculate start and end dates for the day
  const startDate = new Date(yearNum, monthNum, dayNum)
  const endDate = new Date(yearNum, monthNum, dayNum, 23, 59, 59, 999)

  // Build filter
  const filter = {
    is_deleted: false,
    $or: [
      // Event starts during the day
      { start_date: { $gte: startDate, $lte: endDate } },
      // Event ends during the day
      { end_date: { $gte: startDate, $lte: endDate } },
      // Event spans the entire day
      { start_date: { $lte: startDate }, end_date: { $gte: endDate } },
    ],
  }

  if (hotel_id) filter.hotel_id = hotel_id
  if (venue_id) filter.venue_id = venue_id
  if (event_type_id) filter.event_type_id = event_type_id
  if (status) filter.status = status

  // Get events
  const events = await Event.find(filter)
    .populate("event_type_id", "name color")
    .populate("venue_id", "name")
    .select("title start_date end_date all_day color status venue_id event_type_id")
    .sort({ start_date: 1 })
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

  res.status(200).json(
    new ApiResponse(
      200,
      {
        year: yearNum,
        month: monthNum + 1,
        day: dayNum,
        date: startDate,
        events: calendarEvents,
      },
      "Day events retrieved successfully",
    ),
  )
})

/**
 * @desc    Check availability
 * @route   POST /api/events/calendar/check-availability
 * @access  Private
 */
export const checkAvailability = asyncHandler(async (req, res) => {
  const { venue_id, start_date, end_date, event_id } = req.body

  if (!venue_id || !start_date || !end_date) {
    throw new ApiError("Venue ID, start date, and end date are required", 400)
  }

  try {
    const availability = await EventVenue.checkAvailability(venue_id, start_date, end_date, event_id)

    res.status(200).json(
      new ApiResponse(
        200,
        {
          available: true,
          venue: availability.venue,
          requested_time: {
            start: new Date(start_date),
            end: new Date(end_date),
          },
        },
        "Venue is available",
      ),
    )
  } catch (error) {
    res.status(200).json(
      new ApiResponse(
        200,
        {
          available: false,
          reason: error.message,
          requested_time: {
            start: new Date(start_date),
            end: new Date(end_date),
          },
        },
        "Venue is not available",
      ),
    )
  }
})

/**
 * @desc    Get venue calendar
 * @route   GET /api/events/calendar/venue/:venueId
 * @access  Private
 */
export const getVenueCalendar = asyncHandler(async (req, res) => {
  const { venueId } = req.params
  const { start_date, end_date, status } = req.query

  if (!start_date || !end_date) {
    throw new ApiError("Start date and end date are required", 400)
  }

  const startDateTime = new Date(start_date)
  const endDateTime = new Date(end_date)

  if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
    throw new ApiError("Invalid date format", 400)
  }

  // Check if venue exists
  const venue = await EventVenue.findOne({ _id: venueId, is_deleted: false })
  if (!venue) {
    throw new ApiError("Venue not found", 404)
  }

  // Build filter
  const filter = {
    venue_id: venueId,
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

  if (status) filter.status = status

  // Get events
  const events = await Event.find(filter)
    .populate("event_type_id", "name color")
    .select("title start_date end_date all_day color status event_type_id")
    .sort({ start_date: 1 })
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
      eventType: event.event_type_id?.name,
    },
  }))

  // Get venue availability
  const availability = {
    days_of_week: venue.availability.days_of_week,
    start_time: venue.availability.start_time,
    end_time: venue.availability.end_time,
    exceptions: venue.availability.exceptions || [],
  }

  // Add maintenance periods as exceptions
  if (venue.status === "maintenance" && venue.maintenance) {
    const maintenanceStart = new Date(venue.maintenance.start_date)
    const maintenanceEnd = new Date(venue.maintenance.end_date)

    // Only add if maintenance period overlaps with requested date range
    if (
      (maintenanceStart >= startDateTime && maintenanceStart <= endDateTime) ||
      (maintenanceEnd >= startDateTime && maintenanceEnd <= endDateTime) ||
      (maintenanceStart <= startDateTime && maintenanceEnd >= endDateTime)
    ) {
      calendarEvents.push({
        id: `maintenance-${venue._id}`,
        title: `Maintenance: ${venue.maintenance.reason || "Scheduled Maintenance"}`,
        start: maintenanceStart,
        end: maintenanceEnd,
        allDay: true,
        backgroundColor: "#F39C12", // Orange for maintenance
        borderColor: "#E67E22",
        textColor: "#FFFFFF",
        extendedProps: {
          status: "maintenance",
          eventType: "Maintenance",
        },
      })
    }
  }

  res.status(200).json(
    new ApiResponse(
      200,
      {
        venue: {
          id: venue._id,
          name: venue.name,
          capacity: venue.capacity,
          status: venue.status,
        },
        date_range: {
          start: startDateTime,
          end: endDateTime,
        },
        availability,
        events: calendarEvents,
      },
      "Venue calendar retrieved successfully",
    ),
  )
})

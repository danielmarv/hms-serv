import EventBooking from "../models/EventBooking.js"
import EventVenue from "../models/EventVenue.js"
import { successResponse, errorResponse } from "../utils/responseHandler.js"

/**
 * Get calendar events for a specific date range
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getCalendarEvents = async (req, res) => {
  try {
    const { startDate, endDate, hotel, venue, status } = req.query

    if (!startDate || !endDate) {
      return errorResponse(res, "Start date and end date are required", 400)
    }

    const query = {
      startDate: { $lte: new Date(endDate) },
      endDate: { $gte: new Date(startDate) },
    }

    if (hotel) query.hotel = hotel
    if (venue) query.venue = venue
    if (status) query.status = status

    const events = await EventBooking.find(query)
      .populate("eventType")
      .populate("venue")
      .populate("customer")
      .sort({ startDate: 1 })

    return successResponse(res, { events })
  } catch (error) {
    return errorResponse(res, "Failed to fetch calendar events", 500, error)
  }
}

/**
 * Get availability for venues in a specific date range
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getVenueAvailability = async (req, res) => {
  try {
    const { startDate, endDate, hotel } = req.query

    if (!startDate || !endDate || !hotel) {
      return errorResponse(res, "Start date, end date, and hotel are required", 400)
    }

    // Get all venues for the hotel
    const venues = await EventVenue.find({ hotel, isActive: true })

    // Get all bookings in the date range
    const bookings = await EventBooking.find({
      hotel,
      $or: [
        {
          startDate: { $lte: new Date(endDate) },
          endDate: { $gte: new Date(startDate) },
        },
      ],
      status: { $in: ["confirmed", "pending"] },
    }).select("venue startDate endDate")

    // Calculate availability for each venue
    const availability = venues.map((venue) => {
      const venueBookings = bookings.filter((booking) => booking.venue.toString() === venue._id.toString())

      return {
        venue: {
          _id: venue._id,
          name: venue.name,
          capacity: venue.capacity,
        },
        bookings: venueBookings.map((booking) => ({
          startDate: booking.startDate,
          endDate: booking.endDate,
        })),
        isAvailable: venueBookings.length === 0,
      }
    })

    return successResponse(res, { availability })
  } catch (error) {
    return errorResponse(res, "Failed to fetch venue availability", 500, error)
  }
}

/**
 * Get daily event schedule
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getDailySchedule = async (req, res) => {
  try {
    const { date, hotel } = req.query

    if (!date || !hotel) {
      return errorResponse(res, "Date and hotel are required", 400)
    }

    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)

    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    const events = await EventBooking.find({
      hotel,
      $or: [
        { startDate: { $gte: startOfDay, $lte: endOfDay } },
        { endDate: { $gte: startOfDay, $lte: endOfDay } },
        {
          startDate: { $lte: startOfDay },
          endDate: { $gte: endOfDay },
        },
      ],
    })
      .populate("eventType")
      .populate("venue")
      .populate("customer")
      .populate("services.service")
      .sort({ startDate: 1 })

    return successResponse(res, { events })
  } catch (error) {
    return errorResponse(res, "Failed to fetch daily schedule", 500, error)
  }
}

/**
 * Get monthly event overview
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getMonthlyOverview = async (req, res) => {
  try {
    const { month, year, hotel } = req.query

    if (!month || !year || !hotel) {
      return errorResponse(res, "Month, year, and hotel are required", 400)
    }

    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0, 23, 59, 59, 999)

    const events = await EventBooking.find({
      hotel,
      $or: [
        { startDate: { $gte: startDate, $lte: endDate } },
        { endDate: { $gte: startDate, $lte: endDate } },
        {
          startDate: { $lte: startDate },
          endDate: { $gte: endDate },
        },
      ],
    }).select("startDate endDate status")

    // Group events by day
    const daysInMonth = new Date(year, month, 0).getDate()
    const overview = []

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day)
      const dayStart = new Date(date)
      dayStart.setHours(0, 0, 0, 0)

      const dayEnd = new Date(date)
      dayEnd.setHours(23, 59, 59, 999)

      const dayEvents = events.filter((event) => event.startDate <= dayEnd && event.endDate >= dayStart)

      overview.push({
        date: date.toISOString().split("T")[0],
        totalEvents: dayEvents.length,
        confirmedEvents: dayEvents.filter((e) => e.status === "confirmed").length,
        pendingEvents: dayEvents.filter((e) => e.status === "pending").length,
      })
    }

    return successResponse(res, { overview })
  } catch (error) {
    return errorResponse(res, "Failed to fetch monthly overview", 500, error)
  }
}

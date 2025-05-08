import EventBooking from "../models/EventBooking.js"
import EventVenue from "../models/EventVenue.js"
import EventType from "../models/EventType.js"
import { ApiResponse } from "../utils/apiResponse.js"
import mongoose from "mongoose"

/**
 * @desc    Get revenue report
 * @route   GET /api/events/reports/revenue
 * @access  Private
 */
export const getRevenueReport = async (req, res) => {
  try {
    const { hotel_id, start_date, end_date, group_by = "month" } = req.query

    if (!hotel_id) {
      return res.status(400).json(new ApiResponse(400, null, "Hotel ID is required"))
    }

    // Default to last 12 months if no date range provided
    const endDateTime = end_date ? new Date(end_date) : new Date()
    const startDateTime = start_date
      ? new Date(start_date)
      : new Date(endDateTime.getFullYear() - 1, endDateTime.getMonth(), 1)

    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
      return res.status(400).json(new ApiResponse(400, null, "Invalid date format"))
    }

    // Build match stage
    const matchStage = {
      hotel_id: mongoose.Types.ObjectId(hotel_id),
      is_deleted: false,
      status: { $in: ["confirmed", "completed"] },
      start_date: { $gte: startDateTime, $lte: endDateTime },
    }

    // Build group stage based on group_by parameter
    let groupStage = {}
    let sortStage = {}

    if (group_by === "day") {
      groupStage = {
        _id: {
          year: { $year: "$start_date" },
          month: { $month: "$start_date" },
          day: { $dayOfMonth: "$start_date" },
        },
        date: { $first: "$start_date" },
        count: { $sum: 1 },
        revenue: { $sum: "$pricing.total" },
      }
      sortStage = { date: 1 }
    } else if (group_by === "week") {
      groupStage = {
        _id: {
          year: { $year: "$start_date" },
          week: { $week: "$start_date" },
        },
        date: { $first: "$start_date" },
        count: { $sum: 1 },
        revenue: { $sum: "$pricing.total" },
      }
      sortStage = { "_id.year": 1, "_id.week": 1 }
    } else if (group_by === "month") {
      groupStage = {
        _id: {
          year: { $year: "$start_date" },
          month: { $month: "$start_date" },
        },
        date: { $first: "$start_date" },
        count: { $sum: 1 },
        revenue: { $sum: "$pricing.total" },
      }
      sortStage = { "_id.year": 1, "_id.month": 1 }
    } else if (group_by === "quarter") {
      groupStage = {
        _id: {
          year: { $year: "$start_date" },
          quarter: {
            $ceil: {
              $divide: [{ $month: "$start_date" }, 3],
            },
          },
        },
        date: { $first: "$start_date" },
        count: { $sum: 1 },
        revenue: { $sum: "$pricing.total" },
      }
      sortStage = { "_id.year": 1, "_id.quarter": 1 }
    } else if (group_by === "year") {
      groupStage = {
        _id: {
          year: { $year: "$start_date" },
        },
        date: { $first: "$start_date" },
        count: { $sum: 1 },
        revenue: { $sum: "$pricing.total" },
      }
      sortStage = { "_id.year": 1 }
    } else if (group_by === "event_type") {
      groupStage = {
        _id: "$event_type_id",
        count: { $sum: 1 },
        revenue: { $sum: "$pricing.total" },
      }
      sortStage = { revenue: -1 }
    } else if (group_by === "venue") {
      groupStage = {
        _id: "$venue_id",
        count: { $sum: 1 },
        revenue: { $sum: "$pricing.total" },
      }
      sortStage = { revenue: -1 }
    } else {
      return res.status(400).json(new ApiResponse(400, null, "Invalid group_by parameter"))
    }

    // Execute aggregation
    const pipeline = [{ $match: matchStage }, { $group: groupStage }, { $sort: sortStage }]

    const revenueData = await EventBooking.aggregate(pipeline)

    // Format response based on group_by
    let formattedData = []

    if (group_by === "event_type" || group_by === "venue") {
      // Populate event type or venue names
      const ids = revenueData.map((item) => item._id)

      let lookupData = []
      if (group_by === "event_type") {
        lookupData = await EventType.find({ _id: { $in: ids } })
          .select("name color")
          .lean()
      } else {
        lookupData = await EventVenue.find({ _id: { $in: ids } })
          .select("name type")
          .lean()
      }

      formattedData = revenueData.map((item) => {
        const lookupItem = lookupData.find((lookup) => lookup._id.toString() === item._id.toString())
        return {
          id: item._id,
          name: lookupItem ? lookupItem.name : "Unknown",
          type: group_by === "venue" ? lookupItem?.type : undefined,
          color: group_by === "event_type" ? lookupItem?.color : undefined,
          count: item.count,
          revenue: item.revenue,
        }
      })
    } else {
      // Format date-based groups
      formattedData = revenueData.map((item) => {
        let label = ""

        if (group_by === "day") {
          label = new Date(item.date).toISOString().split("T")[0]
        } else if (group_by === "week") {
          label = `${item._id.year}-W${item._id.week.toString().padStart(2, "0")}`
        } else if (group_by === "month") {
          label = `${item._id.year}-${item._id.month.toString().padStart(2, "0")}`
        } else if (group_by === "quarter") {
          label = `${item._id.year}-Q${item._id.quarter}`
        } else if (group_by === "year") {
          label = item._id.year.toString()
        }

        return {
          period: label,
          count: item.count,
          revenue: item.revenue,
        }
      })
    }

    // Calculate totals
    const totalEvents = formattedData.reduce((sum, item) => sum + item.count, 0)
    const totalRevenue = formattedData.reduce((sum, item) => sum + item.revenue, 0)

    res.status(200).json(
      new ApiResponse(
        200,
        {
          hotel_id,
          date_range: {
            start: startDateTime,
            end: endDateTime,
          },
          group_by,
          total_events: totalEvents,
          total_revenue: totalRevenue,
          data: formattedData,
        },
        "Revenue report generated successfully",
      ),
    )
  } catch (error) {
    console.error("Error generating revenue report:", error)
    res.status(500).json(new ApiResponse(500, null, error.message || "Error generating revenue report"))
  }
}

/**
 * @desc    Get event type report
 * @route   GET /api/events/reports/event-types
 * @access  Private
 */
export const getEventTypeReport = async (req, res) => {
  try {
    const { hotel_id, start_date, end_date } = req.query

    if (!hotel_id) {
      return res.status(400).json(new ApiResponse(400, null, "Hotel ID is required"))
    }

    // Default to last 12 months if no date range provided
    const endDateTime = end_date ? new Date(end_date) : new Date()
    const startDateTime = start_date
      ? new Date(start_date)
      : new Date(endDateTime.getFullYear() - 1, endDateTime.getMonth(), 1)

    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
      return res.status(400).json(new ApiResponse(400, null, "Invalid date format"))
    }

    // Get all event types for the hotel
    const eventTypes = await EventType.find({
      hotel_id,
      is_deleted: false,
    }).lean()

    // Build match stage
    const matchStage = {
      hotel_id: mongoose.Types.ObjectId(hotel_id),
      is_deleted: false,
      start_date: { $gte: startDateTime, $lte: endDateTime },
    }

    // Group by event type
    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: "$event_type_id",
          total_events: { $sum: 1 },
          confirmed_events: {
            $sum: {
              $cond: [{ $in: ["$status", ["confirmed", "completed"]] }, 1, 0],
            },
          },
          cancelled_events: {
            $sum: {
              $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0],
            },
          },
          revenue: {
            $sum: {
              $cond: [{ $in: ["$status", ["confirmed", "completed"]] }, "$pricing.total", 0],
            },
          },
          avg_attendees: { $avg: "$attendees.expected" },
        },
      },
      { $sort: { total_events: -1 } },
    ]

    const eventTypeStats = await EventBooking.aggregate(pipeline)

    // Format response
    const formattedData = eventTypeStats.map((stat) => {
      const eventType = eventTypes.find((et) => et._id.toString() === stat._id.toString())

      return {
        id: stat._id,
        name: eventType ? eventType.name : "Unknown",
        category: eventType ? eventType.category : "unknown",
        color: eventType ? eventType.color : "#CCCCCC",
        total_events: stat.total_events,
        confirmed_events: stat.confirmed_events,
        cancelled_events: stat.cancelled_events,
        cancellation_rate:
          stat.total_events > 0 ? ((stat.cancelled_events / stat.total_events) * 100).toFixed(2) + "%" : "0%",
        revenue: stat.revenue,
        avg_revenue_per_event: stat.confirmed_events > 0 ? (stat.revenue / stat.confirmed_events).toFixed(2) : 0,
        avg_attendees: stat.avg_attendees ? Math.round(stat.avg_attendees) : 0,
      }
    })

    // Calculate totals
    const totalEvents = formattedData.reduce((sum, item) => sum + item.total_events, 0)
    const totalConfirmed = formattedData.reduce((sum, item) => sum + item.confirmed_events, 0)
    const totalCancelled = formattedData.reduce((sum, item) => sum + item.cancelled_events, 0)
    const totalRevenue = formattedData.reduce((sum, item) => sum + item.revenue, 0)

    res.status(200).json(
      new ApiResponse(
        200,
        {
          hotel_id,
          date_range: {
            start: startDateTime,
            end: endDateTime,
          },
          summary: {
            total_events: totalEvents,
            confirmed_events: totalConfirmed,
            cancelled_events: totalCancelled,
            cancellation_rate: totalEvents > 0 ? ((totalCancelled / totalEvents) * 100).toFixed(2) + "%" : "0%",
            total_revenue: totalRevenue,
            avg_revenue_per_event: totalConfirmed > 0 ? (totalRevenue / totalConfirmed).toFixed(2) : 0,
          },
          event_types: formattedData,
        },
        "Event type report generated successfully",
      ),
    )
  } catch (error) {
    console.error("Error generating event type report:", error)
    res.status(500).json(new ApiResponse(500, null, error.message || "Error generating event type report"))
  }
}

/**
 * @desc    Get venue utilization report
 * @route   GET /api/events/reports/venues
 * @access  Private
 */
export const getVenueUtilizationReport = async (req, res) => {
  try {
    const { hotel_id, start_date, end_date } = req.query

    if (!hotel_id) {
      return res.status(400).json(new ApiResponse(400, null, "Hotel ID is required"))
    }

    // Default to last 30 days if no date range provided
    const endDateTime = end_date ? new Date(end_date) : new Date()
    const startDateTime = start_date ? new Date(start_date) : new Date(endDateTime.getTime() - 30 * 24 * 60 * 60 * 1000)

    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
      return res.status(400).json(new ApiResponse(400, null, "Invalid date format"))
    }

    // Get all venues for the hotel
    const venues = await EventVenue.find({
      hotel_id,
      is_deleted: false,
    }).lean()

    // Calculate total available hours for each venue
    const venueData = venues.map((venue) => {
      // Calculate business hours per day
      const startHour = Number.parseInt(venue.availability.start_time.split(":")[0])
      const endHour = Number.parseInt(venue.availability.end_time.split(":")[0])
      const hoursPerDay = endHour - startHour

      // Calculate total days in the date range
      const totalDays = Math.ceil((endDateTime - startDateTime) / (1000 * 60 * 60 * 24))

      // Calculate available days based on days_of_week
      const availableDays = Array.from({ length: totalDays }, (_, i) => {
        const date = new Date(startDateTime)
        date.setDate(date.getDate() + i)
        return venue.availability.days_of_week.includes(date.getDay()) ? 1 : 0
      }).reduce((sum, val) => sum + val, 0)

      // Calculate total available hours
      const totalAvailableHours = availableDays * hoursPerDay

      return {
        id: venue._id,
        name: venue.name,
        type: venue.type,
        capacity: venue.capacity,
        total_available_hours: totalAvailableHours,
        booked_hours: 0,
        utilization_rate: 0,
        revenue: 0,
        events: 0,
        avg_duration: 0,
        total_duration: 0,
      }
    })

    // Build match stage for bookings
    const matchStage = {
      hotel_id: mongoose.Types.ObjectId(hotel_id),
      is_deleted: false,
      status: { $in: ["confirmed", "completed"] },
      $or: [
        // Booking starts during the range
        { start_date: { $gte: startDateTime, $lte: endDateTime } },
        // Booking ends during the range
        { end_date: { $gte: startDateTime, $lte: endDateTime } },
        // Booking spans the entire range
        { start_date: { $lte: startDateTime }, end_date: { $gte: endDateTime } },
      ],
    }

    // Group by venue
    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: "$venue_id",
          events: { $sum: 1 },
          revenue: { $sum: "$pricing.total" },
          total_duration: {
            $sum: {
              $divide: [
                { $subtract: ["$end_date", "$start_date"] },
                1000 * 60 * 60, // Convert to hours
              ],
            },
          },
        },
      },
    ]

    const venueStats = await EventBooking.aggregate(pipeline)

    // Update venue data with booking statistics
    venueStats.forEach((stat) => {
      const venueIndex = venueData.findIndex((v) => v.id.toString() === stat._id.toString())
      if (venueIndex !== -1) {
        venueData[venueIndex].booked_hours = stat.total_duration
        venueData[venueIndex].utilization_rate =
          venueData[venueIndex].total_available_hours > 0
            ? ((stat.total_duration / venueData[venueIndex].total_available_hours) * 100).toFixed(2)
            : 0
        venueData[venueIndex].revenue = stat.revenue
        venueData[venueIndex].events = stat.events
        venueData[venueIndex].avg_duration = stat.events > 0 ? (stat.total_duration / stat.events).toFixed(2) : 0
        venueData[venueIndex].total_duration = stat.total_duration
      }
    })

    // Sort by utilization rate
    venueData.sort((a, b) => b.utilization_rate - a.utilization_rate)

    // Calculate totals
    const totalAvailableHours = venueData.reduce((sum, venue) => sum + venue.total_available_hours, 0)
    const totalBookedHours = venueData.reduce((sum, venue) => sum + venue.booked_hours, 0)
    const totalUtilizationRate =
      totalAvailableHours > 0 ? ((totalBookedHours / totalAvailableHours) * 100).toFixed(2) : 0
    const totalRevenue = venueData.reduce((sum, venue) => sum + venue.revenue, 0)
    const totalEvents = venueData.reduce((sum, venue) => sum + venue.events, 0)

    res.status(200).json(
      new ApiResponse(
        200,
        {
          hotel_id,
          date_range: {
            start: startDateTime,
            end: endDateTime,
          },
          summary: {
            total_venues: venues.length,
            total_available_hours: totalAvailableHours,
            total_booked_hours: totalBookedHours,
            overall_utilization_rate: totalUtilizationRate + "%",
            total_revenue: totalRevenue,
            total_events: totalEvents,
            revenue_per_hour: totalBookedHours > 0 ? (totalRevenue / totalBookedHours).toFixed(2) : 0,
          },
          venues: venueData,
        },
        "Venue utilization report generated successfully",
      ),
    )
  } catch (error) {
    console.error("Error generating venue utilization report:", error)
    res.status(500).json(new ApiResponse(500, null, error.message || "Error generating venue utilization report"))
  }
}

/**
 * @desc    Get service popularity report
 * @route   GET /api/events/reports/services
 * @access  Private
 */
export const getServicePopularityReport = async (req, res) => {
  try {
    const { hotel_id, start_date, end_date } = req.query

    if (!hotel_id) {
      return res.status(400).json(new ApiResponse(400, null, "Hotel ID is required"))
    }

    // Default to last 90 days if no date range provided
    const endDateTime = end_date ? new Date(end_date) : new Date()
    const startDateTime = start_date ? new Date(start_date) : new Date(endDateTime.getTime() - 90 * 24 * 60 * 60 * 1000)

    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
      return res.status(400).json(new ApiResponse(400, null, "Invalid date format"))
    }

    // Build match stage for bookings
    const matchStage = {
      hotel_id: mongoose.Types.ObjectId(hotel_id),
      is_deleted: false,
      status: { $in: ["confirmed", "completed"] },
      start_date: { $gte: startDateTime, $lte: endDateTime },
      "services.0": { $exists: true }, // Only bookings with services
    }

    // Unwind services array and group by service
    const pipeline = [
      { $match: matchStage },
      { $unwind: "$services" },
      {
        $group: {
          _id: "$services.service_id",
          service_name: { $first: "$services.name" },
          count: { $sum: 1 },
          total_quantity: { $sum: "$services.quantity" },
          total_revenue: { $sum: "$services.total_price" },
          bookings: { $addToSet: "$_id" },
        },
      },
      {
        $project: {
          service_id: "$_id",
          service_name: 1,
          count: 1,
          total_quantity: 1,
          total_revenue: 1,
          booking_count: { $size: "$bookings" },
        },
      },
      { $sort: { total_revenue: -1 } },
    ]

    const serviceStats = await EventBooking.aggregate(pipeline)

    // Get total bookings in the period for percentage calculation
    const totalBookings = await EventBooking.countDocuments({
      hotel_id,
      is_deleted: false,
      status: { $in: ["confirmed", "completed"] },
      start_date: { $gte: startDateTime, $lte: endDateTime },
    })

    // Format response
    const formattedData = serviceStats.map((stat) => ({
      service_id: stat.service_id,
      service_name: stat.service_name || "Unknown Service",
      booking_count: stat.booking_count,
      booking_percentage: totalBookings > 0 ? ((stat.booking_count / totalBookings) * 100).toFixed(2) + "%" : "0%",
      total_quantity: stat.total_quantity,
      total_revenue: stat.total_revenue,
      avg_quantity_per_booking: stat.booking_count > 0 ? (stat.total_quantity / stat.booking_count).toFixed(2) : 0,
      avg_revenue_per_booking: stat.booking_count > 0 ? (stat.total_revenue / stat.booking_count).toFixed(2) : 0,
    }))

    // Calculate totals
    const totalServiceRevenue = formattedData.reduce((sum, service) => sum + service.total_revenue, 0)
    const totalServiceQuantity = formattedData.reduce((sum, service) => sum + service.total_quantity, 0)

    res.status(200).json(
      new ApiResponse(
        200,
        {
          hotel_id,
          date_range: {
            start: startDateTime,
            end: endDateTime,
          },
          summary: {
            total_bookings: totalBookings,
            total_services_used: formattedData.length,
            total_service_revenue: totalServiceRevenue,
            total_service_quantity: totalServiceQuantity,
            avg_services_per_booking:
              totalBookings > 0
                ? (formattedData.reduce((sum, service) => sum + service.booking_count, 0) / totalBookings).toFixed(2)
                : 0,
          },
          services: formattedData,
        },
        "Service popularity report generated successfully",
      ),
    )
  } catch (error) {
    console.error("Error generating service popularity report:", error)
    res.status(500).json(new ApiResponse(500, null, error.message || "Error generating service popularity report"))
  }
}

/**
 * @desc    Get feedback report
 * @route   GET /api/events/reports/feedback
 * @access  Private
 */
export const getFeedbackReport = async (req, res) => {
  try {
    const { hotel_id, start_date, end_date } = req.query

    if (!hotel_id) {
      return res.status(400).json(new ApiResponse(400, null, "Hotel ID is required"))
    }

    // Default to last 12 months if no date range provided
    const endDateTime = end_date ? new Date(end_date) : new Date()
    const startDateTime = start_date
      ? new Date(start_date)
      : new Date(endDateTime.getFullYear() - 1, endDateTime.getMonth(), 1)

    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
      return res.status(400).json(new ApiResponse(400, null, "Invalid date format"))
    }

    // Get all feedback for the hotel in the date range
    const EventFeedback = mongoose.model("EventFeedback")

    const feedback = await EventFeedback.find({
      hotel_id,
      created_at: { $gte: startDateTime, $lte: endDateTime },
    })
      .populate({
        path: "booking",
        select: "event_id venue_id",
        populate: [
          { path: "event_id", select: "title event_type_id" },
          { path: "venue_id", select: "name" },
        ],
      })
      .lean()

    // Calculate overall ratings
    const totalFeedback = feedback.length
    const overallRating =
      totalFeedback > 0 ? (feedback.reduce((sum, item) => sum + item.rating, 0) / totalFeedback).toFixed(2) : 0

    // Calculate category ratings
    const categoryRatings = {
      venue: { total: 0, count: 0 },
      staff: { total: 0, count: 0 },
      food: { total: 0, count: 0 },
      value: { total: 0, count: 0 },
    }

    feedback.forEach((item) => {
      if (item.categories) {
        if (item.categories.venue) {
          categoryRatings.venue.total += item.categories.venue
          categoryRatings.venue.count++
        }
        if (item.categories.staff) {
          categoryRatings.staff.total += item.categories.staff
          categoryRatings.staff.count++
        }
        if (item.categories.food) {
          categoryRatings.food.total += item.categories.food
          categoryRatings.food.count++
        }
        if (item.categories.value) {
          categoryRatings.value.total += item.categories.value
          categoryRatings.value.count++
        }
      }
    })

    const formattedCategoryRatings = {
      venue:
        categoryRatings.venue.count > 0 ? (categoryRatings.venue.total / categoryRatings.venue.count).toFixed(2) : 0,
      staff:
        categoryRatings.staff.count > 0 ? (categoryRatings.staff.total / categoryRatings.staff.count).toFixed(2) : 0,
      food: categoryRatings.food.count > 0 ? (categoryRatings.food.total / categoryRatings.food.count).toFixed(2) : 0,
      value:
        categoryRatings.value.count > 0 ? (categoryRatings.value.total / categoryRatings.value.count).toFixed(2) : 0,
    }

    // Group feedback by rating
    const ratingDistribution = [0, 0, 0, 0, 0] // Index 0 = rating 1, index 4 = rating 5
    feedback.forEach((item) => {
      if (item.rating >= 1 && item.rating <= 5) {
        ratingDistribution[item.rating - 1]++
      }
    })

    // Calculate rating percentages
    const ratingPercentages = ratingDistribution.map((count) =>
      totalFeedback > 0 ? ((count / totalFeedback) * 100).toFixed(2) + "%" : "0%",
    )

    // Group feedback by venue
    const venueRatings = {}
    feedback.forEach((item) => {
      if (item.booking && item.booking.venue_id) {
        const venueId = item.booking.venue_id._id.toString()
        const venueName = item.booking.venue_id.name || "Unknown Venue"

        if (!venueRatings[venueId]) {
          venueRatings[venueId] = {
            id: venueId,
            name: venueName,
            total: 0,
            count: 0,
            rating: 0,
          }
        }

        venueRatings[venueId].total += item.rating
        venueRatings[venueId].count++
      }
    })

    // Calculate average ratings for venues
    const venueRatingsList = Object.values(venueRatings).map((venue) => ({
      id: venue.id,
      name: venue.name,
      count: venue.count,
      rating: venue.count > 0 ? (venue.total / venue.count).toFixed(2) : 0,
    }))

    // Sort venues by rating
    venueRatingsList.sort((a, b) => b.rating - a.rating)

    // Group feedback by event type
    const eventTypeRatings = {}
    feedback.forEach((item) => {
      if (item.booking && item.booking.event_id && item.booking.event_id.event_type_id) {
        const eventTypeId = item.booking.event_id.event_type_id.toString()

        if (!eventTypeRatings[eventTypeId]) {
          eventTypeRatings[eventTypeId] = {
            id: eventTypeId,
            total: 0,
            count: 0,
            rating: 0,
          }
        }

        eventTypeRatings[eventTypeId].total += item.rating
        eventTypeRatings[eventTypeId].count++
      }
    })

    // Get event type names
    const eventTypeIds = Object.keys(eventTypeRatings)
    const eventTypes = await EventType.find({
      _id: { $in: eventTypeIds },
    })
      .select("name")
      .lean()

    // Calculate average ratings for event types
    const eventTypeRatingsList = Object.entries(eventTypeRatings).map(([id, data]) => {
      const eventType = eventTypes.find((et) => et._id.toString() === id)
      return {
        id,
        name: eventType ? eventType.name : "Unknown Event Type",
        count: data.count,
        rating: data.count > 0 ? (data.total / data.count).toFixed(2) : 0,
      }
    })

    // Sort event types by rating
    eventTypeRatingsList.sort((a, b) => b.rating - a.rating)

    // Group feedback by month
    const monthlyRatings = {}
    feedback.forEach((item) => {
      const date = new Date(item.created_at)
      const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}`

      if (!monthlyRatings[monthKey]) {
        monthlyRatings[monthKey] = {
          month: monthKey,
          total: 0,
          count: 0,
          rating: 0,
        }
      }

      monthlyRatings[monthKey].total += item.rating
      monthlyRatings[monthKey].count++
    })

    // Calculate average ratings by month
    const monthlyRatingsList = Object.values(monthlyRatings).map((month) => ({
      month: month.month,
      count: month.count,
      rating: month.count > 0 ? (month.total / month.count).toFixed(2) : 0,
    }))

    // Sort months chronologically
    monthlyRatingsList.sort((a, b) => a.month.localeCompare(b.month))

    res.status(200).json(
      new ApiResponse(
        200,
        {
          hotel_id,
          date_range: {
            start: startDateTime,
            end: endDateTime,
          },
          summary: {
            total_feedback: totalFeedback,
            overall_rating: overallRating,
            category_ratings: formattedCategoryRatings,
            rating_distribution: {
              ratings: [1, 2, 3, 4, 5],
              counts: ratingDistribution,
              percentages: ratingPercentages,
            },
          },
          venue_ratings: venueRatingsList,
          event_type_ratings: eventTypeRatingsList,
          monthly_ratings: monthlyRatingsList,
        },
        "Customer satisfaction report generated successfully",
      ),
    )
  } catch (error) {
    console.error("Error generating feedback report:", error)
    res.status(500).json(new ApiResponse(500, null, error.message || "Error generating feedback report"))
  }
}

/**
 * @desc    Generate custom report
 * @route   GET /api/events/reports/custom
 * @access  Private
 */
export const generateCustomReport = async (req, res) => {
  try {
    const {
      hotel_id,
      start_date,
      end_date,
      metrics = [],
      dimensions = [],
      filters = {},
      sort_by,
      limit = 100,
    } = req.query

    if (!hotel_id) {
      return res.status(400).json(new ApiResponse(400, null, "Hotel ID is required"))
    }

    // Default to last 90 days if no date range provided
    const endDateTime = end_date ? new Date(end_date) : new Date()
    const startDateTime = start_date ? new Date(start_date) : new Date(endDateTime.getTime() - 90 * 24 * 60 * 60 * 1000)

    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
      return res.status(400).json(new ApiResponse(400, null, "Invalid date format"))
    }

    // Build match stage
    const matchStage = {
      hotel_id: mongoose.Types.ObjectId(hotel_id),
      is_deleted: false,
      start_date: { $gte: startDateTime, $lte: endDateTime },
    }

    // Add filters
    if (filters.status) {
      matchStage.status = filters.status
    }
    if (filters.venue_id) {
      matchStage.venue_id = mongoose.Types.ObjectId(filters.venue_id)
    }
    if (filters.event_type_id) {
      matchStage.event_type_id = mongoose.Types.ObjectId(filters.event_type_id)
    }

    // Build group stage based on dimensions
    const groupStage = { _id: {} }

    // Add dimensions to group stage
    if (dimensions.includes("venue")) {
      groupStage._id.venue_id = "$venue_id"
    }
    if (dimensions.includes("event_type")) {
      groupStage._id.event_type_id = "$event_type_id"
    }
    if (dimensions.includes("month")) {
      groupStage._id.year = { $year: "$start_date" }
      groupStage._id.month = { $month: "$start_date" }
    }
    if (dimensions.includes("day_of_week")) {
      groupStage._id.day_of_week = { $dayOfWeek: "$start_date" }
    }
    if (dimensions.includes("status")) {
      groupStage._id.status = "$status"
    }

    // If no dimensions specified, group by hotel
    if (Object.keys(groupStage._id).length === 0) {
      groupStage._id = "$hotel_id"
    }

    // Add metrics to group stage
    if (metrics.includes("count") || metrics.length === 0) {
      groupStage.count = { $sum: 1 }
    }
    if (metrics.includes("revenue")) {
      groupStage.revenue = { $sum: "$pricing.total" }
    }
    if (metrics.includes("avg_attendees")) {
      groupStage.avg_attendees = { $avg: "$attendees.expected" }
    }
    if (metrics.includes("total_attendees")) {
      groupStage.total_attendees = { $sum: "$attendees.expected" }
    }
    if (metrics.includes("avg_duration")) {
      groupStage.avg_duration = {
        $avg: {
          $divide: [
            { $subtract: ["$end_date", "$start_date"] },
            1000 * 60 * 60, // Convert to hours
          ],
        },
      }
    }
    if (metrics.includes("total_duration")) {
      groupStage.total_duration = {
        $sum: {
          $divide: [
            { $subtract: ["$end_date", "$start_date"] },
            1000 * 60 * 60, // Convert to hours
          ],
        },
      }
    }

    // Build sort stage
    let sortStage = {}
    if (sort_by) {
      const [field, order] = sort_by.split(":")
      sortStage[field] = order === "desc" ? -1 : 1
    } else {
      // Default sort
      if (metrics.includes("revenue")) {
        sortStage = { revenue: -1 }
      } else if (metrics.includes("count")) {
        sortStage = { count: -1 }
      } else {
        sortStage = { _id: 1 }
      }
    }

    // Build pipeline
    const pipeline = [
      { $match: matchStage },
      { $group: groupStage },
      { $sort: sortStage },
      { $limit: Number.parseInt(limit) },
    ]

    // Execute aggregation
    const reportData = await EventBooking.aggregate(pipeline)

    // Format response based on dimensions
    let formattedData = []

    // Lookup dimension names if needed
    if (dimensions.includes("venue") || dimensions.includes("event_type")) {
      // Get venue names
      let venues = []
      if (dimensions.includes("venue")) {
        const venueIds = reportData.filter((item) => item._id.venue_id).map((item) => item._id.venue_id)

        venues = await EventVenue.find({
          _id: { $in: venueIds },
        })
          .select("name type")
          .lean()
      }

      // Get event type names
      let eventTypes = []
      if (dimensions.includes("event_type")) {
        const eventTypeIds = reportData.filter((item) => item._id.event_type_id).map((item) => item._id.event_type_id)

        eventTypes = await EventType.find({
          _id: { $in: eventTypeIds },
        })
          .select("name category")
          .lean()
      }

      // Format data with names
      formattedData = reportData.map((item) => {
        const result = {}

        // Add dimensions
        if (dimensions.includes("venue") && item._id.venue_id) {
          const venue = venues.find((v) => v._id.toString() === item._id.venue_id.toString())
          result.venue_id = item._id.venue_id
          result.venue_name = venue ? venue.name : "Unknown Venue"
          result.venue_type = venue ? venue.type : null
        }

        if (dimensions.includes("event_type") && item._id.event_type_id) {
          const eventType = eventTypes.find((et) => et._id.toString() === item._id.event_type_id.toString())
          result.event_type_id = item._id.event_type_id
          result.event_type_name = eventType ? eventType.name : "Unknown Event Type"
          result.event_type_category = eventType ? eventType.category : null
        }

        if (dimensions.includes("month") && item._id.year && item._id.month) {
          result.year = item._id.year
          result.month = item._id.month
          result.month_name = [
            "January",
            "February",
            "March",
            "April",
            "May",
            "June",
            "July",
            "August",
            "September",
            "October",
            "November",
            "December",
          ][item._id.month - 1]
          result.period = `${item._id.year}-${item._id.month.toString().padStart(2, "0")}`
        }

        if (dimensions.includes("day_of_week") && item._id.day_of_week) {
          result.day_of_week = item._id.day_of_week
          result.day_name = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][
            item._id.day_of_week % 7
          ]
        }

        if (dimensions.includes("status") && item._id.status) {
          result.status = item._id.status
        }

        // Add metrics
        if (metrics.includes("count") || metrics.length === 0) {
          result.count = item.count
        }
        if (metrics.includes("revenue")) {
          result.revenue = item.revenue
        }
        if (metrics.includes("avg_attendees")) {
          result.avg_attendees = Math.round(item.avg_attendees || 0)
        }
        if (metrics.includes("total_attendees")) {
          result.total_attendees = item.total_attendees || 0
        }
        if (metrics.includes("avg_duration")) {
          result.avg_duration = Number.parseFloat(item.avg_duration.toFixed(2)) || 0
        }
        if (metrics.includes("total_duration")) {
          result.total_duration = Number.parseFloat(item.total_duration.toFixed(2)) || 0
        }

        return result
      })
    } else {
      // Simple format without lookups
      formattedData = reportData.map((item) => {
        const result = {}

        // Add dimensions
        if (dimensions.includes("month") && item._id.year && item._id.month) {
          result.year = item._id.year
          result.month = item._id.month
          result.month_name = [
            "January",
            "February",
            "March",
            "April",
            "May",
            "June",
            "July",
            "August",
            "September",
            "October",
            "November",
            "December",
          ][item._id.month - 1]
          result.period = `${item._id.year}-${item._id.month.toString().padStart(2, "0")}`
        }

        if (dimensions.includes("day_of_week") && item._id.day_of_week) {
          result.day_of_week = item._id.day_of_week
          result.day_name = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][
            item._id.day_of_week % 7
          ]
        }

        if (dimensions.includes("status") && item._id.status) {
          result.status = item._id.status
        }

        // Add metrics
        if (metrics.includes("count") || metrics.length === 0) {
          result.count = item.count
        }
        if (metrics.includes("revenue")) {
          result.revenue = item.revenue
        }
        if (metrics.includes("avg_attendees")) {
          result.avg_attendees = Math.round(item.avg_attendees || 0)
        }
        if (metrics.includes("total_attendees")) {
          result.total_attendees = item.total_attendees || 0
        }
        if (metrics.includes("avg_duration")) {
          result.avg_duration = Number.parseFloat(item.avg_duration.toFixed(2)) || 0
        }
        if (metrics.includes("total_duration")) {
          result.total_duration = Number.parseFloat(item.total_duration.toFixed(2)) || 0
        }

        return result
      })
    }

    res.status(200).json(
      new ApiResponse(
        200,
        {
          hotel_id,
          date_range: {
            start: startDateTime,
            end: endDateTime,
          },
          dimensions,
          metrics,
          filters,
          sort_by: sort_by || "default",
          limit: Number.parseInt(limit),
          results: formattedData,
        },
        "Custom report generated successfully",
      ),
    )
  } catch (error) {
    console.error("Error generating custom report:", error)
    res.status(500).json(new ApiResponse(500, null, error.message || "Error generating custom report"))
  }
}

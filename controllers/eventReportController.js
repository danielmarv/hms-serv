import EventBooking from "../models/EventBooking.js"
import EventVenue from "../models/EventVenue.js"
import EventFeedback from "../models/EventFeedback.js"
import { successResponse, errorResponse } from "../utils/responseHandler.js"

/**
 * Get event revenue report
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getRevenueReport = async (req, res) => {
  try {
    const { hotel, startDate, endDate, groupBy = "month" } = req.query

    if (!hotel || !startDate || !endDate) {
      return errorResponse(res, "Hotel ID, start date, and end date are required", 400)
    }

    const query = {
      hotel,
      startDate: { $gte: new Date(startDate) },
      endDate: { $lte: new Date(endDate) },
      status: "completed",
    }

    let groupStage
    if (groupBy === "day") {
      groupStage = {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$startDate" } },
          totalRevenue: { $sum: "$totalAmount" },
          count: { $sum: 1 },
          averageRevenue: { $avg: "$totalAmount" },
        },
      }
    } else if (groupBy === "week") {
      groupStage = {
        $group: {
          _id: { $week: "$startDate" },
          year: { $first: { $year: "$startDate" } },
          totalRevenue: { $sum: "$totalAmount" },
          count: { $sum: 1 },
          averageRevenue: { $avg: "$totalAmount" },
        },
      }
    } else if (groupBy === "month") {
      groupStage = {
        $group: {
          _id: {
            year: { $year: "$startDate" },
            month: { $month: "$startDate" },
          },
          totalRevenue: { $sum: "$totalAmount" },
          count: { $sum: 1 },
          averageRevenue: { $avg: "$totalAmount" },
        },
      }
    } else if (groupBy === "quarter") {
      groupStage = {
        $group: {
          _id: {
            year: { $year: "$startDate" },
            quarter: { $ceil: { $divide: [{ $month: "$startDate" }, 3] } },
          },
          totalRevenue: { $sum: "$totalAmount" },
          count: { $sum: 1 },
          averageRevenue: { $avg: "$totalAmount" },
        },
      }
    } else {
      groupStage = {
        $group: {
          _id: { $year: "$startDate" },
          totalRevenue: { $sum: "$totalAmount" },
          count: { $sum: 1 },
          averageRevenue: { $avg: "$totalAmount" },
        },
      }
    }

    const revenueData = await EventBooking.aggregate([{ $match: query }, groupStage, { $sort: { _id: 1 } }])

    // Format the response based on groupBy
    let formattedData
    if (groupBy === "day") {
      formattedData = revenueData.map((item) => ({
        period: item._id,
        totalRevenue: item.totalRevenue,
        eventCount: item.count,
        averageRevenue: item.averageRevenue,
      }))
    } else if (groupBy === "week") {
      formattedData = revenueData.map((item) => ({
        period: `${item.year}-W${item._id.toString().padStart(2, "0")}`,
        totalRevenue: item.totalRevenue,
        eventCount: item.count,
        averageRevenue: item.averageRevenue,
      }))
    } else if (groupBy === "month") {
      formattedData = revenueData.map((item) => ({
        period: `${item._id.year}-${item._id.month.toString().padStart(2, "0")}`,
        totalRevenue: item.totalRevenue,
        eventCount: item.count,
        averageRevenue: item.averageRevenue,
      }))
    } else if (groupBy === "quarter") {
      formattedData = revenueData.map((item) => ({
        period: `${item._id.year}-Q${item._id.quarter}`,
        totalRevenue: item.totalRevenue,
        eventCount: item.count,
        averageRevenue: item.averageRevenue,
      }))
    } else {
      formattedData = revenueData.map((item) => ({
        period: item._id.toString(),
        totalRevenue: item.totalRevenue,
        eventCount: item.count,
        averageRevenue: item.averageRevenue,
      }))
    }

    // Calculate totals
    const totalRevenue = formattedData.reduce((sum, item) => sum + item.totalRevenue, 0)
    const totalEvents = formattedData.reduce((sum, item) => sum + item.eventCount, 0)
    const overallAverage = totalEvents > 0 ? totalRevenue / totalEvents : 0

    return successResponse(res, {
      revenueData: formattedData,
      summary: {
        totalRevenue,
        totalEvents,
        averageRevenuePerEvent: overallAverage,
      },
    })
  } catch (error) {
    return errorResponse(res, "Failed to generate revenue report", 500, error)
  }
}

/**
 * Get event type performance report
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getEventTypePerformance = async (req, res) => {
  try {
    const { hotel, startDate, endDate } = req.query

    if (!hotel || !startDate || !endDate) {
      return errorResponse(res, "Hotel ID, start date, and end date are required", 400)
    }

    const query = {
      hotel,
      startDate: { $gte: new Date(startDate) },
      endDate: { $lte: new Date(endDate) },
    }

    const eventTypePerformance = await EventBooking.aggregate([
      { $match: query },
      {
        $lookup: {
          from: "eventtypes",
          localField: "eventType",
          foreignField: "_id",
          as: "eventTypeInfo",
        },
      },
      { $unwind: "$eventTypeInfo" },
      {
        $group: {
          _id: "$eventType",
          eventTypeName: { $first: "$eventTypeInfo.name" },
          totalRevenue: { $sum: "$totalAmount" },
          count: { $sum: 1 },
          averageRevenue: { $avg: "$totalAmount" },
          averageGuests: { $avg: "$guestCount" },
          completedEvents: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
          },
          cancelledEvents: {
            $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] },
          },
        },
      },
      { $sort: { totalRevenue: -1 } },
    ])

    // Calculate percentages and format response
    const totalEvents = eventTypePerformance.reduce((sum, item) => sum + item.count, 0)
    const totalRevenue = eventTypePerformance.reduce((sum, item) => sum + item.totalRevenue, 0)

    const formattedData = eventTypePerformance.map((item) => ({
      eventTypeId: item._id,
      eventTypeName: item.eventTypeName,
      totalRevenue: item.totalRevenue,
      eventCount: item.count,
      averageRevenue: item.averageRevenue,
      averageGuests: item.averageGuests,
      completedEvents: item.completedEvents,
      cancelledEvents: item.cancelledEvents,
      percentageOfTotalEvents: totalEvents > 0 ? (item.count / totalEvents) * 100 : 0,
      percentageOfTotalRevenue: totalRevenue > 0 ? (item.totalRevenue / totalRevenue) * 100 : 0,
    }))

    return successResponse(res, {
      eventTypePerformance: formattedData,
      summary: {
        totalRevenue,
        totalEvents,
      },
    })
  } catch (error) {
    return errorResponse(res, "Failed to generate event type performance report", 500, error)
  }
}

/**
 * Get venue utilization report
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getVenueUtilization = async (req, res) => {
  try {
    const { hotel, startDate, endDate } = req.query

    if (!hotel || !startDate || !endDate) {
      return errorResponse(res, "Hotel ID, start date, and end date are required", 400)
    }

    // Get all venues for the hotel
    const venues = await EventVenue.find({ hotel })

    // Get all bookings in the date range
    const bookings = await EventBooking.find({
      hotel,
      startDate: { $gte: new Date(startDate) },
      endDate: { $lte: new Date(endDate) },
    }).populate("venue")

    // Calculate days in the date range
    const start = new Date(startDate)
    const end = new Date(endDate)
    const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24))

    // Calculate utilization for each venue
    const venueUtilization = venues.map((venue) => {
      const venueBookings = bookings.filter(
        (booking) => booking.venue && booking.venue._id.toString() === venue._id.toString(),
      )

      // Calculate total booked days
      let totalBookedDays = 0
      venueBookings.forEach((booking) => {
        const bookingStart = new Date(Math.max(booking.startDate, start))
        const bookingEnd = new Date(Math.min(booking.endDate, end))
        const bookingDays = Math.ceil((bookingEnd - bookingStart) / (1000 * 60 * 60 * 24)) + 1
        totalBookedDays += bookingDays
      })

      // Calculate revenue
      const totalRevenue = venueBookings.reduce((sum, booking) => sum + (booking.totalAmount || 0), 0)

      return {
        venueId: venue._id,
        venueName: venue.name,
        capacity: venue.capacity,
        totalBookings: venueBookings.length,
        totalBookedDays,
        utilizationRate: (totalBookedDays / daysDiff) * 100,
        totalRevenue,
        revenuePerDay: totalBookedDays > 0 ? totalRevenue / totalBookedDays : 0,
      }
    })

    // Sort by utilization rate
    venueUtilization.sort((a, b) => b.utilizationRate - a.utilizationRate)

    return successResponse(res, {
      venueUtilization,
      dateRange: {
        startDate,
        endDate,
        totalDays: daysDiff,
      },
    })
  } catch (error) {
    return errorResponse(res, "Failed to generate venue utilization report", 500, error)
  }
}

/**
 * Get service popularity report
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getServicePopularity = async (req, res) => {
  try {
    const { hotel, startDate, endDate } = req.query

    if (!hotel || !startDate || !endDate) {
      return errorResponse(res, "Hotel ID, start date, and end date are required", 400)
    }

    // Get all bookings with services in the date range
    const bookings = await EventBooking.find({
      hotel,
      startDate: { $gte: new Date(startDate) },
      endDate: { $lte: new Date(endDate) },
      "services.service": { $exists: true },
    }).populate("services.service")

    // Extract and count services
    const serviceMap = new Map()

    bookings.forEach((booking) => {
      if (booking.services && booking.services.length > 0) {
        booking.services.forEach((serviceItem) => {
          if (serviceItem.service) {
            const serviceId = serviceItem.service._id.toString()
            const serviceName = serviceItem.service.name
            const quantity = serviceItem.quantity || 1
            const revenue = serviceItem.price * quantity

            if (serviceMap.has(serviceId)) {
              const existing = serviceMap.get(serviceId)
              serviceMap.set(serviceId, {
                ...existing,
                bookingCount: existing.bookingCount + 1,
                totalQuantity: existing.totalQuantity + quantity,
                totalRevenue: existing.totalRevenue + revenue,
              })
            } else {
              serviceMap.set(serviceId, {
                serviceId,
                serviceName,
                bookingCount: 1,
                totalQuantity: quantity,
                totalRevenue: revenue,
              })
            }
          }
        })
      }
    })

    // Convert map to array and sort by booking count
    const servicePopularity = Array.from(serviceMap.values()).sort((a, b) => b.bookingCount - a.bookingCount)

    // Calculate percentages
    const totalBookings = bookings.length
    servicePopularity.forEach((service) => {
      service.percentageOfBookings = (service.bookingCount / totalBookings) * 100
    })

    return successResponse(res, {
      servicePopularity,
      totalBookings,
    })
  } catch (error) {
    return errorResponse(res, "Failed to generate service popularity report", 500, error)
  }
}

/**
 * Get customer satisfaction report
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getCustomerSatisfaction = async (req, res) => {
  try {
    const { hotel, startDate, endDate } = req.query

    if (!hotel) {
      return errorResponse(res, "Hotel ID is required", 400)
    }

    const query = { hotel }

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      }
    }

    // Get overall satisfaction metrics
    const totalFeedback = await EventFeedback.countDocuments(query)

    if (totalFeedback === 0) {
      return successResponse(res, {
        message: "No feedback data available for the specified period",
        satisfactionData: {
          totalFeedback: 0,
          averageRating: 0,
          ratingDistribution: [],
          categoryRatings: [],
          eventTypeRatings: [],
          trendsOverTime: [],
        },
      })
    }

    const averageRating = await EventFeedback.aggregate([
      { $match: query },
      { $group: { _id: null, avgRating: { $avg: "$rating" } } },
    ])

    // Rating distribution
    const ratingDistribution = await EventFeedback.aggregate([
      { $match: query },
      { $group: { _id: "$rating", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ])

    // Category ratings
    const categoryRatings = await EventFeedback.aggregate([
      { $match: query },
      { $unwind: "$categories" },
      {
        $group: {
          _id: "$categories.name",
          avgRating: { $avg: "$categories.rating" },
          count: { $sum: 1 },
        },
      },
      { $sort: { avgRating: -1 } },
    ])

    // Event type ratings
    const eventTypeRatings = await EventFeedback.aggregate([
      { $match: query },
      {
        $lookup: {
          from: "eventtypes",
          localField: "eventType",
          foreignField: "_id",
          as: "eventTypeInfo",
        },
      },
      { $unwind: "$eventTypeInfo" },
      {
        $group: {
          _id: "$eventType",
          eventTypeName: { $first: "$eventTypeInfo.name" },
          avgRating: { $avg: "$rating" },
          count: { $sum: 1 },
        },
      },
      { $sort: { avgRating: -1 } },
    ])

    // Trends over time (monthly)
    let trendsOverTime = []
    if (startDate && endDate) {
      trendsOverTime = await EventFeedback.aggregate([
        { $match: query },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
            },
            avgRating: { $avg: "$rating" },
            count: { $sum: 1 },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ])

      trendsOverTime = trendsOverTime.map((item) => ({
        period: `${item._id.year}-${item._id.month.toString().padStart(2, "0")}`,
        averageRating: item.avgRating,
        feedbackCount: item.count,
      }))
    }

    return successResponse(res, {
      satisfactionData: {
        totalFeedback,
        averageRating: averageRating.length > 0 ? averageRating[0].avgRating : 0,
        ratingDistribution: ratingDistribution.map((item) => ({
          rating: item._id,
          count: item.count,
          percentage: (item.count / totalFeedback) * 100,
        })),
        categoryRatings,
        eventTypeRatings,
        trendsOverTime,
      },
    })
  } catch (error) {
    return errorResponse(res, "Failed to generate customer satisfaction report", 500, error)
  }
}

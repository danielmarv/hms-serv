import mongoose from "mongoose"
import Booking from "../models/Booking.js"
import Room from "../models/Room.js"
import RoomType from "../models/RoomType.js"
import Guest from "../models/Guest.js"
import Invoice from "../models/Invoice.js"
import Maintenance from "../models/Maintenance.js"

// Get occupancy rate
export const getOccupancyRate = async (req, res, next) => {
  try {
    const { startDate, endDate, roomType } = req.query

    // Validate dates
    const start = startDate ? new Date(startDate) : new Date()
    const end = endDate ? new Date(endDate) : new Date(start)
    end.setHours(23, 59, 59, 999)

    // Set default to today if no dates provided
    if (!startDate) {
      start.setHours(0, 0, 0, 0)
    }

    // Build query
    const query = {
      status: { $ne: "maintenance" },
    }

    // Add room type filter if provided
    if (roomType) {
      query.roomType = mongoose.Types.ObjectId(roomType)
    }

    // Get total rooms
    const totalRooms = await Room.countDocuments(query)

    // Get occupied rooms (rooms with active bookings)
    const occupiedRoomsQuery = [
      {
        $match: {
          status: "confirmed",
          checkInDate: { $lte: end },
          checkOutDate: { $gte: start },
        },
      },
      {
        $lookup: {
          from: "rooms",
          localField: "room",
          foreignField: "_id",
          as: "roomDetails",
        },
      },
      {
        $unwind: "$roomDetails",
      },
    ]

    // Add room type filter if provided
    if (roomType) {
      occupiedRoomsQuery.push({
        $match: {
          "roomDetails.roomType": mongoose.Types.ObjectId(roomType),
        },
      })
    }

    // Count distinct rooms
    occupiedRoomsQuery.push({
      $group: {
        _id: null,
        occupiedRooms: { $addToSet: "$room" },
      },
    })

    const occupiedRoomsResult = await Booking.aggregate(occupiedRoomsQuery)

    const occupiedRooms = occupiedRoomsResult.length > 0 ? occupiedRoomsResult[0].occupiedRooms.length : 0

    // Calculate occupancy rate
    const occupancyRate = totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0

    res.status(200).json({
      success: true,
      data: {
        totalRooms,
        occupiedRooms,
        availableRooms: totalRooms - occupiedRooms,
        occupancyRate: Number.parseFloat(occupancyRate.toFixed(2)),
        startDate: start,
        endDate: end,
      },
    })
  } catch (error) {
    next(error)
  }
}

// Get revenue statistics
export const getRevenueStats = async (req, res, next) => {
  try {
    const { startDate, endDate, groupBy } = req.query

    // Validate dates
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(new Date().getDate() - 30))
    const end = endDate ? new Date(endDate) : new Date()
    start.setHours(0, 0, 0, 0)
    end.setHours(23, 59, 59, 999)

    // Validate groupBy parameter
    const validGroupBy = ["day", "week", "month", "year"]
    const group = validGroupBy.includes(groupBy) ? groupBy : "day"

    // Define date format based on groupBy
    let dateFormat
    switch (group) {
      case "day":
        dateFormat = { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }
        break
      case "week":
        dateFormat = {
          $dateToString: {
            format: "%Y-W%U",
            date: "$createdAt",
          },
        }
        break
      case "month":
        dateFormat = { $dateToString: { format: "%Y-%m", date: "$createdAt" } }
        break
      case "year":
        dateFormat = { $dateToString: { format: "%Y", date: "$createdAt" } }
        break
    }

    // Aggregate revenue data
    const revenueData = await Invoice.aggregate([
      {
        $match: {
          status: "paid",
          createdAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: dateFormat,
          totalRevenue: { $sum: "$totalAmount" },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ])

    // Calculate total revenue for the period
    const totalRevenue = revenueData.reduce((sum, item) => sum + item.totalRevenue, 0)

    res.status(200).json({
      success: true,
      data: {
        groupBy: group,
        startDate: start,
        endDate: end,
        totalRevenue,
        revenueData,
      },
    })
  } catch (error) {
    next(error)
  }
}

// Get booking trends
export const getBookingTrends = async (req, res, next) => {
  try {
    const { startDate, endDate, groupBy } = req.query

    // Validate dates
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(new Date().getDate() - 30))
    const end = endDate ? new Date(endDate) : new Date()
    start.setHours(0, 0, 0, 0)
    end.setHours(23, 59, 59, 999)

    // Validate groupBy parameter
    const validGroupBy = ["day", "week", "month", "year"]
    const group = validGroupBy.includes(groupBy) ? groupBy : "day"

    // Define date format based on groupBy
    let dateFormat
    switch (group) {
      case "day":
        dateFormat = { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }
        break
      case "week":
        dateFormat = {
          $dateToString: {
            format: "%Y-W%U",
            date: "$createdAt",
          },
        }
        break
      case "month":
        dateFormat = { $dateToString: { format: "%Y-%m", date: "$createdAt" } }
        break
      case "year":
        dateFormat = { $dateToString: { format: "%Y", date: "$createdAt" } }
        break
    }

    // Aggregate booking data
    const bookingData = await Booking.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: {
            date: dateFormat,
            status: "$status",
          },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: "$_id.date",
          statuses: {
            $push: {
              status: "$_id.status",
              count: "$count",
            },
          },
          totalBookings: { $sum: "$count" },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ])

    // Calculate totals by status
    const statusTotals = {
      confirmed: 0,
      cancelled: 0,
      checkedIn: 0,
      checkedOut: 0,
      total: 0,
    }

    bookingData.forEach((day) => {
      day.statuses.forEach((statusObj) => {
        if (statusObj.status === "confirmed") statusTotals.confirmed += statusObj.count
        if (statusObj.status === "cancelled") statusTotals.cancelled += statusObj.count
        if (statusObj.status === "checked-in") statusTotals.checkedIn += statusObj.count
        if (statusObj.status === "checked-out") statusTotals.checkedOut += statusObj.count
      })
      statusTotals.total += day.totalBookings
    })

    // Calculate cancellation rate
    const cancellationRate = statusTotals.total > 0 ? (statusTotals.cancelled / statusTotals.total) * 100 : 0

    res.status(200).json({
      success: true,
      data: {
        groupBy: group,
        startDate: start,
        endDate: end,
        bookingData,
        statusTotals,
        cancellationRate: Number.parseFloat(cancellationRate.toFixed(2)),
      },
    })
  } catch (error) {
    next(error)
  }
}

// Get guest demographics
export const getGuestDemographics = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query

    // Validate dates
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(new Date().getDate() - 90))
    const end = endDate ? new Date(endDate) : new Date()
    start.setHours(0, 0, 0, 0)
    end.setHours(23, 59, 59, 999)

    // Get country distribution
    const countryDistribution = await Guest.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: "$country",
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
      {
        $limit: 10,
      },
    ])

    // Get repeat vs new guests
    const bookingsByGuest = await Booking.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: "$guest",
          bookingCount: { $sum: 1 },
        },
      },
      {
        $project: {
          isRepeat: { $gt: ["$bookingCount", 1] },
        },
      },
      {
        $group: {
          _id: "$isRepeat",
          count: { $sum: 1 },
        },
      },
    ])

    // Format repeat vs new guests data
    const repeatGuestsData = {
      new: 0,
      repeat: 0,
    }

    bookingsByGuest.forEach((item) => {
      if (item._id === true) {
        repeatGuestsData.repeat = item.count
      } else {
        repeatGuestsData.new = item.count
      }
    })

    // Calculate repeat guest rate
    const totalGuests = repeatGuestsData.new + repeatGuestsData.repeat
    const repeatGuestRate = totalGuests > 0 ? (repeatGuestsData.repeat / totalGuests) * 100 : 0

    res.status(200).json({
      success: true,
      data: {
        startDate: start,
        endDate: end,
        countryDistribution,
        guestTypes: repeatGuestsData,
        repeatGuestRate: Number.parseFloat(repeatGuestRate.toFixed(2)),
        totalGuests,
      },
    })
  } catch (error) {
    next(error)
  }
}

// Get room type popularity
export const getRoomTypePopularity = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query

    // Validate dates
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(new Date().getDate() - 90))
    const end = endDate ? new Date(endDate) : new Date()
    start.setHours(0, 0, 0, 0)
    end.setHours(23, 59, 59, 999)

    // Get all room types
    const roomTypes = await RoomType.find()

    // Get bookings by room type
    const bookingsByRoomType = await Booking.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          status: { $ne: "cancelled" },
        },
      },
      {
        $lookup: {
          from: "rooms",
          localField: "room",
          foreignField: "_id",
          as: "roomDetails",
        },
      },
      {
        $unwind: "$roomDetails",
      },
      {
        $lookup: {
          from: "roomtypes",
          localField: "roomDetails.roomType",
          foreignField: "_id",
          as: "roomTypeDetails",
        },
      },
      {
        $unwind: "$roomTypeDetails",
      },
      {
        $group: {
          _id: "$roomTypeDetails._id",
          roomTypeName: { $first: "$roomTypeDetails.name" },
          bookingCount: { $sum: 1 },
          totalRevenue: { $sum: "$totalAmount" },
        },
      },
      {
        $sort: { bookingCount: -1 },
      },
    ])

    // Calculate total bookings
    const totalBookings = bookingsByRoomType.reduce((sum, item) => sum + item.bookingCount, 0)

    // Add percentage to each room type
    const roomTypeData = bookingsByRoomType.map((item) => ({
      ...item,
      percentage: totalBookings > 0 ? Number.parseFloat(((item.bookingCount / totalBookings) * 100).toFixed(2)) : 0,
    }))

    res.status(200).json({
      success: true,
      data: {
        startDate: start,
        endDate: end,
        totalBookings,
        roomTypeData,
      },
    })
  } catch (error) {
    next(error)
  }
}

// Get maintenance statistics
export const getMaintenanceStats = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query

    // Validate dates
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(new Date().getDate() - 90))
    const end = endDate ? new Date(endDate) : new Date()
    start.setHours(0, 0, 0, 0)
    end.setHours(23, 59, 59, 999)

    // Get maintenance issues by status
    const maintenanceByStatus = await Maintenance.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ])

    // Get maintenance issues by type
    const maintenanceByType = await Maintenance.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: "$issueType",
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
    ])

    // Calculate average resolution time for completed maintenance
    const resolutionTimeData = await Maintenance.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          status: "completed",
          completedAt: { $exists: true },
        },
      },
      {
        $project: {
          resolutionTime: {
            $divide: [
              { $subtract: ["$completedAt", "$createdAt"] },
              3600000, // Convert ms to hours
            ],
          },
        },
      },
      {
        $group: {
          _id: null,
          averageResolutionTime: { $avg: "$resolutionTime" },
          minResolutionTime: { $min: "$resolutionTime" },
          maxResolutionTime: { $max: "$resolutionTime" },
          count: { $sum: 1 },
        },
      },
    ])

    // Calculate resolution rate
    const totalIssues = maintenanceByStatus.reduce((sum, item) => sum + item.count, 0)
    const completedIssues = maintenanceByStatus.find((item) => item._id === "completed")?.count || 0
    const resolutionRate = totalIssues > 0 ? (completedIssues / totalIssues) * 100 : 0

    res.status(200).json({
      success: true,
      data: {
        startDate: start,
        endDate: end,
        maintenanceByStatus,
        maintenanceByType,
        resolutionTimeData: resolutionTimeData[0] || {
          averageResolutionTime: 0,
          minResolutionTime: 0,
          maxResolutionTime: 0,
          count: 0,
        },
        resolutionRate: Number.parseFloat(resolutionRate.toFixed(2)),
        totalIssues,
      },
    })
  } catch (error) {
    next(error)
  }
}

// Get dashboard statistics
export const getDashboardStats = async (req, res, next) => {
  try {
    // Get today's date
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Get month start and end
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999)

    // Get today's check-ins
    const todayCheckIns = await Booking.countDocuments({
      checkInDate: {
        $gte: today,
        $lt: tomorrow,
      },
      status: { $in: ["confirmed", "checked-in"] },
    })

    // Get today's check-outs
    const todayCheckOuts = await Booking.countDocuments({
      checkOutDate: {
        $gte: today,
        $lt: tomorrow,
      },
      status: { $in: ["checked-in", "checked-out"] },
    })

    // Get current occupancy
    const totalRooms = await Room.countDocuments({ status: { $ne: "maintenance" } })

    const occupiedRoomsResult = await Booking.aggregate([
      {
        $match: {
          status: "checked-in",
          checkInDate: { $lte: today },
          checkOutDate: { $gt: today },
        },
      },
      {
        $group: {
          _id: null,
          occupiedRooms: { $addToSet: "$room" },
        },
      },
    ])

    const occupiedRooms = occupiedRoomsResult.length > 0 ? occupiedRoomsResult[0].occupiedRooms.length : 0
    const occupancyRate = totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0

    // Get monthly revenue
    const monthlyRevenue = await Invoice.aggregate([
      {
        $match: {
          createdAt: { $gte: monthStart, $lte: monthEnd },
          status: "paid",
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$totalAmount" },
        },
      },
    ])

    // Get pending maintenance issues
    const pendingMaintenance = await Maintenance.countDocuments({
      status: { $in: ["pending", "in-progress"] },
    })

    // Get recent bookings
    const recentBookings = await Booking.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("guest", "firstName lastName email")
      .populate({
        path: "room",
        populate: {
          path: "roomType",
          model: "RoomType",
        },
      })

    res.status(200).json({
      success: true,
      data: {
        todayCheckIns,
        todayCheckOuts,
        occupancy: {
          totalRooms,
          occupiedRooms,
          availableRooms: totalRooms - occupiedRooms,
          occupancyRate: Number.parseFloat(occupancyRate.toFixed(2)),
        },
        monthlyRevenue: monthlyRevenue.length > 0 ? monthlyRevenue[0].total : 0,
        pendingMaintenance,
        recentBookings,
      },
    })
  } catch (error) {
    next(error)
  }
}

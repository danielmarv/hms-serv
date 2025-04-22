import Booking from "../models/Booking.js"
import Room from "../models/Room.js"
import Guest from "../models/Guest.js"
import Invoice from "../models/Invoice.js"
import { ApiError } from "../utils/apiError.js"

// Get all bookings with filtering, pagination, and sorting
export const getAllBookings = async (req, res, next) => {
  try {
    const {
      guest,
      room,
      status,
      payment_status,
      start_date,
      end_date,
      booking_source,
      page = 1,
      limit = 20,
      sort = "-createdAt",
    } = req.query

    // Build filter object
    const filter = {}

    if (guest) filter.guest = guest
    if (room) filter.room = room
    if (status) filter.status = status
    if (payment_status) filter.payment_status = payment_status
    if (booking_source) filter.booking_source = booking_source

    // Date range filter
    if (start_date || end_date) {
      filter.$or = []

      // Bookings with check-in date in range
      const checkInFilter = {}
      if (start_date) checkInFilter["check_in"] = { $gte: new Date(start_date) }
      if (end_date) checkInFilter["check_in"] = { ...checkInFilter["check_in"], $lte: new Date(end_date) }
      if (Object.keys(checkInFilter).length > 0) filter.$or.push(checkInFilter)

      // Bookings with check-out date in range
      const checkOutFilter = {}
      if (start_date) checkOutFilter["check_out"] = { $gte: new Date(start_date) }
      if (end_date) checkOutFilter["check_out"] = { ...checkOutFilter["check_out"], $lte: new Date(end_date) }
      if (Object.keys(checkOutFilter).length > 0) filter.$or.push(checkOutFilter)

      // Bookings that span the date range
      if (start_date && end_date) {
        filter.$or.push({
          check_in: { $lte: new Date(start_date) },
          check_out: { $gte: new Date(end_date) },
        })
      }
    }

    // Calculate pagination
    const skip = (Number(page) - 1) * Number(limit)

    // Execute query with pagination and sorting
    const bookings = await Booking.find(filter)
      .populate("guest", "full_name email phone")
      .populate("room", "number floor building")
      .populate("rate_plan", "title price")
      .sort(sort)
      .skip(skip)
      .limit(Number(limit))

    // Get total count for pagination
    const total = await Booking.countDocuments(filter)

    res.status(200).json({
      success: true,
      count: bookings.length,
      total,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
      data: bookings,
    })
  } catch (error) {
    next(error)
  }
}

// Get booking by ID
export const getBookingById = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate("guest", "full_name email phone nationality id_type id_number address")
      .populate("room", "number floor building room_type status")
      .populate("rate_plan", 'title price condition")  "number floor building room_type status')
      .populate("rate_plan", "title price condition")
      .populate({
        path: "assigned_staff",
        select: "full_name email",
      })
      .populate("createdBy", "full_name")
      .populate("updatedBy", "full_name")

    if (!booking) {
      return next(new ApiError("Booking not found", 404))
    }

    res.status(200).json({
      success: true,
      data: booking,
    })
  } catch (error) {
    next(error)
  }
}

// Create new booking
export const createBooking = async (req, res, next) => {
  try {
    const {
      guest,
      room,
      check_in,
      check_out,
      number_of_guests,
      booking_source,
      payment_status,
      payment_method,
      total_amount,
      special_requests,
      rate_plan,
      discount,
      discount_reason,
      tax_rate,
      is_group_booking,
      group_id,
      is_corporate,
      corporate_id,
      assigned_staff,
    } = req.body

    // Validate guest exists
    const guestExists = await Guest.findById(guest)
    if (!guestExists) {
      return next(new ApiError("Guest not found", 404))
    }

    // Validate room exists
    const roomExists = await Room.findById(room)
    if (!roomExists) {
      return next(new ApiError("Room not found", 404))
    }

    // Check if room is available for the requested dates
    const conflictingBooking = await Booking.findOne({
      room,
      $or: [
        { check_in: { $lt: new Date(check_out), $gte: new Date(check_in) } },
        { check_out: { $gt: new Date(check_in), $lte: new Date(check_out) } },
        {
          $and: [{ check_in: { $lte: new Date(check_in) } }, { check_out: { $gte: new Date(check_out) } }],
        },
      ],
      status: { $nin: ["cancelled", "checked_out", "no_show"] },
    })

    if (conflictingBooking) {
      return next(new ApiError("Room is not available for the selected dates", 400))
    }

    // Calculate tax amount
    const taxAmount = (total_amount * (tax_rate || 0)) / 100

    // Create booking
    const booking = await Booking.create({
      guest,
      room,
      check_in: new Date(check_in),
      check_out: new Date(check_out),
      number_of_guests,
      booking_source,
      payment_status,
      payment_method,
      total_amount,
      special_requests,
      rate_plan,
      discount,
      discount_reason,
      tax_rate,
      tax_amount: taxAmount,
      is_group_booking,
      group_id,
      is_corporate,
      corporate_id,
      assigned_staff,
      createdBy: req.user.id,
      updatedBy: req.user.id,
    })

    // Update room status to reserved
    await Room.findByIdAndUpdate(room, { status: "reserved" })

    // Update guest stay history
    const checkInDate = new Date(check_in)
    const checkOutDate = new Date(check_out)
    const stayLength = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24))

    await guestExists.updateStayHistory(stayLength, total_amount, roomExists.room_type)

    res.status(201).json({
      success: true,
      data: booking,
    })
  } catch (error) {
    next(error)
  }
}

// Update booking
export const updateBooking = async (req, res, next) => {
  try {
    const {
      guest,
      room,
      check_in,
      check_out,
      number_of_guests,
      booking_source,
      payment_status,
      payment_method,
      total_amount,
      special_requests,
      status,
      rate_plan,
      discount,
      discount_reason,
      tax_rate,
      is_group_booking,
      group_id,
      is_corporate,
      corporate_id,
      assigned_staff,
    } = req.body

    const booking = await Booking.findById(req.params.id)
    if (!booking) {
      return next(new ApiError("Booking not found", 404))
    }

    // If changing room, check availability
    if (room && room !== booking.room.toString()) {
      // Validate room exists
      const roomExists = await Room.findById(room)
      if (!roomExists) {
        return next(new ApiError("Room not found", 404))
      }

      // Check if new room is available for the requested dates
      const conflictingBooking = await Booking.findOne({
        room,
        _id: { $ne: req.params.id },
        $or: [
          { check_in: { $lt: new Date(check_out || booking.check_out), $gte: new Date(check_in || booking.check_in) } },
          {
            check_out: { $gt: new Date(check_in || booking.check_in), $lte: new Date(check_out || booking.check_out) },
          },
          {
            $and: [
              { check_in: { $lte: new Date(check_in || booking.check_in) } },
              { check_out: { $gte: new Date(check_out || booking.check_out) } },
            ],
          },
        ],
        status: { $nin: ["cancelled", "checked_out", "no_show"] },
      })

      if (conflictingBooking) {
        return next(new ApiError("New room is not available for the selected dates", 400))
      }

      // Update old room status if it was reserved for this booking
      if (booking.status === "confirmed" || booking.status === "reserved") {
        await Room.findByIdAndUpdate(booking.room, { status: "available" })
      }

      // Update new room status
      await Room.findByIdAndUpdate(room, { status: "reserved" })
    }

    // Calculate tax amount if tax rate or total amount changes
    let taxAmount = booking.tax_amount
    if (
      (tax_rate !== undefined && tax_rate !== booking.tax_rate) ||
      (total_amount !== undefined && total_amount !== booking.total_amount)
    ) {
      taxAmount = ((total_amount || booking.total_amount) * (tax_rate || booking.tax_rate)) / 100
    }

    // Mark as modified if certain fields change
    const isModified =
      room !== booking.room.toString() ||
      check_in !== booking.check_in.toISOString() ||
      check_out !== booking.check_out.toISOString() ||
      total_amount !== booking.total_amount

    // Update booking
    const updatedBooking = await Booking.findByIdAndUpdate(
      req.params.id,
      {
        guest,
        room,
        check_in,
        check_out,
        number_of_guests,
        booking_source,
        payment_status,
        payment_method,
        total_amount,
        special_requests,
        status,
        rate_plan,
        discount,
        discount_reason,
        tax_rate,
        tax_amount: taxAmount,
        is_group_booking,
        group_id,
        is_corporate,
        corporate_id,
        assigned_staff,
        is_modified: isModified || booking.is_modified,
        modification_notes: isModified ? req.body.modification_notes || "Booking modified" : booking.modification_notes,
        updatedBy: req.user.id,
      },
      { new: true, runValidators: true },
    )

    res.status(200).json({
      success: true,
      data: updatedBooking,
    })
  } catch (error) {
    next(error)
  }
}

// Cancel booking
export const cancelBooking = async (req, res, next) => {
  try {
    const { cancellation_reason } = req.body

    const booking = await Booking.findById(req.params.id)
    if (!booking) {
      return next(new ApiError("Booking not found", 404))
    }

    if (booking.status === "cancelled") {
      return next(new ApiError("Booking is already cancelled", 400))
    }

    if (booking.status === "checked_in" || booking.status === "checked_out") {
      return next(new ApiError("Cannot cancel a booking that is already checked in or checked out", 400))
    }

    // Update booking status
    booking.status = "cancelled"
    booking.cancellation_reason = cancellation_reason
    booking.cancellation_date = new Date()
    booking.updatedBy = req.user.id
    await booking.save()

    // Update room status
    await Room.findByIdAndUpdate(booking.room, { status: "available" })

    res.status(200).json({
      success: true,
      message: "Booking cancelled successfully",
      data: booking,
    })
  } catch (error) {
    next(error)
  }
}

// Check-in
export const checkIn = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id)
    if (!booking) {
      return next(new ApiError("Booking not found", 404))
    }

    if (booking.status !== "confirmed") {
      return next(new ApiError(`Cannot check in a booking with status: ${booking.status}`, 400))
    }

    // Update booking status
    booking.status = "checked_in"
    booking.actual_check_in = new Date()
    booking.check_in_time = new Date()
    booking.updatedBy = req.user.id
    await booking.save()

    // Update room status
    await Room.findByIdAndUpdate(booking.room, { status: "occupied" })

    res.status(200).json({
      success: true,
      message: "Guest checked in successfully",
      data: booking,
    })
  } catch (error) {
    next(error)
  }
}

// Check-out
export const checkOut = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id)
    if (!booking) {
      return next(new ApiError("Booking not found", 404))
    }

    if (booking.status !== "checked_in") {
      return next(new ApiError(`Cannot check out a booking with status: ${booking.status}`, 400))
    }

    // Check if all invoices are paid
    const unpaidInvoices = await Invoice.countDocuments({
      booking: booking._id,
      status: { $nin: ["Paid", "Cancelled"] },
    })

    if (unpaidInvoices > 0) {
      return next(new ApiError("Cannot check out with unpaid invoices", 400))
    }

    // Update booking status
    booking.status = "checked_out"
    booking.actual_check_out = new Date()
    booking.check_out_time = new Date()
    booking.updatedBy = req.user.id
    await booking.save()

    // Update room status to cleaning
    await Room.findByIdAndUpdate(booking.room, { status: "cleaning" })

    res.status(200).json({
      success: true,
      message: "Guest checked out successfully",
      data: booking,
    })
  } catch (error) {
    next(error)
  }
}

// Get available rooms for booking
export const getAvailableRooms = async (req, res, next) => {
  try {
    const { check_in, check_out, room_type, capacity, floor, building, view } = req.query

    if (!check_in || !check_out) {
      return next(new ApiError("Check-in and check-out dates are required", 400))
    }

    // Find rooms that are booked during the requested period
    const bookedRooms = await Booking.find({
      $or: [
        { check_in: { $lt: new Date(check_out), $gte: new Date(check_in) } },
        { check_out: { $gt: new Date(check_in), $lte: new Date(check_out) } },
        {
          $and: [{ check_in: { $lte: new Date(check_in) } }, { check_out: { $gte: new Date(check_out) } }],
        },
      ],
      status: { $nin: ["cancelled", "checked_out", "no_show"] },
    }).distinct("room")

    // Build filter for available rooms
    const filter = {
      _id: { $nin: bookedRooms },
      status: { $in: ["available", "cleaning"] },
    }

    if (room_type) filter.room_type = room_type
    if (capacity) filter.max_occupancy = { $gte: Number.parseInt(capacity) }
    if (floor) filter.floor = floor
    if (building) filter.building = building
    if (view) filter.view = view

    // Find available rooms
    const availableRooms = await Room.find(filter).populate("room_type", "name base_price category").sort("number")

    res.status(200).json({
      success: true,
      count: availableRooms.length,
      data: availableRooms,
    })
  } catch (error) {
    next(error)
  }
}

// Get booking statistics
export const getBookingStats = async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query

    // Date range filter
    const dateFilter = {}
    if (start_date) dateFilter.createdAt = { $gte: new Date(start_date) }
    if (end_date) {
      const endDateObj = new Date(end_date)
      endDateObj.setHours(23, 59, 59, 999)
      dateFilter.createdAt = { ...dateFilter.createdAt, $lte: endDateObj }
    }

    // Get booking statistics
    const stats = await Booking.aggregate([
      { $match: dateFilter },
      {
        $facet: {
          statusStats: [
            {
              $group: {
                _id: "$status",
                count: { $sum: 1 },
                revenue: { $sum: "$total_amount" },
              },
            },
          ],
          sourceStats: [
            {
              $group: {
                _id: "$booking_source",
                count: { $sum: 1 },
                revenue: { $sum: "$total_amount" },
              },
            },
          ],
          dailyStats: [
            {
              $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                count: { $sum: 1 },
                revenue: { $sum: "$total_amount" },
              },
            },
            { $sort: { _id: 1 } },
          ],
          totalStats: [
            {
              $group: {
                _id: null,
                totalBookings: { $sum: 1 },
                totalRevenue: { $sum: "$total_amount" },
                avgBookingValue: { $avg: "$total_amount" },
              },
            },
          ],
        },
      },
    ])

    res.status(200).json({
      success: true,
      data: {
        byStatus: stats[0].statusStats,
        bySource: stats[0].sourceStats,
        daily: stats[0].dailyStats,
        totals: stats[0].totalStats[0] || {
          totalBookings: 0,
          totalRevenue: 0,
          avgBookingValue: 0,
        },
      },
    })
  } catch (error) {
    next(error)
  }
}

// Get booking calendar data
export const getBookingCalendar = async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query

    if (!start_date || !end_date) {
      return next(new ApiError("Start date and end date are required", 400))
    }

    // Find bookings in the date range
    const bookings = await Booking.find({
      $or: [
        { check_in: { $lte: new Date(end_date), $gte: new Date(start_date) } },
        { check_out: { $gte: new Date(start_date), $lte: new Date(end_date) } },
        {
          $and: [{ check_in: { $lte: new Date(start_date) } }, { check_out: { $gte: new Date(end_date) } }],
        },
      ],
      status: { $nin: ["cancelled", "no_show"] },
    })
      .populate("guest", "full_name")
      .populate("room", "number")
      .select("guest room check_in check_out status")

    // Format data for calendar
    const calendarData = bookings.map((booking) => ({
      id: booking._id,
      title: `${booking.guest.full_name} - Room ${booking.room.number}`,
      start: booking.check_in,
      end: booking.check_out,
      status: booking.status,
      resourceId: booking.room._id, // For room-based view
    }))

    res.status(200).json({
      success: true,
      count: calendarData.length,
      data: calendarData,
    })
  } catch (error) {
    next(error)
  }
}

export default {
  getAllBookings,
  getBookingById,
  createBooking,
  updateBooking,
  cancelBooking,
  checkIn,
  checkOut,
  getAvailableRooms,
  getBookingStats,
  getBookingCalendar,
}

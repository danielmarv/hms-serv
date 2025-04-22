import Guest from "../models/Guest.js"
import Booking from "../models/Booking.js"
import { ApiError } from "../utils/apiError.js"

// Get all guests with filtering, pagination, and sorting
export const getAllGuests = async (req, res, next) => {
  try {
    const {
      search,
      email,
      phone,
      nationality,
      vip,
      blacklisted,
      loyalty_member,
      loyalty_tier,
      page = 1,
      limit = 20,
      sort = "-createdAt",
    } = req.query

    // Build filter object
    const filter = {}

    // Search functionality
    if (search) {
      filter.$or = [
        { full_name: new RegExp(search, "i") },
        { email: new RegExp(search, "i") },
        { phone: new RegExp(search, "i") },
        { "address.city": new RegExp(search, "i") },
        { "address.country": new RegExp(search, "i") },
      ]
    }

    if (email) filter.email = new RegExp(email, "i")
    if (phone) filter.phone = new RegExp(phone, "i")
    if (nationality) filter.nationality = new RegExp(nationality, "i")
    if (vip !== undefined) filter.vip = vip === "true"
    if (blacklisted !== undefined) filter.blacklisted = blacklisted === "true"
    if (loyalty_member !== undefined) filter["loyalty_program.member"] = loyalty_member === "true"
    if (loyalty_tier) filter["loyalty_program.tier"] = loyalty_tier

    // Calculate pagination
    const skip = (Number(page) - 1) * Number(limit)

    // Execute query with pagination and sorting
    const guests = await Guest.find(filter).sort(sort).skip(skip).limit(Number(limit))

    // Get total count for pagination
    const total = await Guest.countDocuments(filter)

    res.status(200).json({
      success: true,
      count: guests.length,
      total,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
      data: guests,
    })
  } catch (error) {
    next(error)
  }
}

// Get guest by ID
export const getGuestById = async (req, res, next) => {
  try {
    const guest = await Guest.findById(req.params.id)
      .populate("stay_history.favorite_room_type", "name category")
      .populate("createdBy", "full_name")
      .populate("updatedBy", "full_name")

    if (!guest) {
      return next(new ApiError("Guest not found", 404))
    }

    res.status(200).json({
      success: true,
      data: guest,
    })
  } catch (error) {
    next(error)
  }
}

// Create new guest
export const createGuest = async (req, res, next) => {
  try {
    const {
      full_name,
      email,
      phone,
      gender,
      dob,
      nationality,
      id_type,
      id_number,
      id_expiry,
      address,
      preferences,
      loyalty_program,
      marketing_preferences,
      notes,
      tags,
      vip,
      company,
      emergency_contact,
    } = req.body

    // Check if guest with same email or phone already exists
    if (email) {
      const existingGuest = await Guest.findOne({ email })
      if (existingGuest) {
        return next(new ApiError("Guest with this email already exists", 400))
      }
    }

    if (phone) {
      const existingGuest = await Guest.findOne({ phone })
      if (existingGuest) {
        return next(new ApiError("Guest with this phone number already exists", 400))
      }
    }

    // Create guest
    const guest = await Guest.create({
      full_name,
      email,
      phone,
      gender,
      dob,
      nationality,
      id_type,
      id_number,
      id_expiry,
      address,
      preferences,
      loyalty_program,
      marketing_preferences,
      notes,
      tags,
      vip,
      company,
      emergency_contact,
      createdBy: req.user.id,
      updatedBy: req.user.id,
    })

    res.status(201).json({
      success: true,
      data: guest,
    })
  } catch (error) {
    next(error)
  }
}

// Update guest
export const updateGuest = async (req, res, next) => {
  try {
    const {
      full_name,
      email,
      phone,
      gender,
      dob,
      nationality,
      id_type,
      id_number,
      id_expiry,
      address,
      preferences,
      loyalty_program,
      marketing_preferences,
      notes,
      tags,
      vip,
      blacklisted,
      blacklist_reason,
      company,
      emergency_contact,
    } = req.body

    // Check if guest exists
    const guest = await Guest.findById(req.params.id)
    if (!guest) {
      return next(new ApiError("Guest not found", 404))
    }

    // Check if email is being changed and if it's already in use
    if (email && email !== guest.email) {
      const existingGuest = await Guest.findOne({ email, _id: { $ne: req.params.id } })
      if (existingGuest) {
        return next(new ApiError("Email is already in use by another guest", 400))
      }
    }

    // Check if phone is being changed and if it's already in use
    if (phone && phone !== guest.phone) {
      const existingGuest = await Guest.findOne({ phone, _id: { $ne: req.params.id } })
      if (existingGuest) {
        return next(new ApiError("Phone number is already in use by another guest", 400))
      }
    }

    // Update guest
    const updatedGuest = await Guest.findByIdAndUpdate(
      req.params.id,
      {
        full_name,
        email,
        phone,
        gender,
        dob,
        nationality,
        id_type,
        id_number,
        id_expiry,
        address,
        preferences,
        loyalty_program,
        marketing_preferences,
        notes,
        tags,
        vip,
        blacklisted,
        blacklist_reason,
        company,
        emergency_contact,
        updatedBy: req.user.id,
      },
      { new: true, runValidators: true },
    )

    res.status(200).json({
      success: true,
      data: updatedGuest,
    })
  } catch (error) {
    next(error)
  }
}

// Delete guest
export const deleteGuest = async (req, res, next) => {
  try {
    const guest = await Guest.findById(req.params.id)
    if (!guest) {
      return next(new ApiError("Guest not found", 404))
    }

    // Check if guest has any bookings
    const bookings = await Booking.countDocuments({ guest: req.params.id })
    if (bookings > 0) {
      return next(
        new ApiError(
          "Cannot delete guest with existing bookings. Consider marking as inactive or blacklisted instead.",
          400,
        ),
      )
    }

    await guest.deleteOne()

    res.status(200).json({
      success: true,
      message: "Guest deleted successfully",
    })
  } catch (error) {
    next(error)
  }
}

// Get guest booking history
export const getGuestBookingHistory = async (req, res, next) => {
  try {
    const guest = await Guest.findById(req.params.id)
    if (!guest) {
      return next(new ApiError("Guest not found", 404))
    }

    const bookings = await Booking.find({ guest: req.params.id })
      .populate("room", "number floor building")
      .populate("rate_plan", "title price")
      .sort("-check_in")
      .select("room check_in check_out status total_amount payment_status")

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings,
    })
  } catch (error) {
    next(error)
  }
}

// Update guest loyalty status
export const updateGuestLoyalty = async (req, res, next) => {
  try {
    const { member, points, tier, membership_number } = req.body

    const guest = await Guest.findById(req.params.id)
    if (!guest) {
      return next(new ApiError("Guest not found", 404))
    }

    // Update loyalty program
    guest.loyalty_program = {
      ...guest.loyalty_program,
      member: member !== undefined ? member : guest.loyalty_program.member,
      points: points !== undefined ? points : guest.loyalty_program.points,
      tier: tier || guest.loyalty_program.tier,
      membership_number: membership_number || guest.loyalty_program.membership_number,
      member_since: guest.loyalty_program.member_since || (member ? new Date() : undefined),
    }

    guest.updatedBy = req.user.id
    await guest.save()

    res.status(200).json({
      success: true,
      message: "Guest loyalty program updated successfully",
      data: guest.loyalty_program,
    })
  } catch (error) {
    next(error)
  }
}

// Toggle guest VIP status
export const toggleVipStatus = async (req, res, next) => {
  try {
    const guest = await Guest.findById(req.params.id)
    if (!guest) {
      return next(new ApiError("Guest not found", 404))
    }

    guest.vip = !guest.vip
    guest.updatedBy = req.user.id
    await guest.save()

    res.status(200).json({
      success: true,
      message: `Guest VIP status ${guest.vip ? "enabled" : "disabled"} successfully`,
      data: { vip: guest.vip },
    })
  } catch (error) {
    next(error)
  }
}

// Toggle guest blacklist status
export const toggleBlacklistStatus = async (req, res, next) => {
  try {
    const { blacklisted, reason } = req.body

    const guest = await Guest.findById(req.params.id)
    if (!guest) {
      return next(new ApiError("Guest not found", 404))
    }

    // If blacklisting, require a reason
    if (blacklisted && !reason) {
      return next(new ApiError("Reason is required when blacklisting a guest", 400))
    }

    guest.blacklisted = blacklisted
    guest.blacklist_reason = blacklisted ? reason : ""
    guest.updatedBy = req.user.id
    await guest.save()

    res.status(200).json({
      success: true,
      message: `Guest ${blacklisted ? "blacklisted" : "removed from blacklist"} successfully`,
      data: { blacklisted: guest.blacklisted, reason: guest.blacklist_reason },
    })
  } catch (error) {
    next(error)
  }
}

// Get guest statistics
export const getGuestStats = async (req, res, next) => {
  try {
    const stats = await Guest.aggregate([
      {
        $facet: {
          totalGuests: [{ $count: "count" }],
          vipGuests: [{ $match: { vip: true } }, { $count: "count" }],
          blacklistedGuests: [{ $match: { blacklisted: true } }, { $count: "count" }],
          loyaltyMembers: [{ $match: { "loyalty_program.member": true } }, { $count: "count" }],
          loyaltyTiers: [
            { $match: { "loyalty_program.member": true } },
            { $group: { _id: "$loyalty_program.tier", count: { $sum: 1 } } },
          ],
          nationalityDistribution: [
            { $match: { nationality: { $exists: true, $ne: "" } } },
            { $group: { _id: "$nationality", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 },
          ],
          recentGuests: [
            { $sort: { createdAt: -1 } },
            { $limit: 5 },
            { $project: { full_name: 1, email: 1, phone: 1 } },
          ],
        },
      },
    ])

    // Format the results
    const formattedStats = {
      totalGuests: stats[0].totalGuests[0]?.count || 0,
      vipGuests: stats[0].vipGuests[0]?.count || 0,
      blacklistedGuests: stats[0].blacklistedGuests[0]?.count || 0,
      loyaltyMembers: stats[0].loyaltyMembers[0]?.count || 0,
      loyaltyTiers: stats[0].loyaltyTiers,
      nationalityDistribution: stats[0].nationalityDistribution,
      recentGuests: stats[0].recentGuests,
    }

    res.status(200).json({
      success: true,
      data: formattedStats,
    })
  } catch (error) {
    next(error)
  }
}

export default {
  getAllGuests,
  getGuestById,
  createGuest,
  updateGuest,
  deleteGuest,
  getGuestBookingHistory,
  updateGuestLoyalty,
  toggleVipStatus,
  toggleBlacklistStatus,
  getGuestStats,
}

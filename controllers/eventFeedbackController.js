import EventFeedback from "../models/EventFeedback.js"
import EventBooking from "../models/EventBooking.js"
import { successResponse, errorResponse } from "../utils/responseHandler.js"

/**
 * Get all feedback for a hotel
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getAllFeedback = async (req, res) => {
  try {
    const { hotel, eventType, rating, limit = 20, page = 1 } = req.query
    const skip = (page - 1) * limit

    const query = {}
    if (hotel) query.hotel = hotel
    if (eventType) query.eventType = eventType
    if (rating) query.rating = { $gte: Number.parseInt(rating) }

    const feedback = await EventFeedback.find(query)
      .populate("booking", "eventName startDate endDate")
      .populate("customer", "firstName lastName email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number.parseInt(limit))

    const total = await EventFeedback.countDocuments(query)

    return successResponse(res, {
      feedback,
      pagination: {
        total,
        page: Number.parseInt(page),
        pages: Math.ceil(total / limit),
        limit: Number.parseInt(limit),
      },
    })
  } catch (error) {
    return errorResponse(res, "Failed to fetch feedback", 500, error)
  }
}

/**
 * Get feedback by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getFeedbackById = async (req, res) => {
  try {
    const feedback = await EventFeedback.findById(req.params.id)
      .populate("booking", "eventName startDate endDate venue")
      .populate("customer", "firstName lastName email phone")
      .populate("eventType")

    if (!feedback) {
      return errorResponse(res, "Feedback not found", 404)
    }

    return successResponse(res, { feedback })
  } catch (error) {
    return errorResponse(res, "Failed to fetch feedback", 500, error)
  }
}

/**
 * Create new feedback
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const createFeedback = async (req, res) => {
  try {
    const { booking, rating, comments, categories } = req.body

    // Verify booking exists and is completed
    const bookingRecord = await EventBooking.findById(booking)
    if (!bookingRecord) {
      return errorResponse(res, "Booking not found", 404)
    }

    if (bookingRecord.status !== "completed") {
      return errorResponse(res, "Feedback can only be submitted for completed events", 400)
    }

    // Check if feedback already exists for this booking
    const existingFeedback = await EventFeedback.findOne({ booking })
    if (existingFeedback) {
      return errorResponse(res, "Feedback already submitted for this booking", 400)
    }

    // Create feedback
    const newFeedback = new EventFeedback({
      booking,
      customer: bookingRecord.customer,
      hotel: bookingRecord.hotel,
      eventType: bookingRecord.eventType,
      rating,
      comments,
      categories: categories || [],
      createdBy: req.user._id,
    })

    await newFeedback.save()

    // Update booking to mark feedback as received
    await EventBooking.findByIdAndUpdate(booking, {
      hasFeedback: true,
      updatedBy: req.user._id,
    })

    return successResponse(res, { feedback: newFeedback }, 201)
  } catch (error) {
    return errorResponse(res, "Failed to create feedback", 500, error)
  }
}

/**
 * Update feedback response
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const respondToFeedback = async (req, res) => {
  try {
    const { response } = req.body

    if (!response) {
      return errorResponse(res, "Response is required", 400)
    }

    const feedback = await EventFeedback.findByIdAndUpdate(
      req.params.id,
      {
        response,
        responseDate: new Date(),
        respondedBy: req.user._id,
        isResponded: true,
        updatedBy: req.user._id,
      },
      { new: true, runValidators: true },
    )

    if (!feedback) {
      return errorResponse(res, "Feedback not found", 404)
    }

    return successResponse(res, { feedback })
  } catch (error) {
    return errorResponse(res, "Failed to respond to feedback", 500, error)
  }
}

/**
 * Get feedback statistics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getFeedbackStats = async (req, res) => {
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

    // Overall statistics
    const totalFeedback = await EventFeedback.countDocuments(query)
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

    // Category analysis
    const categoryAnalysis = await EventFeedback.aggregate([
      { $match: query },
      { $unwind: "$categories" },
      { $group: { _id: "$categories.name", avgRating: { $avg: "$categories.rating" }, count: { $sum: 1 } } },
      { $sort: { avgRating: -1 } },
    ])

    // Event type analysis
    const eventTypeAnalysis = await EventFeedback.aggregate([
      { $match: query },
      { $lookup: { from: "eventtypes", localField: "eventType", foreignField: "_id", as: "eventTypeInfo" } },
      { $unwind: "$eventTypeInfo" },
      {
        $group: {
          _id: "$eventTypeInfo._id",
          name: { $first: "$eventTypeInfo.name" },
          avgRating: { $avg: "$rating" },
          count: { $sum: 1 },
        },
      },
      { $sort: { avgRating: -1 } },
    ])

    return successResponse(res, {
      stats: {
        totalFeedback,
        averageRating: averageRating.length > 0 ? averageRating[0].avgRating : 0,
        ratingDistribution: ratingDistribution.map((item) => ({
          rating: item._id,
          count: item.count,
          percentage: (item.count / totalFeedback) * 100,
        })),
        categoryAnalysis,
        eventTypeAnalysis,
      },
    })
  } catch (error) {
    return errorResponse(res, "Failed to fetch feedback statistics", 500, error)
  }
}

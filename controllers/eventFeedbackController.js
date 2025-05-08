import EventFeedback from "../models/EventFeedback.js"
import { successResponse, errorResponse } from "../utils/responseHandler.js"

// Get all feedback
export const getAllFeedback = async (req, res) => {
  try {
    const feedback = await EventFeedback.find()
      .populate("event", "name startDate endDate")
      .populate("submittedBy", "name email")

    return successResponse(res, {
      message: "Feedback retrieved successfully",
      data: feedback,
    })
  } catch (error) {
    return errorResponse(res, "Failed to retrieve feedback", 500, error)
  }
}

// Get feedback by ID
export const getFeedbackById = async (req, res) => {
  try {
    const feedback = await EventFeedback.findById(req.params.id)
      .populate("event", "name startDate endDate")
      .populate("submittedBy", "name email")

    if (!feedback) {
      return errorResponse(res, "Feedback not found", 404)
    }

    return successResponse(res, {
      message: "Feedback retrieved successfully",
      data: feedback,
    })
  } catch (error) {
    return errorResponse(res, "Failed to retrieve feedback", 500, error)
  }
}

// Create new feedback
export const createFeedback = async (req, res) => {
  try {
    const { event, rating, comments, categories } = req.body

    const feedback = await EventFeedback.create({
      event,
      submittedBy: req.user.id,
      rating,
      comments,
      categories,
    })

    return successResponse(
      res,
      {
        message: "Feedback submitted successfully",
        data: feedback,
      },
      201,
    )
  } catch (error) {
    return errorResponse(res, "Failed to create feedback", 500, error)
  }
}

// Update feedback
export const updateFeedback = async (req, res) => {
  try {
    const { rating, comments, categories } = req.body

    const feedback = await EventFeedback.findById(req.params.id)

    if (!feedback) {
      return errorResponse(res, "Feedback not found", 404)
    }

    feedback.rating = rating || feedback.rating
    feedback.comments = comments || feedback.comments
    feedback.categories = categories || feedback.categories

    await feedback.save()

    return successResponse(res, {
      message: "Feedback updated successfully",
      data: feedback,
    })
  } catch (error) {
    return errorResponse(res, "Failed to update feedback", 500, error)
  }
}

// Delete feedback
export const deleteFeedback = async (req, res) => {
  try {
    const feedback = await EventFeedback.findById(req.params.id)

    if (!feedback) {
      return errorResponse(res, "Feedback not found", 404)
    }

    await feedback.deleteOne()

    return successResponse(res, {
      message: "Feedback deleted successfully",
    })
  } catch (error) {
    return errorResponse(res, "Failed to delete feedback", 500, error)
  }
}

// Get all feedback for a specific event
export const getEventFeedback = async (req, res) => {
  try {
    const { eventId } = req.params

    const feedback = await EventFeedback.find({ event: eventId }).populate("submittedBy", "name email")

    return successResponse(res, {
      message: "Event feedback retrieved successfully",
      data: feedback,
    })
  } catch (error) {
    return errorResponse(res, "Failed to retrieve event feedback", 500, error)
  }
}

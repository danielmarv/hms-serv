import mongoose from "mongoose"

const eventFeedbackSchema = new mongoose.Schema(
  {
    hotel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: [true, "Hotel ID is required"],
    },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EventBooking",
      required: [true, "Event ID is required"],
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Guest",
      required: [true, "Customer ID is required"],
    },
    overallRating: {
      type: Number,
      required: [true, "Overall rating is required"],
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating cannot exceed 5"],
    },
    categories: {
      venue: {
        rating: {
          type: Number,
          min: [1, "Rating must be at least 1"],
          max: [5, "Rating cannot exceed 5"],
        },
        comments: {
          type: String,
          trim: true,
        },
      },
      catering: {
        rating: {
          type: Number,
          min: [1, "Rating must be at least 1"],
          max: [5, "Rating cannot exceed 5"],
        },
        comments: {
          type: String,
          trim: true,
        },
      },
      staff: {
        rating: {
          type: Number,
          min: [1, "Rating must be at least 1"],
          max: [5, "Rating cannot exceed 5"],
        },
        comments: {
          type: String,
          trim: true,
        },
      },
      value: {
        rating: {
          type: Number,
          min: [1, "Rating must be at least 1"],
          max: [5, "Rating cannot exceed 5"],
        },
        comments: {
          type: String,
          trim: true,
        },
      },
    },
    comments: {
      type: String,
      trim: true,
    },
    wouldRecommend: {
      type: Boolean,
    },
    improvementSuggestions: {
      type: String,
      trim: true,
    },
    photos: [
      {
        url: {
          type: String,
          required: true,
        },
        caption: {
          type: String,
          trim: true,
        },
      },
    ],
    isPublic: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: {
        values: ["pending", "approved", "rejected", "archived"],
        message: "Invalid status",
      },
      default: "pending",
    },
    adminResponse: {
      content: {
        type: String,
        trim: true,
      },
      respondedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      respondedAt: {
        type: Date,
      },
    },
    followUpRequired: {
      type: Boolean,
      default: false,
    },
    followUpNotes: {
      type: String,
      trim: true,
    },
    followUpCompletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    followUpCompletedAt: {
      type: Date,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      select: false,
    },
  },
  {
    timestamps: true,
  },
)

// Index for efficient queries
eventFeedbackSchema.index({ hotel: 1, event: 1 })
eventFeedbackSchema.index({ customer: 1 })
eventFeedbackSchema.index({ overallRating: 1 })
eventFeedbackSchema.index({ status: 1 })
eventFeedbackSchema.index({ isDeleted: 1 })

const EventFeedback = mongoose.model("EventFeedback", eventFeedbackSchema)

export default EventFeedback

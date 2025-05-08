import mongoose from "mongoose"

const eventTypeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Event type name is required"],
      trim: true,
      unique: true,
      maxlength: [50, "Event type name cannot exceed 50 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: {
        values: ["business", "social", "celebration", "educational", "other"],
        message: "Invalid event category",
      },
    },
    icon: {
      type: String,
      default: "calendar",
    },
    color: {
      type: String,
      default: "#3498db",
    },
    defaultDuration: {
      type: Number,
      default: 4,
      min: [1, "Default duration must be at least 1 hour"],
      description: "Default duration in hours",
    },
    suggestedVenueTypes: [
      {
        type: String,
        enum: {
          values: [
            "conference_hall",
            "garden",
            "ballroom",
            "meeting_room",
            "banquet_hall",
            "poolside",
            "rooftop",
            "other",
          ],
          message: "Invalid venue type",
        },
      },
    ],
    requiredServices: [
      {
        type: String,
        trim: true,
      },
    ],
    recommendedServices: [
      {
        type: String,
        trim: true,
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
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
eventTypeSchema.index({ category: 1, isActive: 1 })
eventTypeSchema.index({ isDeleted: 1 })

const EventType = mongoose.model("EventType", eventTypeSchema)

export default EventType

import mongoose from "mongoose"

const eventTemplateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Template name is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    eventType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EventType",
      required: [true, "Event type is required"],
    },
    venue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EventVenue",
      required: [true, "Venue is required"],
    },
    duration: {
      type: Number, // in minutes
      required: [true, "Duration is required"],
      min: [1, "Duration must be at least 1 minute"],
    },
    capacity: {
      type: Number,
      min: [1, "Capacity must be at least 1 person"],
    },
    basePrice: {
      type: Number,
      required: [true, "Base price is required"],
      min: [0, "Base price cannot be negative"],
    },
    services: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "EventService",
      },
    ],
    staffing: [
      {
        role: {
          type: String,
          required: [true, "Staff role is required"],
        },
        count: {
          type: Number,
          required: [true, "Staff count is required"],
          min: [1, "At least one staff member is required"],
        },
      },
    ],
    setupTime: {
      type: Number, // in minutes
      default: 30,
      min: [0, "Setup time cannot be negative"],
    },
    teardownTime: {
      type: Number, // in minutes
      default: 30,
      min: [0, "Teardown time cannot be negative"],
    },
    includedItems: [
      {
        type: String,
        trim: true,
      },
    ],
    terms: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: [true, "Hotel ID is required"],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  },
)

// Add indexes for common queries
eventTemplateSchema.index({ hotelId: 1, name: 1 })
eventTemplateSchema.index({ eventType: 1 })
eventTemplateSchema.index({ isActive: 1 })

const EventTemplate = mongoose.model("EventTemplate", eventTemplateSchema)

export default EventTemplate

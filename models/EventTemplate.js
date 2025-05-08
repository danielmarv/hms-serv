import mongoose from "mongoose"

const eventTemplateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Template name is required"],
      trim: true,
      maxlength: [100, "Template name cannot exceed 100 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    hotel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: [true, "Hotel is required"],
    },
    eventType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EventType",
      required: [true, "Event type is required"],
    },
    venue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EventVenue",
    },
    duration: {
      type: Number, // in hours
      default: 4,
    },
    setupTime: {
      type: Number, // in hours
      default: 1,
    },
    teardownTime: {
      type: Number, // in hours
      default: 1,
    },
    services: [
      {
        service: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "EventService",
          required: true,
        },
        quantity: {
          type: Number,
          default: 1,
          min: [1, "Quantity must be at least 1"],
        },
        notes: String,
      },
    ],
    guestCapacity: {
      type: Number,
      min: [1, "Guest capacity must be at least 1"],
    },
    defaultPrice: {
      type: Number,
      min: [0, "Price cannot be negative"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    settings: {
      requiresDeposit: {
        type: Boolean,
        default: false,
      },
      depositPercentage: {
        type: Number,
        min: [0, "Deposit percentage cannot be negative"],
        max: [100, "Deposit percentage cannot exceed 100"],
      },
      cancellationPolicy: {
        type: String,
        enum: ["flexible", "moderate", "strict"],
        default: "moderate",
      },
      customFields: [
        {
          name: String,
          type: {
            type: String,
            enum: ["text", "number", "date", "boolean", "select"],
            default: "text",
          },
          required: Boolean,
          options: [String], // For select type
        },
      ],
    },
    createdFrom: {
      event: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "EventBooking",
      },
      name: String,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
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

// Add indexes
eventTemplateSchema.index({ hotel: 1, name: 1 }, { unique: true })
eventTemplateSchema.index({ hotel: 1, eventType: 1 })
eventTemplateSchema.index({ isActive: 1 })

const EventTemplate = mongoose.model("EventTemplate", eventTemplateSchema)

export default EventTemplate

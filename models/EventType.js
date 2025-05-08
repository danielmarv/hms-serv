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
    subcategory: {
      type: String,
      trim: true,
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
    defaultSetup: {
      layout: {
        type: String,
        enum: {
          values: ["theater", "classroom", "boardroom", "u_shape", "banquet", "reception", "custom"],
          message: "Invalid layout type",
        },
        default: "theater",
      },
      notes: {
        type: String,
        trim: true,
      },
    },
    pricing: {
      basePriceAdjustment: {
        type: Number,
        default: 0,
        description: "Amount to add to venue base price",
      },
      priceMultiplier: {
        type: Number,
        default: 1,
        min: [0.1, "Price multiplier must be at least 0.1"],
        description: "Multiplier to apply to total price",
      },
    },
    checklist: [
      {
        task: {
          type: String,
          required: true,
          trim: true,
        },
        description: {
          type: String,
          trim: true,
        },
        daysBeforeEvent: {
          type: Number,
          required: true,
          min: [0, "Days before event must be non-negative"],
        },
        isRequired: {
          type: Boolean,
          default: true,
        },
      },
    ],
    marketingMaterials: [
      {
        name: {
          type: String,
          required: true,
          trim: true,
        },
        description: {
          type: String,
          trim: true,
        },
        fileUrl: {
          type: String,
        },
        type: {
          type: String,
          enum: {
            values: ["image", "document", "video", "other"],
            message: "Invalid material type",
          },
          default: "image",
        },
      },
    ],
    contractTemplateUrl: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      select: false,
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

// Index for efficient queries
eventTypeSchema.index({ category: 1, isActive: 1 })
eventTypeSchema.index({ isDeleted: 1 })

const EventType = mongoose.model("EventType", eventTypeSchema)

export default EventType

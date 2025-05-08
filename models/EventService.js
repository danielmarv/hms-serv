import mongoose from "mongoose"

const eventServiceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Service name is required"],
      trim: true,
      maxlength: [100, "Service name cannot exceed 100 characters"],
    },
    hotel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: [true, "Hotel ID is required"],
    },
    category: {
      type: String,
      required: [true, "Service category is required"],
      enum: {
        values: ["decoration", "entertainment", "technology", "staffing", "photography", "transportation", "other"],
        message: "Invalid service category",
      },
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },
    priceType: {
      type: String,
      enum: {
        values: ["flat", "per_hour", "per_person", "per_day"],
        message: "Invalid price type",
      },
      default: "flat",
    },
    minimumQuantity: {
      type: Number,
      default: 1,
      min: [1, "Minimum quantity must be at least 1"],
    },
    maximumQuantity: {
      type: Number,
      min: [1, "Maximum quantity must be at least 1"],
    },
    leadTime: {
      type: Number,
      default: 24,
      description: "Lead time in hours",
    },
    cancellationPolicy: {
      type: String,
      enum: {
        values: ["flexible", "moderate", "strict"],
        message: "Invalid cancellation policy",
      },
      default: "moderate",
    },
    images: [
      {
        url: {
          type: String,
          required: [true, "Image URL is required"],
        },
        caption: {
          type: String,
          trim: true,
        },
      },
    ],
    isExternalVendor: {
      type: Boolean,
      default: false,
    },
    vendorDetails: {
      name: {
        type: String,
        trim: true,
      },
      contactPerson: {
        type: String,
        trim: true,
      },
      email: {
        type: String,
        trim: true,
        lowercase: true,
      },
      phone: {
        type: String,
        trim: true,
      },
      address: {
        type: String,
        trim: true,
      },
      notes: {
        type: String,
        trim: true,
      },
    },
    availability: {
      monday: { type: Boolean, default: true },
      tuesday: { type: Boolean, default: true },
      wednesday: { type: Boolean, default: true },
      thursday: { type: Boolean, default: true },
      friday: { type: Boolean, default: true },
      saturday: { type: Boolean, default: true },
      sunday: { type: Boolean, default: true },
    },
    status: {
      type: String,
      enum: {
        values: ["active", "inactive"],
        message: "Invalid service status",
      },
      default: "active",
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
eventServiceSchema.index({ hotel: 1, category: 1, status: 1 })
eventServiceSchema.index({ isDeleted: 1 })

const EventService = mongoose.model("EventService", eventServiceSchema)

export default EventService

import mongoose from "mongoose"

const eventServiceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Service name is required"],
      trim: true,
      maxlength: [100, "Service name cannot exceed 100 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },
    hotel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: [true, "Hotel ID is required"],
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: {
        values: [
          "catering",
          "decoration",
          "equipment",
          "entertainment",
          "staffing",
          "photography",
          "transportation",
          "security",
          "cleaning",
          "other",
        ],
        message: "Invalid service category",
      },
    },
    subcategory: {
      type: String,
      trim: true,
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },
    priceType: {
      type: String,
      enum: {
        values: ["flat", "per_person", "per_hour", "per_day", "custom"],
        message: "Invalid price type",
      },
      default: "flat",
    },
    customPriceDetails: {
      type: String,
      trim: true,
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
      min: [0, "Lead time cannot be negative"],
      description: "Lead time in hours",
    },
    duration: {
      type: Number,
      min: [0, "Duration cannot be negative"],
      description: "Duration in hours",
    },
    setupTime: {
      type: Number,
      default: 30,
      min: [0, "Setup time cannot be negative"],
      description: "Setup time in minutes",
    },
    cleanupTime: {
      type: Number,
      default: 30,
      min: [0, "Cleanup time cannot be negative"],
      description: "Cleanup time in minutes",
    },
    images: [
      {
        url: {
          type: String,
          required: true,
        },
        caption: {
          type: String,
          trim: true,
        },
        isDefault: {
          type: Boolean,
          default: false,
        },
      },
    ],
    options: [
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
        additionalPrice: {
          type: Number,
          required: true,
          min: [0, "Additional price cannot be negative"],
        },
      },
    ],
    inventory: {
      isLimited: {
        type: Boolean,
        default: false,
      },
      totalQuantity: {
        type: Number,
        min: [0, "Total quantity cannot be negative"],
      },
      availableQuantity: {
        type: Number,
        min: [0, "Available quantity cannot be negative"],
      },
      lowStockThreshold: {
        type: Number,
        min: [0, "Low stock threshold cannot be negative"],
      },
    },
    externalProvider: {
      name: {
        type: String,
        trim: true,
      },
      contactPerson: {
        type: String,
        trim: true,
      },
      phone: {
        type: String,
        trim: true,
      },
      email: {
        type: String,
        trim: true,
        lowercase: true,
      },
      contractDetails: {
        type: String,
        trim: true,
      },
      commissionRate: {
        type: Number,
        min: [0, "Commission rate cannot be negative"],
        max: [100, "Commission rate cannot exceed 100"],
      },
    },
    isExternalService: {
      type: Boolean,
      default: false,
    },
    restrictions: {
      venueTypes: [
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
      eventTypes: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "EventType",
        },
      ],
      minCapacity: {
        type: Number,
        min: [0, "Minimum capacity cannot be negative"],
      },
      maxCapacity: {
        type: Number,
        min: [0, "Maximum capacity cannot be negative"],
      },
      availableDays: {
        monday: { type: Boolean, default: true },
        tuesday: { type: Boolean, default: true },
        wednesday: { type: Boolean, default: true },
        thursday: { type: Boolean, default: true },
        friday: { type: Boolean, default: true },
        saturday: { type: Boolean, default: true },
        sunday: { type: Boolean, default: true },
      },
    },
    status: {
      type: String,
      enum: {
        values: ["active", "inactive", "seasonal"],
        message: "Invalid service status",
      },
      default: "active",
    },
    seasonalAvailability: {
      isAvailable: {
        type: Boolean,
        default: true,
      },
      startDate: {
        type: Date,
      },
      endDate: {
        type: Date,
      },
      description: {
        type: String,
        trim: true,
      },
    },
    reviews: [
      {
        rating: {
          type: Number,
          required: true,
          min: [1, "Rating must be at least 1"],
          max: [5, "Rating cannot exceed 5"],
        },
        comment: {
          type: String,
          trim: true,
        },
        reviewer: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        date: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    averageRating: {
      type: Number,
      min: [0, "Average rating cannot be negative"],
      max: [5, "Average rating cannot exceed 5"],
      default: 0,
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
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
)

// Virtual for getting default image
eventServiceSchema.virtual("defaultImage").get(function () {
  const defaultImage = this.images.find((img) => img.isDefault)
  return defaultImage ? defaultImage.url : this.images.length > 0 ? this.images[0].url : null
})

// Pre-save middleware to ensure at least one default image
eventServiceSchema.pre("save", function (next) {
  if (this.images && this.images.length > 0) {
    const hasDefault = this.images.some((img) => img.isDefault)
    if (!hasDefault) {
      this.images[0].isDefault = true
    }
  }

  // Calculate average rating
  if (this.reviews && this.reviews.length > 0) {
    const totalRating = this.reviews.reduce((sum, review) => sum + review.rating, 0)
    this.averageRating = totalRating / this.reviews.length
  } else {
    this.averageRating = 0
  }

  next()
})

// Method to check service availability
eventServiceSchema.methods.checkAvailability = function (date, quantity = 1) {
  // Check if service is active
  if (this.status !== "active") {
    return {
      isAvailable: false,
      reason: `Service is currently ${this.status}`,
    }
  }

  // Check seasonal availability
  if (this.seasonalAvailability && !this.seasonalAvailability.isAvailable) {
    if (this.seasonalAvailability.startDate && this.seasonalAvailability.endDate) {
      const requestDate = new Date(date)
      const startDate = new Date(this.seasonalAvailability.startDate)
      const endDate = new Date(this.seasonalAvailability.endDate)

      if (requestDate < startDate || requestDate > endDate) {
        return {
          isAvailable: false,
          reason: `Service is only available from ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`,
        }
      }
    } else {
      return {
        isAvailable: false,
        reason: "Service is not available during this season",
      }
    }
  }

  // Check day of week availability
  const requestDate = new Date(date)
  const dayOfWeek = requestDate.toLocaleDateString("en-US", { weekday: "lowercase" })
  if (this.restrictions.availableDays && !this.restrictions.availableDays[dayOfWeek]) {
    return {
      isAvailable: false,
      reason: `Service is not available on ${dayOfWeek}s`,
    }
  }

  // Check inventory if applicable
  if (this.inventory && this.inventory.isLimited) {
    if (this.inventory.availableQuantity < quantity) {
      return {
        isAvailable: false,
        reason: `Only ${this.inventory.availableQuantity} units available, but ${quantity} requested`,
      }
    }
  }

  return {
    isAvailable: true,
  }
}

// Index for efficient queries
eventServiceSchema.index({ hotel: 1, category: 1, status: 1 })
eventServiceSchema.index({ isDeleted: 1 })

const EventService = mongoose.model("EventService", eventServiceSchema)

export default EventService

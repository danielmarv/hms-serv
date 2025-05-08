import mongoose from "mongoose"

const eventPackageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Package name is required"],
      trim: true,
      maxlength: [100, "Package name cannot exceed 100 characters"],
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
    eventTypes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "EventType",
      },
    ],
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
    duration: {
      type: Number,
      required: [true, "Duration is required"],
      min: [1, "Duration must be at least 1 hour"],
      description: "Duration in hours",
    },
    minCapacity: {
      type: Number,
      required: [true, "Minimum capacity is required"],
      min: [1, "Minimum capacity must be at least 1"],
    },
    maxCapacity: {
      type: Number,
      required: [true, "Maximum capacity is required"],
      min: [1, "Maximum capacity must be at least 1"],
    },
    basePrice: {
      type: Number,
      required: [true, "Base price is required"],
      min: [0, "Base price cannot be negative"],
    },
    pricePerPerson: {
      type: Number,
      default: 0,
      min: [0, "Price per person cannot be negative"],
    },
    includedServices: [
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
        details: {
          type: String,
          trim: true,
        },
      },
    ],
    includedAmenities: [
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
      },
    ],
    additionalOptions: [
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
        price: {
          type: Number,
          required: true,
          min: [0, "Price cannot be negative"],
        },
      },
    ],
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
    terms: {
      type: String,
      trim: true,
    },
    cancellationPolicy: {
      type: String,
      enum: {
        values: ["flexible", "moderate", "strict"],
        message: "Invalid cancellation policy",
      },
      default: "moderate",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isPromoted: {
      type: Boolean,
      default: false,
    },
    promotionDetails: {
      startDate: {
        type: Date,
      },
      endDate: {
        type: Date,
      },
      discountPercentage: {
        type: Number,
        min: [0, "Discount percentage cannot be negative"],
        max: [100, "Discount percentage cannot exceed 100"],
      },
      discountAmount: {
        type: Number,
        min: [0, "Discount amount cannot be negative"],
      },
      promotionCode: {
        type: String,
        trim: true,
      },
      description: {
        type: String,
        trim: true,
      },
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
eventPackageSchema.virtual("defaultImage").get(function () {
  const defaultImage = this.images.find((img) => img.isDefault)
  return defaultImage ? defaultImage.url : this.images.length > 0 ? this.images[0].url : null
})

// Method to calculate package price
eventPackageSchema.methods.calculatePrice = function (attendees, additionalOptions = []) {
  // Base price + per person price
  let totalPrice = this.basePrice + this.pricePerPerson * attendees

  // Add cost of selected additional options
  if (additionalOptions && additionalOptions.length > 0) {
    additionalOptions.forEach((option) => {
      const packageOption = this.additionalOptions.find((o) => o._id.toString() === option.optionId)
      if (packageOption) {
        totalPrice += packageOption.price * (option.quantity || 1)
      }
    })
  }

  // Apply promotion if active
  if (this.isPromoted && this.promotionDetails) {
    const now = new Date()
    if (
      (!this.promotionDetails.startDate || now >= this.promotionDetails.startDate) &&
      (!this.promotionDetails.endDate || now <= this.promotionDetails.endDate)
    ) {
      if (this.promotionDetails.discountPercentage) {
        totalPrice *= 1 - this.promotionDetails.discountPercentage / 100
      } else if (this.promotionDetails.discountAmount) {
        totalPrice -= this.promotionDetails.discountAmount
      }
    }
  }

  return Math.max(0, totalPrice)
}

// Index for efficient queries
eventPackageSchema.index({ hotel: 1, isActive: 1 })
eventPackageSchema.index({ eventTypes: 1 })
eventPackageSchema.index({ isDeleted: 1 })

// Pre-save middleware to ensure at least one default image
eventPackageSchema.pre("save", function (next) {
  if (this.images && this.images.length > 0) {
    const hasDefault = this.images.some((img) => img.isDefault)
    if (!hasDefault) {
      this.images[0].isDefault = true
    }
  }
  next()
})

const EventPackage = mongoose.model("EventPackage", eventPackageSchema)

export default EventPackage

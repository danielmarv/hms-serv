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
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },
    hotel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: [true, "Hotel ID is required"],
    },
    eventType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EventType",
      required: [true, "Event type ID is required"],
    },
    suggestedVenues: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "EventVenue",
      },
    ],
    defaultDuration: {
      type: Number,
      required: [true, "Default duration is required"],
      min: [1, "Default duration must be at least 1 hour"],
      description: "Default duration in hours",
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
    defaultServices: [
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
        isRequired: {
          type: Boolean,
          default: false,
        },
        notes: {
          type: String,
          trim: true,
        },
      },
    ],
    venueSetup: {
      layout: {
        type: String,
        enum: {
          values: ["theater", "classroom", "boardroom", "u_shape", "banquet", "reception", "custom"],
          message: "Invalid layout type",
        },
        default: "theater",
      },
      customLayoutDetails: {
        type: String,
        trim: true,
      },
      setupInstructions: {
        type: String,
        trim: true,
      },
    },
    catering: {
      isRequired: {
        type: Boolean,
        default: false,
      },
      suggestedMenus: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Menu",
        },
      ],
      mealType: {
        type: String,
        enum: {
          values: ["breakfast", "lunch", "dinner", "cocktail", "buffet", "custom"],
          message: "Invalid meal type",
        },
      },
      notes: {
        type: String,
        trim: true,
      },
    },
    equipment: [
      {
        name: {
          type: String,
          required: [true, "Equipment name is required"],
          trim: true,
        },
        quantity: {
          type: Number,
          required: [true, "Quantity is required"],
          min: [1, "Quantity must be at least 1"],
        },
        isRequired: {
          type: Boolean,
          default: false,
        },
        setupInstructions: {
          type: String,
          trim: true,
        },
      },
    ],
    staffing: [
      {
        role: {
          type: String,
          required: [true, "Staff role is required"],
          trim: true,
        },
        count: {
          type: Number,
          required: [true, "Staff count is required"],
          min: [1, "Staff count must be at least 1"],
        },
        isRequired: {
          type: Boolean,
          default: false,
        },
        notes: {
          type: String,
          trim: true,
        },
      },
    ],
    pricing: {
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
      minimumSpend: {
        type: Number,
        min: [0, "Minimum spend cannot be negative"],
      },
    },
    timeline: [
      {
        time: {
          type: String,
          required: [true, "Timeline time is required"],
          trim: true,
        },
        description: {
          type: String,
          required: [true, "Timeline description is required"],
          trim: true,
        },
        notes: {
          type: String,
          trim: true,
        },
      },
    ],
    checklist: [
      {
        task: {
          type: String,
          required: [true, "Task is required"],
          trim: true,
        },
        description: {
          type: String,
          trim: true,
        },
        daysBeforeEvent: {
          type: Number,
          required: [true, "Days before event is required"],
          min: [0, "Days before event must be non-negative"],
        },
        isRequired: {
          type: Boolean,
          default: true,
        },
        assignedRole: {
          type: String,
          trim: true,
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
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
)

// Virtual for getting default image
eventTemplateSchema.virtual("defaultImage").get(function () {
  const defaultImage = this.images.find((img) => img.isDefault)
  return defaultImage ? defaultImage.url : this.images.length > 0 ? this.images[0].url : null
})

// Pre-save middleware to ensure at least one default image
eventTemplateSchema.pre("save", function (next) {
  if (this.images && this.images.length > 0) {
    const hasDefault = this.images.some((img) => img.isDefault)
    if (!hasDefault) {
      this.images[0].isDefault = true
    }
  }
  next()
})

// Method to calculate estimated price
eventTemplateSchema.methods.calculateEstimatedPrice = function (attendees, additionalServices = []) {
  // Base price + per person price
  let totalPrice = this.pricing.basePrice + this.pricing.pricePerPerson * attendees

  // Add cost of default services
  this.defaultServices.forEach((service) => {
    // This would require fetching actual service prices from the database
    // For simplicity, we'll assume the service price is included in the base price
  })

  // Apply minimum spend if applicable
  if (this.pricing.minimumSpend && totalPrice < this.pricing.minimumSpend) {
    totalPrice = this.pricing.minimumSpend
  }

  return totalPrice
}

// Index for efficient queries
eventTemplateSchema.index({ hotel: 1, eventType: 1, isActive: 1 })
eventTemplateSchema.index({ isDeleted: 1 })

const EventTemplate = mongoose.model("EventTemplate", eventTemplateSchema)

export default EventTemplate

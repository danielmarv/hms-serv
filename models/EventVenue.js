import mongoose from "mongoose"

const eventVenueSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Venue name is required"],
      trim: true,
      maxlength: [100, "Venue name cannot exceed 100 characters"],
    },
    hotel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: [true, "Hotel ID is required"],
    },
    type: {
      type: String,
      required: [true, "Venue type is required"],
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
    capacity: {
      min: {
        type: Number,
        required: [true, "Minimum capacity is required"],
        min: [1, "Minimum capacity must be at least 1"],
      },
      max: {
        type: Number,
        required: [true, "Maximum capacity is required"],
        min: [1, "Maximum capacity must be at least 1"],
      },
      optimal: {
        type: Number,
        min: [1, "Optimal capacity must be at least 1"],
      },
    },
    area: {
      value: {
        type: Number,
        required: [true, "Area value is required"],
        min: [1, "Area must be at least 1"],
      },
      unit: {
        type: String,
        required: [true, "Area unit is required"],
        enum: {
          values: ["sq_ft", "sq_m"],
          message: "Invalid area unit",
        },
        default: "sq_ft",
      },
    },
    dimensions: {
      length: {
        type: Number,
        min: [0, "Length cannot be negative"],
      },
      width: {
        type: Number,
        min: [0, "Width cannot be negative"],
      },
      height: {
        type: Number,
        min: [0, "Height cannot be negative"],
      },
      unit: {
        type: String,
        enum: {
          values: ["ft", "m"],
          message: "Invalid dimension unit",
        },
        default: "ft",
      },
    },
    basePrice: {
      type: Number,
      required: [true, "Base price is required"],
      min: [0, "Base price cannot be negative"],
    },
    pricePerHour: {
      type: Number,
      required: [true, "Price per hour is required"],
      min: [0, "Price per hour cannot be negative"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },
    features: [
      {
        type: String,
        trim: true,
      },
    ],
    amenities: [
      {
        name: {
          type: String,
          required: [true, "Amenity name is required"],
          trim: true,
        },
        description: {
          type: String,
          trim: true,
        },
        additionalCost: {
          type: Number,
          default: 0,
          min: [0, "Additional cost cannot be negative"],
        },
        isIncluded: {
          type: Boolean,
          default: true,
        },
      },
    ],
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
        isDefault: {
          type: Boolean,
          default: false,
        },
      },
    ],
    floorPlan: {
      url: {
        type: String,
      },
      description: {
        type: String,
        trim: true,
      },
    },
    layouts: [
      {
        name: {
          type: String,
          required: [true, "Layout name is required"],
          trim: true,
        },
        description: {
          type: String,
          trim: true,
        },
        capacity: {
          type: Number,
          required: [true, "Layout capacity is required"],
          min: [1, "Layout capacity must be at least 1"],
        },
        image: {
          type: String,
        },
        isDefault: {
          type: Boolean,
          default: false,
        },
      },
    ],
    availability: {
      monday: {
        isAvailable: { type: Boolean, default: true },
        openTime: { type: String, default: "08:00" },
        closeTime: { type: String, default: "22:00" },
      },
      tuesday: {
        isAvailable: { type: Boolean, default: true },
        openTime: { type: String, default: "08:00" },
        closeTime: { type: String, default: "22:00" },
      },
      wednesday: {
        isAvailable: { type: Boolean, default: true },
        openTime: { type: String, default: "08:00" },
        closeTime: { type: String, default: "22:00" },
      },
      thursday: {
        isAvailable: { type: Boolean, default: true },
        openTime: { type: String, default: "08:00" },
        closeTime: { type: String, default: "22:00" },
      },
      friday: {
        isAvailable: { type: Boolean, default: true },
        openTime: { type: String, default: "08:00" },
        closeTime: { type: String, default: "22:00" },
      },
      saturday: {
        isAvailable: { type: Boolean, default: true },
        openTime: { type: String, default: "08:00" },
        closeTime: { type: String, default: "22:00" },
      },
      sunday: {
        isAvailable: { type: Boolean, default: true },
        openTime: { type: String, default: "08:00" },
        closeTime: { type: String, default: "22:00" },
      },
    },
    setupTime: {
      type: Number,
      default: 60,
      min: [0, "Setup time cannot be negative"],
      description: "Setup time in minutes",
    },
    cleanupTime: {
      type: Number,
      default: 60,
      min: [0, "Cleanup time cannot be negative"],
      description: "Cleanup time in minutes",
    },
    minimumBookingHours: {
      type: Number,
      default: 2,
      min: [1, "Minimum booking hours must be at least 1"],
    },
    cancellationPolicy: {
      type: String,
      enum: {
        values: ["flexible", "moderate", "strict"],
        message: "Invalid cancellation policy",
      },
      default: "moderate",
    },
    location: {
      floor: {
        type: String,
        trim: true,
      },
      building: {
        type: String,
        trim: true,
      },
      directions: {
        type: String,
        trim: true,
      },
      accessInstructions: {
        type: String,
        trim: true,
      },
    },
    technicalSpecifications: {
      powerOutlets: {
        type: Number,
        default: 0,
      },
      internetSpeed: {
        type: String,
        trim: true,
      },
      hasProjector: {
        type: Boolean,
        default: false,
      },
      hasAudioSystem: {
        type: Boolean,
        default: false,
      },
      hasVideoConferencing: {
        type: Boolean,
        default: false,
      },
      hasNaturalLight: {
        type: Boolean,
        default: false,
      },
      hasSoundproofing: {
        type: Boolean,
        default: false,
      },
      hasStage: {
        type: Boolean,
        default: false,
      },
      stageSize: {
        type: String,
        trim: true,
      },
      additionalEquipment: [
        {
          type: String,
          trim: true,
        },
      ],
    },
    restrictions: {
      noSmoking: {
        type: Boolean,
        default: true,
      },
      noAlcohol: {
        type: Boolean,
        default: false,
      },
      noOutsideCatering: {
        type: Boolean,
        default: false,
      },
      noConfetti: {
        type: Boolean,
        default: false,
      },
      noPets: {
        type: Boolean,
        default: true,
      },
      noLoudMusic: {
        type: Boolean,
        default: false,
      },
      additionalRestrictions: [
        {
          type: String,
          trim: true,
        },
      ],
    },
    accessibility: {
      isWheelchairAccessible: {
        type: Boolean,
        default: true,
      },
      hasAccessibleRestroom: {
        type: Boolean,
        default: true,
      },
      hasElevator: {
        type: Boolean,
        default: true,
      },
      hasAccessibleParking: {
        type: Boolean,
        default: true,
      },
      additionalAccessibility: [
        {
          type: String,
          trim: true,
        },
      ],
    },
    status: {
      type: String,
      enum: {
        values: ["active", "maintenance", "inactive"],
        message: "Invalid venue status",
      },
      default: "active",
    },
    maintenanceSchedule: [
      {
        startDate: {
          type: Date,
          required: true,
        },
        endDate: {
          type: Date,
          required: true,
        },
        reason: {
          type: String,
          trim: true,
        },
        notes: {
          type: String,
          trim: true,
        },
      },
    ],
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
eventVenueSchema.virtual("defaultImage").get(function () {
  const defaultImage = this.images.find((img) => img.isDefault)
  return defaultImage ? defaultImage.url : this.images.length > 0 ? this.images[0].url : null
})

// Virtual for getting default layout
eventVenueSchema.virtual("defaultLayout").get(function () {
  const defaultLayout = this.layouts.find((layout) => layout.isDefault)
  return defaultLayout ? defaultLayout : this.layouts.length > 0 ? this.layouts[0] : null
})

// Virtual for upcoming bookings
eventVenueSchema.virtual("upcomingBookings", {
  ref: "EventBooking",
  localField: "_id",
  foreignField: "venue",
  match: {
    startTime: { $gte: new Date() },
    status: { $in: ["confirmed", "pending"] },
    isDeleted: false,
  },
})

// Index for efficient queries
eventVenueSchema.index({ hotel: 1, type: 1, status: 1 })
eventVenueSchema.index({ hotel: 1, "capacity.min": 1, "capacity.max": 1 })
eventVenueSchema.index({ isDeleted: 1 })

// Pre-save middleware to ensure at least one default image
eventVenueSchema.pre("save", function (next) {
  if (this.images && this.images.length > 0) {
    const hasDefault = this.images.some((img) => img.isDefault)
    if (!hasDefault) {
      this.images[0].isDefault = true
    }
  }

  // Ensure at least one default layout
  if (this.layouts && this.layouts.length > 0) {
    const hasDefaultLayout = this.layouts.some((layout) => layout.isDefault)
    if (!hasDefaultLayout) {
      this.layouts[0].isDefault = true
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

// Static method to check venue availability
eventVenueSchema.statics.checkAvailability = async function (venueId, startTime, endTime) {
  try {
    const venue = await this.findById(venueId)
    if (!venue) {
      throw new Error("Venue not found")
    }

    if (venue.status !== "active") {
      throw new Error(`Venue is currently ${venue.status}`)
    }

    // Check if the venue is available on the day of the week
    const startDate = new Date(startTime)
    const dayOfWeek = startDate.toLocaleDateString("en-US", { weekday: "lowercase" })

    if (!venue.availability[dayOfWeek].isAvailable) {
      throw new Error(`Venue is not available on ${dayOfWeek}s`)
    }

    // Check if the booking time is within venue operating hours
    const startHour = startDate.getHours() + startDate.getMinutes() / 60
    const endDate = new Date(endTime)
    const endHour = endDate.getHours() + endDate.getMinutes() / 60

    const venueOpenHour =
      Number.parseInt(venue.availability[dayOfWeek].openTime.split(":")[0]) +
      Number.parseInt(venue.availability[dayOfWeek].openTime.split(":")[1]) / 60
    const venueCloseHour =
      Number.parseInt(venue.availability[dayOfWeek].closeTime.split(":")[0]) +
      Number.parseInt(venue.availability[dayOfWeek].closeTime.split(":")[1]) / 60

    if (startHour < venueOpenHour || endHour > venueCloseHour) {
      throw new Error(
        `Booking time is outside venue operating hours (${venue.availability[dayOfWeek].openTime} - ${venue.availability[dayOfWeek].closeTime})`,
      )
    }

    // Check if the booking duration meets the minimum requirement
    const durationHours = (endDate - startDate) / (1000 * 60 * 60)
    if (durationHours < venue.minimumBookingHours) {
      throw new Error(`Booking duration must be at least ${venue.minimumBookingHours} hours`)
    }

    // Check for maintenance schedule conflicts
    const hasMaintenanceConflict = venue.maintenanceSchedule.some((schedule) => {
      return startDate <= schedule.endDate && endDate >= schedule.startDate
    })

    if (hasMaintenanceConflict) {
      throw new Error("Venue is scheduled for maintenance during the requested time")
    }

    // Check for existing bookings
    const EventBooking = mongoose.model("EventBooking")
    const conflictingBookings = await EventBooking.find({
      venue: venueId,
      status: { $in: ["confirmed", "pending"] },
      $or: [{ startTime: { $lt: endTime }, endTime: { $gt: startTime } }],
      isDeleted: false,
    })

    if (conflictingBookings.length > 0) {
      throw new Error("Venue is already booked during the requested time")
    }

    return true
  } catch (error) {
    throw error
  }
}

// Method to calculate price
eventVenueSchema.methods.calculatePrice = function (startTime, endTime, additionalServices = [], layout = null) {
  const startDate = new Date(startTime)
  const endDate = new Date(endTime)
  const durationHours = (endDate - startDate) / (1000 * 60 * 60)

  // Base price + hourly rate
  let totalPrice = this.basePrice + this.pricePerHour * durationHours

  // Add cost of selected amenities
  if (additionalServices && additionalServices.length > 0) {
    additionalServices.forEach((service) => {
      const amenity = this.amenities.find((a) => a._id.toString() === service.amenityId)
      if (amenity && !amenity.isIncluded) {
        totalPrice += amenity.additionalCost
      }
    })
  }

  // Apply weekend surcharge (10% extra on weekends)
  const dayOfWeek = startDate.getDay()
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    // 0 is Sunday, 6 is Saturday
    totalPrice *= 1.1
  }

  // Apply peak hour surcharge (15% extra for bookings between 6pm and 10pm)
  const bookingHour = startDate.getHours()
  if (bookingHour >= 18 && bookingHour < 22) {
    totalPrice *= 1.15
  }

  return totalPrice
}

const EventVenue = mongoose.model("EventVenue", eventVenueSchema)

export default EventVenue

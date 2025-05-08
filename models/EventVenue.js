import mongoose from "mongoose"
import { ApiError } from "../utils/apiError.js"

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
    status: {
      type: String,
      enum: {
        values: ["active", "maintenance", "inactive"],
        message: "Invalid venue status",
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
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
)

// Virtual for getting default image
eventVenueSchema.virtual("defaultImage").get(function () {
  const defaultImage = this.images.find((img) => img.isDefault)
  return defaultImage ? defaultImage.url : this.images.length > 0 ? this.images[0].url : null
})

// Index for efficient queries
eventVenueSchema.index({ hotel: 1, type: 1, status: 1 })
eventVenueSchema.index({ hotel: 1, capacity: 1 })
eventVenueSchema.index({ isDeleted: 1 })

// Pre-save middleware to ensure at least one default image
eventVenueSchema.pre("save", function (next) {
  if (this.images && this.images.length > 0) {
    const hasDefault = this.images.some((img) => img.isDefault)
    if (!hasDefault) {
      this.images[0].isDefault = true
    }
  }
  next()
})

// Static method to check venue availability
eventVenueSchema.statics.checkAvailability = async function (venueId, startTime, endTime) {
  try {
    const venue = await this.findById(venueId)
    if (!venue) {
      throw new ApiError("Venue not found", 404)
    }

    if (venue.status !== "active") {
      throw new ApiError(`Venue is currently ${venue.status}`, 400)
    }

    // Check if the venue is available on the day of the week
    const startDate = new Date(startTime)
    const dayOfWeek = startDate.toLocaleDateString("en-US", { weekday: "lowercase" })

    if (!venue.availability[dayOfWeek].isAvailable) {
      throw new ApiError(`Venue is not available on ${dayOfWeek}s`, 400)
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
      throw new ApiError(
        `Booking time is outside venue operating hours (${venue.availability[dayOfWeek].openTime} - ${venue.availability[dayOfWeek].closeTime})`,
        400,
      )
    }

    // Check if the booking duration meets the minimum requirement
    const durationHours = (endDate - startDate) / (1000 * 60 * 60)
    if (durationHours < venue.minimumBookingHours) {
      throw new ApiError(`Booking duration must be at least ${venue.minimumBookingHours} hours`, 400)
    }

    // Check for existing bookings (this will be implemented in the EventBooking model)
    // This is just a placeholder for the logic
    const EventBooking = mongoose.model("EventBooking")
    const conflictingBookings = await EventBooking.find({
      venue: venueId,
      status: { $in: ["confirmed", "pending"] },
      $or: [{ startTime: { $lt: endTime }, endTime: { $gt: startTime } }],
      isDeleted: false,
    })

    if (conflictingBookings.length > 0) {
      throw new ApiError("Venue is already booked during the requested time", 400)
    }

    return true
  } catch (error) {
    throw error
  }
}

// Method to calculate price
eventVenueSchema.methods.calculatePrice = function (startTime, endTime, additionalServices = []) {
  const startDate = new Date(startTime)
  const endDate = new Date(endTime)
  const durationHours = (endDate - startDate) / (1000 * 60 * 60)

  // Base price + hourly rate
  let totalPrice = this.basePrice + this.pricePerHour * durationHours

  // Add cost of selected amenities
  if (additionalServices && additionalServices.length > 0) {
    additionalServices.forEach((service) => {
      const amenity = this.amenities.find((a) => a._id.toString() === service.amenityId)
      if (amenity) {
        totalPrice += amenity.additionalCost
      }
    })
  }

  return totalPrice
}

const EventVenue = mongoose.model("EventVenue", eventVenueSchema)

export default EventVenue

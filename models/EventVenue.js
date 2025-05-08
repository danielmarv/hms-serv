const mongoose = require("mongoose")

const eventVenueSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Venue name is required"],
      trim: true,
      maxlength: [100, "Venue name cannot exceed 100 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },
    capacity: {
      type: Number,
      required: [true, "Capacity is required"],
      min: [1, "Capacity must be at least 1"],
    },
    pricePerHour: {
      type: Number,
      required: [true, "Price per hour is required"],
      min: [0, "Price cannot be negative"],
    },
    minimumHours: {
      type: Number,
      default: 1,
      min: [1, "Minimum hours must be at least 1"],
    },
    amenities: {
      type: [String],
      default: [],
    },
    images: {
      type: [String],
      default: [],
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
      notes: {
        type: String,
        trim: true,
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    venueType: {
      type: String,
      enum: ["conference_hall", "garden", "ballroom", "meeting_room", "banquet_hall", "other"],
      required: [true, "Venue type is required"],
    },
    hotel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: [true, "Hotel is required"],
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

// Virtual for upcoming bookings
eventVenueSchema.virtual("upcomingBookings", {
  ref: "EventBooking",
  localField: "_id",
  foreignField: "venue",
  match: {
    startTime: { $gte: new Date() },
    status: { $in: ["confirmed", "pending"] },
  },
})

// Index for faster queries
eventVenueSchema.index({ name: 1, hotel: 1 }, { unique: true })
eventVenueSchema.index({ venueType: 1 })
eventVenueSchema.index({ isActive: 1 })

const EventVenue = mongoose.model("EventVenue", eventVenueSchema)

module.exports = EventVenue

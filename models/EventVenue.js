import mongoose from "mongoose"
import Event from "./Event.js"

const eventVenueSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Venue name is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    hotel_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: [true, "Hotel ID is required"],
      index: true,
    },
    type: {
      type: String,
      enum: ["ballroom", "conference_room", "meeting_room", "banquet_hall", "outdoor", "restaurant", "other"],
      required: [true, "Venue type is required"],
    },
    capacity: {
      type: Number,
      required: [true, "Capacity is required"],
      min: [1, "Capacity must be at least 1"],
    },
    area: {
      value: {
        type: Number,
      },
      unit: {
        type: String,
        enum: ["sq_ft", "sq_m"],
        default: "sq_ft",
      },
    },
    location: {
      floor: String,
      building: String,
      directions: String,
    },
    amenities: [String],
    features: [String],
    pricing: {
      base_price: {
        type: Number,
        default: 0,
      },
      price_per_hour: {
        type: Number,
        default: 0,
      },
      price_per_person: {
        type: Number,
        default: 0,
      },
      minimum_spend: {
        type: Number,
        default: 0,
      },
      currency: {
        type: String,
        default: "USD",
      },
    },
    availability: {
      days_of_week: {
        type: [Number], // 0 = Sunday, 1 = Monday, etc.
        default: [0, 1, 2, 3, 4, 5, 6],
      },
      start_time: {
        type: String,
        default: "08:00",
      },
      end_time: {
        type: String,
        default: "22:00",
      },
      exceptions: [
        {
          date: Date,
          available: Boolean,
          reason: String,
        },
      ],
    },
    setup_time: {
      type: Number, // Minutes required for setup
      default: 60,
    },
    teardown_time: {
      type: Number, // Minutes required for teardown
      default: 60,
    },
    minimum_hours: {
      type: Number,
      default: 2,
    },
    cancellation_policy: {
      type: String,
      enum: ["flexible", "moderate", "strict"],
      default: "moderate",
    },
    images: [
      {
        url: String,
        caption: String,
      },
    ],
    floor_plan: {
      url: String,
      width: Number,
      height: Number,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "maintenance"],
      default: "active",
    },
    maintenance: {
      start_date: Date,
      end_date: Date,
      reason: String,
      scheduled_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    },
    is_deleted: {
      type: Boolean,
      default: false,
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
eventVenueSchema.index({ hotel_id: 1, status: 1 })
eventVenueSchema.index({ name: 1, hotel_id: 1 }, { unique: true })
eventVenueSchema.index({ capacity: 1 })

// Method to check venue availability
eventVenueSchema.statics.checkAvailability = async function (venueId, startTime, endTime, excludeEventId = null) {
  const startDateTime = new Date(startTime)
  const endDateTime = new Date(endTime)

  if (endDateTime <= startDateTime) {
    throw new Error("End time must be after start time")
  }

  // Check if venue exists and is active
  const venue = await this.findOne({ _id: venueId, is_deleted: false })
  if (!venue) {
    throw new Error("Venue not found")
  }

  if (venue.status === "inactive") {
    throw new Error("Venue is inactive")
  }

  if (venue.status === "maintenance") {
    if (venue.maintenance && venue.maintenance.start_date && venue.maintenance.end_date) {
      const maintenanceStart = new Date(venue.maintenance.start_date)
      const maintenanceEnd = new Date(venue.maintenance.end_date)

      // Check if requested time overlaps with maintenance
      if (
        (startDateTime >= maintenanceStart && startDateTime < maintenanceEnd) ||
        (endDateTime > maintenanceStart && endDateTime <= maintenanceEnd) ||
        (startDateTime <= maintenanceStart && endDateTime >= maintenanceEnd)
      ) {
        throw new Error(
          `Venue is under maintenance from ${maintenanceStart.toISOString()} to ${maintenanceEnd.toISOString()}`,
        )
      }
    } else {
      throw new Error("Venue is under maintenance")
    }
  }

  // Check day of week availability
  const dayOfWeek = startDateTime.getDay() // 0 = Sunday, 1 = Monday, etc.
  if (!venue.availability.days_of_week.includes(dayOfWeek)) {
    throw new Error(
      `Venue is not available on ${["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][dayOfWeek]}`,
    )
  }

  // Check time of day availability
  const startTimeStr = `${startDateTime.getHours().toString().padStart(2, "0")}:${startDateTime.getMinutes().toString().padStart(2, "0")}`
  const endTimeStr = `${endDateTime.getHours().toString().padStart(2, "0")}:${endDateTime.getMinutes().toString().padStart(2, "0")}`

  if (startTimeStr < venue.availability.start_time) {
    throw new Error(`Venue is not available before ${venue.availability.start_time}`)
  }

  if (endTimeStr > venue.availability.end_time) {
    throw new Error(`Venue is not available after ${venue.availability.end_time}`)
  }

  // Check for date exceptions
  const startDate = new Date(startDateTime)
  startDate.setHours(0, 0, 0, 0)

  const exception = venue.availability.exceptions.find((ex) => {
    const exDate = new Date(ex.date)
    exDate.setHours(0, 0, 0, 0)
    return exDate.getTime() === startDate.getTime()
  })

  if (exception && !exception.available) {
    throw new Error(`Venue is not available on ${startDate.toISOString().split("T")[0]}: ${exception.reason}`)
  }

  // Check minimum booking duration
  const durationHours = (endDateTime - startDateTime) / (1000 * 60 * 60)
  if (durationHours < venue.minimum_hours) {
    throw new Error(`Booking duration must be at least ${venue.minimum_hours} hours`)
  }

  // Check for conflicting events
  const filter = {
    venue_id: venueId,
    is_deleted: false,
    status: { $nin: ["cancelled"] },
    $or: [
      // New event starts during an existing event
      { start_date: { $lte: startDateTime }, end_date: { $gt: startDateTime } },
      // New event ends during an existing event
      { start_date: { $lt: endDateTime }, end_date: { $gte: endDateTime } },
      // New event contains an existing event
      { start_date: { $gte: startDateTime, $lt: endDateTime } },
    ],
  }

  // Exclude current event if provided
  if (excludeEventId) {
    filter._id = { $ne: excludeEventId }
  }

  const conflictingEvents = await Event.find(filter).select("title start_date end_date status").lean()

  if (conflictingEvents.length > 0) {
    throw new Error("Venue is already booked during the requested time")
  }

  return {
    available: true,
    venue: {
      id: venue._id,
      name: venue.name,
      capacity: venue.capacity,
    },
  }
}

const EventVenue = mongoose.model("EventVenue", eventVenueSchema)
export default EventVenue

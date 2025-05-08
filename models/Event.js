import mongoose from "mongoose"

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Event title is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    event_type_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EventType",
      required: [true, "Event type is required"],
      index: true,
    },
    hotel_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: [true, "Hotel ID is required"],
      index: true,
    },
    start_date: {
      type: Date,
      required: [true, "Start date is required"],
    },
    end_date: {
      type: Date,
      required: [true, "End date is required"],
    },
    all_day: {
      type: Boolean,
      default: false,
    },
    recurring: {
      is_recurring: {
        type: Boolean,
        default: false,
      },
      pattern: {
        type: String,
        enum: ["daily", "weekly", "monthly", "yearly"],
      },
      interval: {
        type: Number,
        default: 1,
      },
      days_of_week: [Number], // 0 = Sunday, 1 = Monday, etc.
      day_of_month: Number,
      month_of_year: Number,
      end_after: Number, // Number of occurrences
      end_date: Date,
    },
    venue_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EventVenue",
      required: [true, "Venue is required"],
      index: true,
    },
    organizer: {
      name: String,
      email: String,
      phone: String,
      organization: String,
    },
    attendees: {
      type: Number,
      default: 0,
    },
    color: {
      type: String,
      default: "#3788d8",
    },
    status: {
      type: String,
      enum: ["draft", "confirmed", "cancelled", "completed"],
      default: "draft",
    },
    visibility: {
      type: String,
      enum: ["public", "private", "staff_only"],
      default: "private",
    },
    bookings: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "EventBooking",
      },
    ],
    services: [
      {
        service_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "EventService",
        },
        quantity: {
          type: Number,
          default: 1,
        },
      },
    ],
    staffing: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "EventStaffing",
      },
    ],
    notes: String,
    attachments: [
      {
        name: String,
        url: String,
        type: String,
        size: Number,
        uploaded_at: Date,
      },
    ],
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
eventSchema.index({ hotel_id: 1, status: 1 })
eventSchema.index({ start_date: 1, end_date: 1 })
eventSchema.index({ event_type_id: 1 })

// Validate end date is after start date
eventSchema.pre("validate", function (next) {
  if (this.end_date && this.start_date && this.end_date < this.start_date) {
    this.invalidate("end_date", "End date must be after start date")
  }
  next()
})

// Generate recurring events
eventSchema.methods.generateRecurringEvents = async function (limit = 10) {
  if (!this.recurring || !this.recurring.is_recurring) {
    return []
  }

  const events = []
  const currentDate = new Date(this.start_date)
  const duration = this.end_date - this.start_date
  let count = 0

  // Determine end condition
  const hasEndDate = this.recurring.end_date != null
  const hasEndAfter = this.recurring.end_after != null && this.recurring.end_after > 0

  while (
    (!hasEndDate || currentDate <= this.recurring.end_date) &&
    (!hasEndAfter || count < this.recurring.end_after) &&
    count < limit
  ) {
    // Skip the first occurrence as it's the original event
    if (count > 0) {
      const eventData = {
        title: this.title,
        description: this.description,
        event_type_id: this.event_type_id,
        hotel_id: this.hotel_id,
        venue_id: this.venue_id,
        start_date: new Date(currentDate),
        end_date: new Date(currentDate.getTime() + duration),
        all_day: this.all_day,
        organizer: this.organizer,
        attendees: this.attendees,
        color: this.color,
        status: "draft",
        visibility: this.visibility,
        services: this.services,
        notes: this.notes,
        createdBy: this.createdBy,
        updatedBy: this.updatedBy,
      }

      events.push(eventData)
    }

    // Calculate next occurrence based on pattern
    switch (this.recurring.pattern) {
      case "daily":
        currentDate.setDate(currentDate.getDate() + this.recurring.interval)
        break

      case "weekly":
        if (this.recurring.days_of_week && this.recurring.days_of_week.length > 0) {
          // Find the next day of week that matches
          let found = false
          for (let i = 1; i <= 7; i++) {
            currentDate.setDate(currentDate.getDate() + 1)
            const dayOfWeek = currentDate.getDay()
            if (this.recurring.days_of_week.includes(dayOfWeek)) {
              found = true
              break
            }
          }

          if (!found) {
            // If no matching day found, move to next week
            currentDate.setDate(currentDate.getDate() + 7 * this.recurring.interval - 7)
          }
        } else {
          // Simple weekly recurrence
          currentDate.setDate(currentDate.getDate() + 7 * this.recurring.interval)
        }
        break

      case "monthly":
        if (this.recurring.day_of_month) {
          // Set to specific day of month
          const originalDay = this.recurring.day_of_month

          // Move to next month
          currentDate.setMonth(currentDate.getMonth() + this.recurring.interval)

          // Set to the specified day
          currentDate.setDate(
            Math.min(originalDay, new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()),
          )
        } else {
          // Same day of month
          const originalDay = currentDate.getDate()

          // Move to next month
          currentDate.setMonth(currentDate.getMonth() + this.recurring.interval)

          // Set to the same day (or last day of month if original day doesn't exist)
          currentDate.setDate(
            Math.min(originalDay, new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()),
          )
        }
        break

      case "yearly":
        if (this.recurring.month_of_year && this.recurring.day_of_month) {
          // Set to specific month and day
          currentDate.setFullYear(currentDate.getFullYear() + this.recurring.interval)
          currentDate.setMonth(this.recurring.month_of_year - 1)

          // Set to the specified day (or last day of month if day doesn't exist)
          currentDate.setDate(
            Math.min(
              this.recurring.day_of_month,
              new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate(),
            ),
          )
        } else {
          // Same month and day
          currentDate.setFullYear(currentDate.getFullYear() + this.recurring.interval)
        }
        break

      default:
        // Invalid pattern, exit loop
        return events
    }

    count++
  }

  return events
}

const Event = mongoose.model("Event", eventSchema)
export default Event

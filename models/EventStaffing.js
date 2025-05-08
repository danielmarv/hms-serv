import mongoose from "mongoose"

const eventStaffingSchema = new mongoose.Schema(
  {
    hotel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: [true, "Hotel ID is required"],
    },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EventBooking",
      required: [true, "Event ID is required"],
    },
    staff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Staff ID is required"],
    },
    role: {
      type: String,
      required: [true, "Role is required"],
      trim: true,
    },
    startTime: {
      type: Date,
      required: [true, "Start time is required"],
    },
    endTime: {
      type: Date,
      required: [true, "End time is required"],
    },
    hourlyRate: {
      type: Number,
      required: [true, "Hourly rate is required"],
      min: [0, "Hourly rate cannot be negative"],
    },
    totalHours: {
      type: Number,
      required: [true, "Total hours is required"],
      min: [0, "Total hours cannot be negative"],
    },
    totalCost: {
      type: Number,
      required: [true, "Total cost is required"],
      min: [0, "Total cost cannot be negative"],
    },
    status: {
      type: String,
      enum: {
        values: ["scheduled", "confirmed", "checked_in", "completed", "cancelled", "no_show"],
        message: "Invalid status",
      },
      default: "scheduled",
    },
    notes: {
      type: String,
      trim: true,
    },
    checkedInAt: {
      type: Date,
    },
    checkedOutAt: {
      type: Date,
    },
    breakTimes: [
      {
        startTime: {
          type: Date,
          required: true,
        },
        endTime: {
          type: Date,
          required: true,
        },
        duration: {
          type: Number,
          required: true,
          min: [0, "Break duration cannot be negative"],
          description: "Break duration in minutes",
        },
      },
    ],
    tasks: [
      {
        description: {
          type: String,
          required: true,
          trim: true,
        },
        isCompleted: {
          type: Boolean,
          default: false,
        },
        completedAt: {
          type: Date,
        },
      },
    ],
    feedback: {
      rating: {
        type: Number,
        min: [1, "Rating must be at least 1"],
        max: [5, "Rating cannot exceed 5"],
      },
      comments: {
        type: String,
        trim: true,
      },
      submittedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      submittedAt: {
        type: Date,
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
  },
)

// Pre-save middleware to calculate total hours and cost
eventStaffingSchema.pre("save", function (next) {
  if (this.isModified("startTime") || this.isModified("endTime") || this.isModified("hourlyRate") || this.isNew) {
    // Calculate total hours
    const startTime = new Date(this.startTime)
    const endTime = new Date(this.endTime)
    const totalHoursDecimal = (endTime - startTime) / (1000 * 60 * 60)
    this.totalHours = Math.round(totalHoursDecimal * 100) / 100 // Round to 2 decimal places

    // Calculate total cost
    this.totalCost = Math.round(this.totalHours * this.hourlyRate * 100) / 100 // Round to 2 decimal places
  }
  next()
})

// Index for efficient queries
eventStaffingSchema.index({ hotel: 1, event: 1 })
eventStaffingSchema.index({ staff: 1, startTime: 1, endTime: 1 })
eventStaffingSchema.index({ status: 1 })
eventStaffingSchema.index({ isDeleted: 1 })

const EventStaffing = mongoose.model("EventStaffing", eventStaffingSchema)

export default EventStaffing

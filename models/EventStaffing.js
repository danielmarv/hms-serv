import mongoose from "mongoose"

const eventStaffingSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EventBooking",
      required: [true, "Event is required"],
    },
    staff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Staff member is required"],
    },
    hotel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: [true, "Hotel is required"],
    },
    date: {
      type: Date,
      required: [true, "Date is required"],
    },
    startTime: {
      type: String,
      required: [true, "Start time is required"],
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, "Start time must be in HH:MM format"],
    },
    endTime: {
      type: String,
      required: [true, "End time is required"],
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, "End time must be in HH:MM format"],
    },
    role: {
      type: String,
      required: [true, "Role is required"],
      trim: true,
    },
    status: {
      type: String,
      enum: ["scheduled", "confirmed", "checked-in", "completed", "cancelled", "no-show"],
      default: "scheduled",
    },
    checkInTime: {
      type: Date,
    },
    checkOutTime: {
      type: Date,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, "Notes cannot exceed 500 characters"],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    hourlyRate: {
      type: Number,
      min: [0, "Hourly rate cannot be negative"],
    },
    totalHours: {
      type: Number,
      min: [0, "Total hours cannot be negative"],
    },
    totalCost: {
      type: Number,
      min: [0, "Total cost cannot be negative"],
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
  },
  {
    timestamps: true,
  },
)

// Add indexes
eventStaffingSchema.index({ event: 1 })
eventStaffingSchema.index({ staff: 1 })
eventStaffingSchema.index({ hotel: 1 })
eventStaffingSchema.index({ date: 1 })
eventStaffingSchema.index({ status: 1 })

const EventStaffing = mongoose.model("EventStaffing", eventStaffingSchema)

export default EventStaffing
